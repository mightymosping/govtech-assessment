import type { Student, Teacher } from '@prisma/client';

import { TeacherStudentService } from '../../../../src/features/teacher-student/teacher-student.service';
import { NotFoundAppError } from '../../../../src/shared/errors/app-error';

describe('TeacherStudentService', () => {
  const createTransactionDb = () => {
    return {
      student: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      teacher: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      teacherStudent: {
        createMany: jest.fn(),
      },
    };
  };

  it('registers students to a teacher inside a transaction', async () => {
    const transactionDb = createTransactionDb();
    transactionDb.teacher.findFirst.mockResolvedValue(null);
    transactionDb.teacher.create.mockResolvedValue({
      email: 'Teacher@Example.com',
      id: 10,
    } as Teacher);
    transactionDb.student.findMany
      .mockResolvedValueOnce([
        { email: 'StudentOne@Example.com', id: 1 } as Student,
      ])
      .mockResolvedValueOnce([
        { email: 'StudentTwo@Example.com', id: 2 } as Student,
      ]);
    transactionDb.student.createMany.mockResolvedValue({ count: 1 });
    transactionDb.teacherStudent.createMany.mockResolvedValue({ count: 2 });
    const db = {
      $transaction: jest
        .fn()
        .mockImplementation(async (callback) => callback(transactionDb)),
      student: transactionDb.student,
      teacher: transactionDb.teacher,
      teacherStudent: transactionDb.teacherStudent,
    };
    const service = new TeacherStudentService(db as never);

    await service.registerStudentsToTeacher('Teacher@Example.com', [
      'StudentOne@Example.com',
      'StudentTwo@Example.com',
      'StudentTwo@Example.com',
    ]);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionDb.teacher.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'Teacher@Example.com',
      },
    });
    expect(transactionDb.teacher.create).toHaveBeenCalledWith({
      data: {
        email: 'Teacher@Example.com',
      },
    });
    expect(transactionDb.student.findMany).toHaveBeenNthCalledWith(1, {
      orderBy: {
        email: 'asc',
      },
      where: {
        email: {
          in: ['StudentOne@Example.com', 'StudentTwo@Example.com'],
        },
      },
    });
    expect(transactionDb.student.createMany).toHaveBeenCalledWith({
      data: [{ email: 'StudentTwo@Example.com' }],
      skipDuplicates: true,
    });
    expect(transactionDb.teacherStudent.createMany).toHaveBeenCalledWith({
      data: [
        { studentId: 1, teacherId: 10 },
        { studentId: 2, teacherId: 10 },
      ],
      skipDuplicates: true,
    });
  });

  it('returns an empty array for common students when no teachers are supplied', async () => {
    const studentRepository = {
      getCommonStudentsForTeachers: jest.fn(),
      getStudentByEmail: jest.fn(),
      getStudentsByEmails: jest.fn(),
      getStudentsForTeacher: jest.fn(),
      updateStudentSuspension: jest.fn(),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      {
        getTeacherByEmail: jest.fn(),
        createTeacher: jest.fn(),
        getTeachersByEmails: jest.fn(),
      } as never,
      studentRepository as never,
    );

    await expect(service.retrieveCommonStudents([])).resolves.toEqual([]);
    expect(
      studentRepository.getCommonStudentsForTeachers,
    ).not.toHaveBeenCalled();
  });

  it('returns common students after deduplicating teacher emails', async () => {
    const studentRepository = {
      getCommonStudentsForTeachers: jest
        .fn()
        .mockResolvedValue([
          { email: 'StudentOne@Example.com' },
          { email: 'StudentTwo@Example.com' },
        ]),
      getStudentByEmail: jest.fn(),
      getStudentsByEmails: jest.fn(),
      getStudentsForTeacher: jest.fn(),
      updateStudentSuspension: jest.fn(),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      {
        getTeacherByEmail: jest.fn(),
        createTeacher: jest.fn(),
        getTeachersByEmails: jest.fn(),
      } as never,
      studentRepository as never,
    );

    const result = await service.retrieveCommonStudents([
      'teacher1@example.com',
      'teacher1@example.com',
      'teacher2@example.com',
    ]);

    expect(studentRepository.getCommonStudentsForTeachers).toHaveBeenCalledWith(
      ['teacher1@example.com', 'teacher2@example.com'],
    );
    expect(result).toEqual([
      'StudentOne@Example.com',
      'StudentTwo@Example.com',
    ]);
  });

  it('returns notification recipients from active teacher students and active mentions', async () => {
    const teacherRepository = {
      createTeacher: jest.fn(),
      getTeacherByEmail: jest.fn().mockResolvedValue({
        email: 'Teacher@Example.com',
        id: 9,
      } as Teacher),
      getTeachersByEmails: jest.fn(),
    };
    const studentRepository = {
      getCommonStudentsForTeachers: jest.fn(),
      getStudentByEmail: jest.fn(),
      getStudentsByEmails: jest.fn().mockResolvedValue([
        {
          email: 'Mentioned@Example.com',
          id: 5,
          suspended: false,
        } as Student,
        {
          email: 'Suspended@Example.com',
          id: 6,
          suspended: true,
        } as Student,
      ]),
      getStudentsForTeacher: jest.fn().mockResolvedValue([
        {
          email: 'ClassMember@Example.com',
          id: 1,
          suspended: false,
        } as Student,
        {
          email: 'Mentioned@Example.com',
          id: 2,
          suspended: false,
        } as Student,
      ]),
      updateStudentSuspension: jest.fn(),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      teacherRepository as never,
      studentRepository as never,
    );

    const result = await service.retrieveRecipientsForNotification(
      'Teacher@Example.com',
      'Hello @Mentioned@Example.com @Suspended@Example.com @Mentioned@Example.com @not-an-email',
    );

    expect(studentRepository.getStudentsForTeacher).toHaveBeenCalledWith(9, {
      includeSuspended: false,
    });
    expect(studentRepository.getStudentsByEmails).toHaveBeenCalledWith([
      'Mentioned@Example.com',
      'Suspended@Example.com',
    ]);
    expect(result).toEqual([
      'ClassMember@Example.com',
      'Mentioned@Example.com',
    ]);
  });

  it('returns mentioned recipients when the teacher does not exist', async () => {
    const teacherRepository = {
      createTeacher: jest.fn(),
      getTeacherByEmail: jest.fn().mockResolvedValue(null),
      getTeachersByEmails: jest.fn(),
    };
    const studentRepository = {
      getCommonStudentsForTeachers: jest.fn(),
      getStudentByEmail: jest.fn(),
      getStudentsByEmails: jest.fn().mockResolvedValue([
        {
          email: 'Mentioned@Example.com',
          id: 5,
          suspended: false,
        } as Student,
      ]),
      getStudentsForTeacher: jest.fn(),
      updateStudentSuspension: jest.fn(),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      teacherRepository as never,
      studentRepository as never,
    );

    const result = await service.retrieveRecipientsForNotification(
      'Teacher@Example.com',
      'Hello @Mentioned@Example.com',
    );

    expect(studentRepository.getStudentsForTeacher).not.toHaveBeenCalled();
    expect(result).toEqual(['Mentioned@Example.com']);
  });

  it('throws a not found error when suspending an unknown student', async () => {
    const studentRepository = {
      getCommonStudentsForTeachers: jest.fn(),
      getStudentByEmail: jest.fn().mockResolvedValue(null),
      getStudentsByEmails: jest.fn(),
      getStudentsForTeacher: jest.fn(),
      updateStudentSuspension: jest.fn(),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      {
        getTeacherByEmail: jest.fn(),
        createTeacher: jest.fn(),
        getTeachersByEmails: jest.fn(),
      } as never,
      studentRepository as never,
    );

    await expect(
      service.suspendStudent('missing@example.com'),
    ).rejects.toBeInstanceOf(NotFoundAppError);
  });

  it('returns without updating when the student is already suspended', async () => {
    const studentRepository = {
      getCommonStudentsForTeachers: jest.fn(),
      getStudentByEmail: jest.fn().mockResolvedValue({
        email: 'student@example.com',
        id: 1,
        suspended: true,
      } as Student),
      getStudentsByEmails: jest.fn(),
      getStudentsForTeacher: jest.fn(),
      updateStudentSuspension: jest.fn(),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      {
        getTeacherByEmail: jest.fn(),
        createTeacher: jest.fn(),
        getTeachersByEmails: jest.fn(),
      } as never,
      studentRepository as never,
    );

    await service.suspendStudent('student@example.com');

    expect(studentRepository.updateStudentSuspension).not.toHaveBeenCalled();
  });

  it('updates the student suspension flag when the student exists', async () => {
    const studentRepository = {
      getCommonStudentsForTeachers: jest.fn(),
      getStudentByEmail: jest.fn().mockResolvedValue({
        email: 'student@example.com',
        id: 1,
        suspended: false,
      } as Student),
      getStudentsByEmails: jest.fn(),
      getStudentsForTeacher: jest.fn(),
      updateStudentSuspension: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TeacherStudentService(
      {
        $transaction: jest.fn(),
        student: {},
        teacher: {},
        teacherStudent: {},
      } as never,
      {
        getTeacherByEmail: jest.fn(),
        createTeacher: jest.fn(),
        getTeachersByEmails: jest.fn(),
      } as never,
      studentRepository as never,
    );

    await service.suspendStudent('student@example.com');

    expect(studentRepository.updateStudentSuspension).toHaveBeenCalledWith(
      1,
      true,
    );
  });
});
