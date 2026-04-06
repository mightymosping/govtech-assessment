import type { Teacher } from '@prisma/client';

import { TeacherRepository } from '../../../../src/features/teacher-student/repositories/teacher.repository';

describe('TeacherRepository', () => {
  const createDb = () => {
    return {
      teacher: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
  };

  it('creates a teacher', async () => {
    const db = createDb();
    const teacher = { email: 'teacher@example.com', id: 1 } as Teacher;
    db.teacher.create.mockResolvedValue(teacher);
    const repository = new TeacherRepository(db);

    const result = await repository.createTeacher('teacher@example.com');

    expect(db.teacher.create).toHaveBeenCalledWith({
      data: {
        email: 'teacher@example.com',
      },
    });
    expect(result).toBe(teacher);
  });

  it('gets a teacher by email', async () => {
    const db = createDb();
    const teacher = { email: 'teacher@example.com', id: 1 } as Teacher;
    db.teacher.findFirst.mockResolvedValue(teacher);
    const repository = new TeacherRepository(db);

    const result = await repository.getTeacherByEmail('teacher@example.com');

    expect(db.teacher.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'teacher@example.com',
      },
    });
    expect(result).toBe(teacher);
  });

  it('returns an empty array without querying when no teacher emails are supplied', async () => {
    const db = createDb();
    const repository = new TeacherRepository(db);

    await expect(repository.getTeachersByEmails([])).resolves.toEqual([]);
    expect(db.teacher.findMany).not.toHaveBeenCalled();
  });

  it('gets teachers by email in ascending email order', async () => {
    const db = createDb();
    const teachers = [{ email: 'teacher@example.com', id: 1 }] as Teacher[];
    db.teacher.findMany.mockResolvedValue(teachers);
    const repository = new TeacherRepository(db);

    const result = await repository.getTeachersByEmails([
      'teacher@example.com',
    ]);

    expect(db.teacher.findMany).toHaveBeenCalledWith({
      orderBy: {
        email: 'asc',
      },
      where: {
        email: {
          in: ['teacher@example.com'],
        },
      },
    });
    expect(result).toBe(teachers);
  });
});
