import type { Student } from '@prisma/client';

import { StudentRepository } from '../../../../src/features/teacher-student/repositories/student.repository';

describe('StudentRepository', () => {
  const createDb = () => {
    return {
      student: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      teacherStudent: {
        createMany: jest.fn(),
      },
    };
  };

  it('returns an empty array when createStudents receives no emails', async () => {
    const db = createDb();
    const repository = new StudentRepository(db);

    await expect(repository.createStudents([])).resolves.toEqual([]);
    expect(db.student.createMany).not.toHaveBeenCalled();
  });

  it('creates students and re-reads them by email', async () => {
    const db = createDb();
    const students = [{ email: 'student@example.com', id: 1 }] as Student[];
    db.student.createMany.mockResolvedValue({ count: 1 });
    db.student.findMany.mockResolvedValue(students);
    const repository = new StudentRepository(db);

    const result = await repository.createStudents(['student@example.com']);

    expect(db.student.createMany).toHaveBeenCalledWith({
      data: [{ email: 'student@example.com' }],
      skipDuplicates: true,
    });
    expect(db.student.findMany).toHaveBeenCalledWith({
      orderBy: {
        email: 'asc',
      },
      where: {
        email: {
          in: ['student@example.com'],
        },
      },
    });
    expect(result).toBe(students);
  });

  it('returns early when no student ids are provided for relations', async () => {
    const db = createDb();
    const repository = new StudentRepository(db);

    await repository.createTeacherStudentRelations(1, []);

    expect(db.teacherStudent.createMany).not.toHaveBeenCalled();
  });

  it('creates teacher-student relations with duplicate skipping', async () => {
    const db = createDb();
    db.teacherStudent.createMany.mockResolvedValue({ count: 2 });
    const repository = new StudentRepository(db);

    await repository.createTeacherStudentRelations(10, [1, 2]);

    expect(db.teacherStudent.createMany).toHaveBeenCalledWith({
      data: [
        { studentId: 1, teacherId: 10 },
        { studentId: 2, teacherId: 10 },
      ],
      skipDuplicates: true,
    });
  });

  it('returns an empty array for common students when no teachers are supplied', async () => {
    const db = createDb();
    const repository = new StudentRepository(db);

    await expect(repository.getCommonStudentsForTeachers([])).resolves.toEqual(
      [],
    );
    expect(db.student.findMany).not.toHaveBeenCalled();
  });

  it('queries common students with a teacher intersection filter', async () => {
    const db = createDb();
    const students = [{ email: 'student@example.com', id: 1 }] as Student[];
    db.student.findMany.mockResolvedValue(students);
    const repository = new StudentRepository(db);

    const result = await repository.getCommonStudentsForTeachers([
      'teacher1@example.com',
      'teacher2@example.com',
    ]);

    expect(db.student.findMany).toHaveBeenCalledWith({
      orderBy: {
        email: 'asc',
      },
      where: {
        AND: [
          {
            registrations: {
              some: {
                teacher: {
                  email: 'teacher1@example.com',
                },
              },
            },
          },
          {
            registrations: {
              some: {
                teacher: {
                  email: 'teacher2@example.com',
                },
              },
            },
          },
        ],
      },
    });
    expect(result).toBe(students);
  });

  it('gets a student by email', async () => {
    const db = createDb();
    const student = { email: 'student@example.com', id: 1 } as Student;
    db.student.findFirst.mockResolvedValue(student);
    const repository = new StudentRepository(db);

    const result = await repository.getStudentByEmail('student@example.com');

    expect(db.student.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'student@example.com',
      },
    });
    expect(result).toBe(student);
  });

  it('returns an empty array without querying when no student emails are supplied', async () => {
    const db = createDb();
    const repository = new StudentRepository(db);

    await expect(repository.getStudentsByEmails([])).resolves.toEqual([]);
    expect(db.student.findMany).not.toHaveBeenCalled();
  });

  it('gets students by email in ascending email order', async () => {
    const db = createDb();
    const students = [{ email: 'student@example.com', id: 1 }] as Student[];
    db.student.findMany.mockResolvedValue(students);
    const repository = new StudentRepository(db);

    const result = await repository.getStudentsByEmails([
      'student@example.com',
    ]);

    expect(db.student.findMany).toHaveBeenCalledWith({
      orderBy: {
        email: 'asc',
      },
      where: {
        email: {
          in: ['student@example.com'],
        },
      },
    });
    expect(result).toBe(students);
  });

  it('gets active students for a teacher when suspended students are excluded', async () => {
    const db = createDb();
    db.student.findMany.mockResolvedValue([]);
    const repository = new StudentRepository(db);

    await repository.getStudentsForTeacher(9, { includeSuspended: false });

    expect(db.student.findMany).toHaveBeenCalledWith({
      orderBy: {
        email: 'asc',
      },
      where: {
        registrations: {
          some: {
            teacherId: 9,
          },
        },
        suspended: false,
      },
    });
  });

  it('gets all students for a teacher when suspended students are included', async () => {
    const db = createDb();
    db.student.findMany.mockResolvedValue([]);
    const repository = new StudentRepository(db);

    await repository.getStudentsForTeacher(9, { includeSuspended: true });

    expect(db.student.findMany).toHaveBeenCalledWith({
      orderBy: {
        email: 'asc',
      },
      where: {
        registrations: {
          some: {
            teacherId: 9,
          },
        },
      },
    });
  });

  it('updates student suspension', async () => {
    const db = createDb();
    const student = { email: 'student@example.com', id: 1 } as Student;
    db.student.update.mockResolvedValue(student);
    const repository = new StudentRepository(db);

    const result = await repository.updateStudentSuspension(1, true);

    expect(db.student.update).toHaveBeenCalledWith({
      data: {
        suspended: true,
      },
      where: {
        id: 1,
      },
    });
    expect(result).toBe(student);
  });
});
