import {
  commonStudentsQuerySchema,
  registerBodySchema,
  retrieveForNotificationsBodySchema,
  suspendBodySchema,
} from '../../../../src/features/teacher-student/teacher-student.schemas';

describe('teacher-student schemas', () => {
  it('parses a valid register body without lowercasing emails', async () => {
    await expect(
      registerBodySchema.parseAsync({
        students: [' StudentOne@Example.com '],
        teacher: ' Teacher@Example.com ',
      }),
    ).resolves.toEqual({
      students: ['StudentOne@Example.com'],
      teacher: 'Teacher@Example.com',
    });
  });

  it('returns the register missing teacher message', async () => {
    await expect(
      registerBodySchema.parseAsync({
        students: ['student@example.com'],
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Teacher is missing' })],
    });
  });

  it('returns the register invalid teacher format message', async () => {
    await expect(
      registerBodySchema.parseAsync({
        students: ['student@example.com'],
        teacher: 'teacher',
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'Teacher is not in a valid format',
        }),
      ],
    });
  });

  it('returns the register missing teacher message for empty strings', async () => {
    await expect(
      registerBodySchema.parseAsync({
        students: ['student@example.com'],
        teacher: '   ',
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Teacher is missing' })],
    });
  });

  it('returns the register students missing message', async () => {
    await expect(
      registerBodySchema.parseAsync({
        teacher: 'teacher@example.com',
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'Must contain at least one student',
        }),
      ],
    });
  });

  it('returns the register invalid student format message', async () => {
    await expect(
      registerBodySchema.parseAsync({
        students: ['student'],
        teacher: 'teacher@example.com',
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'One or more students is not in a valid format',
        }),
      ],
    });
  });

  it('returns the common students missing teacher message', async () => {
    await expect(commonStudentsQuerySchema.parseAsync({})).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'Must contain at least one teacher',
        }),
      ],
    });
  });

  it('normalizes a single common-students teacher value into an array', async () => {
    await expect(
      commonStudentsQuerySchema.parseAsync({
        teacher: ' teacher@example.com ',
      }),
    ).resolves.toEqual({
      teacher: ['teacher@example.com'],
    });
  });

  it('returns the common students invalid teacher format message', async () => {
    await expect(
      commonStudentsQuerySchema.parseAsync({
        teacher: ['teacher@example.com', 'invalid'],
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'One or more teachers is not in a valid format',
        }),
      ],
    });
  });

  it('returns the suspend missing student message', async () => {
    await expect(suspendBodySchema.parseAsync({})).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Student is missing' })],
    });
  });

  it('returns the suspend invalid student format message', async () => {
    await expect(
      suspendBodySchema.parseAsync({
        student: 'student',
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'Student is not in a valid format',
        }),
      ],
    });
  });

  it('returns the suspend missing student message for empty strings', async () => {
    await expect(
      suspendBodySchema.parseAsync({
        student: '   ',
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Student is missing' })],
    });
  });

  it('returns the retrieve-for-notifications missing teacher message', async () => {
    await expect(
      retrieveForNotificationsBodySchema.parseAsync({
        notification: 'Hello',
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Teacher is missing' })],
    });
  });

  it('returns the retrieve-for-notifications invalid teacher format message', async () => {
    await expect(
      retrieveForNotificationsBodySchema.parseAsync({
        notification: 'Hello',
        teacher: 'teacher',
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message: 'Teacher is not in a valid format',
        }),
      ],
    });
  });

  it('returns the retrieve-for-notifications missing notification message', async () => {
    await expect(
      retrieveForNotificationsBodySchema.parseAsync({
        teacher: 'teacher@example.com',
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Notification is missing' })],
    });
  });

  it('returns the retrieve-for-notifications missing notification message for empty strings', async () => {
    await expect(
      retrieveForNotificationsBodySchema.parseAsync({
        notification: '   ',
        teacher: 'teacher@example.com',
      }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ message: 'Notification is missing' })],
    });
  });
});
