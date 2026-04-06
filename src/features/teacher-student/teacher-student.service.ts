import type { Student } from '@prisma/client';

import {
  type TeacherStudentPrismaClientLike,
  type TeacherStudentPrismaTransactionLike,
  prisma,
} from '../../database/prisma';
import { NotFoundAppError } from '../../shared/errors/app-error';
import { StudentRepository } from './repositories/student.repository';
import { TeacherRepository } from './repositories/teacher.repository';

const mentionPattern = /@([^\s@]+@[^\s@]+\.[^\s@]+)/g;

const deduplicateEmails = (emails: string[]): string[] => {
  return [
    ...new Set(
      emails.map((email) => email.trim()).filter((email) => email.length > 0),
    ),
  ];
};

const collectMentionedEmails = (notification: string): string[] => {
  const emails = new Set<string>();

  for (const match of notification.matchAll(mentionPattern)) {
    const [, email] = match;

    if (email) {
      emails.add(email);
    }
  }

  return [...emails];
};

const createTeacherRepository = (
  dbClient: TeacherStudentPrismaTransactionLike,
) => {
  return new TeacherRepository(dbClient);
};

const createStudentRepository = (
  dbClient: TeacherStudentPrismaTransactionLike,
) => {
  return new StudentRepository(dbClient);
};

export class TeacherStudentService {
  public constructor(
    private readonly db: TeacherStudentPrismaClientLike = prisma,
    private readonly teacherRepository: TeacherRepository = new TeacherRepository(),
    private readonly studentRepository: StudentRepository = new StudentRepository(),
  ) {}

  public async registerStudentsToTeacher(
    teacherEmail: string,
    studentEmails: string[],
  ): Promise<void> {
    const deduplicatedStudentEmails = deduplicateEmails(studentEmails);

    await this.db.$transaction(async (transactionClient) => {
      const teacherRepository = createTeacherRepository(transactionClient);
      const studentRepository = createStudentRepository(transactionClient);
      const teacher =
        (await teacherRepository.getTeacherByEmail(teacherEmail)) ??
        (await teacherRepository.createTeacher(teacherEmail));
      const existingStudents = await studentRepository.getStudentsByEmails(
        deduplicatedStudentEmails,
      );
      const existingStudentEmails = new Set(
        existingStudents.map((student) => student.email),
      );
      const missingStudentEmails = deduplicatedStudentEmails.filter(
        (email) => !existingStudentEmails.has(email),
      );

      const createdStudents =
        await studentRepository.createStudents(missingStudentEmails);
      const allStudents = [...existingStudents, ...createdStudents];

      await studentRepository.createTeacherStudentRelations(
        teacher.id,
        allStudents.map((student) => student.id),
      );
    });
  }

  public async retrieveCommonStudents(
    teacherEmails: string[],
  ): Promise<string[]> {
    const deduplicatedTeacherEmails = deduplicateEmails(teacherEmails);

    if (deduplicatedTeacherEmails.length === 0) {
      return [];
    }

    const students = await this.studentRepository.getCommonStudentsForTeachers(
      deduplicatedTeacherEmails,
    );

    return students.map((student) => student.email);
  }

  public async retrieveRecipientsForNotification(
    teacherEmail: string,
    notification: string,
  ): Promise<string[]> {
    const teacher =
      await this.teacherRepository.getTeacherByEmail(teacherEmail);
    const mentionedEmails = collectMentionedEmails(notification);
    const [teacherStudents, mentionedStudents] = await Promise.all([
      teacher
        ? this.studentRepository.getStudentsForTeacher(teacher.id, {
            includeSuspended: false,
          })
        : Promise.resolve([] as Student[]),
      this.studentRepository.getStudentsByEmails(mentionedEmails),
    ]);

    const recipients = deduplicateEmails([
      ...teacherStudents.map((student) => student.email),
      ...mentionedStudents
        .filter((student) => !student.suspended)
        .map((student) => student.email),
    ]);

    return recipients.sort((left, right) => left.localeCompare(right));
  }

  public async suspendStudent(studentEmail: string): Promise<void> {
    const student =
      await this.studentRepository.getStudentByEmail(studentEmail);

    if (!student) {
      throw new NotFoundAppError('Student not found');
    }

    if (student.suspended) {
      return;
    }

    await this.studentRepository.updateStudentSuspension(student.id, true);
  }
}

export type TeacherStudentServiceLike = Pick<
  TeacherStudentService,
  | 'registerStudentsToTeacher'
  | 'retrieveCommonStudents'
  | 'retrieveRecipientsForNotification'
  | 'suspendStudent'
>;
