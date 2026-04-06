import type { Student } from '@prisma/client';

import { prisma } from '../../../database/prisma';

type StudentDbClient = {
  student: {
    createMany(args: {
      data: Array<{ email: string }>;
      skipDuplicates: true;
    }): Promise<unknown>;
    findFirst(args: { where: { email: string } }): Promise<Student | null>;
    findMany(args: {
      orderBy: { email: 'asc' };
      where:
        | { email: { in: string[] } }
        | {
            registrations: {
              some: {
                teacherId: number;
              };
            };
            suspended?: false;
          }
        | {
            AND: Array<{
              registrations: {
                some: {
                  teacher: {
                    email: string;
                  };
                };
              };
            }>;
          };
    }): Promise<Student[]>;
    update(args: {
      data: { suspended: boolean };
      where: { id: number };
    }): Promise<Student>;
  };
  teacherStudent: {
    createMany(args: {
      data: Array<{ studentId: number; teacherId: number }>;
      skipDuplicates: true;
    }): Promise<unknown>;
  };
};

export type GetTeacherStudentsOptions = {
  includeSuspended: boolean;
};

export class StudentRepository {
  public constructor(private readonly db: StudentDbClient = prisma) {}

  public async createStudents(emails: string[]): Promise<Student[]> {
    if (emails.length === 0) {
      return [];
    }

    await this.db.student.createMany({
      data: emails.map((email) => ({ email })),
      skipDuplicates: true,
    });

    return this.getStudentsByEmails(emails);
  }

  public async createTeacherStudentRelations(
    teacherId: number,
    studentIds: number[],
  ): Promise<void> {
    if (studentIds.length === 0) {
      return;
    }

    await this.db.teacherStudent.createMany({
      data: studentIds.map((studentId) => ({
        studentId,
        teacherId,
      })),
      skipDuplicates: true,
    });
  }

  public async getCommonStudentsForTeachers(
    teacherEmails: string[],
  ): Promise<Student[]> {
    if (teacherEmails.length === 0) {
      return [];
    }

    return this.db.student.findMany({
      orderBy: {
        email: 'asc',
      },
      where: {
        AND: teacherEmails.map((email) => ({
          registrations: {
            some: {
              teacher: {
                email,
              },
            },
          },
        })),
      },
    });
  }

  public async getStudentByEmail(email: string): Promise<Student | null> {
    return this.db.student.findFirst({
      where: {
        email,
      },
    });
  }

  public async getStudentsByEmails(emails: string[]): Promise<Student[]> {
    if (emails.length === 0) {
      return [];
    }

    return this.db.student.findMany({
      orderBy: {
        email: 'asc',
      },
      where: {
        email: {
          in: emails,
        },
      },
    });
  }

  public async getStudentsForTeacher(
    teacherId: number,
    options: GetTeacherStudentsOptions,
  ): Promise<Student[]> {
    return this.db.student.findMany({
      orderBy: {
        email: 'asc',
      },
      where: {
        ...(options.includeSuspended ? {} : { suspended: false }),
        registrations: {
          some: {
            teacherId,
          },
        },
      },
    });
  }

  public async updateStudentSuspension(
    studentId: number,
    suspended: boolean,
  ): Promise<Student> {
    return this.db.student.update({
      data: {
        suspended,
      },
      where: {
        id: studentId,
      },
    });
  }
}
