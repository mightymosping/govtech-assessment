import type { Teacher } from '@prisma/client';

import { prisma } from '../../../database/prisma';

type TeacherDbClient = {
  teacher: {
    create(args: { data: { email: string } }): Promise<Teacher>;
    findFirst(args: { where: { email: string } }): Promise<Teacher | null>;
    findMany(args: {
      orderBy: { email: 'asc' };
      where: { email: { in: string[] } };
    }): Promise<Teacher[]>;
  };
};

export class TeacherRepository {
  public constructor(private readonly db: TeacherDbClient = prisma) {}

  public async createTeacher(email: string): Promise<Teacher> {
    return this.db.teacher.create({
      data: {
        email,
      },
    });
  }

  public async getTeacherByEmail(email: string): Promise<Teacher | null> {
    return this.db.teacher.findFirst({
      where: {
        email,
      },
    });
  }

  public async getTeachersByEmails(emails: string[]): Promise<Teacher[]> {
    if (emails.length === 0) {
      return [];
    }

    return this.db.teacher.findMany({
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
}
