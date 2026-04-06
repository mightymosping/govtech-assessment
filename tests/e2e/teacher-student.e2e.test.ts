import request from 'supertest';

import { createApp } from '../../src/app/app';
import { NotFoundAppError } from '../../src/shared/errors/app-error';

describe('teacher-student e2e', () => {
  const createTeacherStudentService = () => {
    return {
      registerStudentsToTeacher: jest.fn().mockResolvedValue(undefined),
      retrieveCommonStudents: jest.fn().mockResolvedValue([]),
      retrieveRecipientsForNotification: jest.fn().mockResolvedValue([]),
      suspendStudent: jest.fn().mockResolvedValue(undefined),
    };
  };

  it('registers students', async () => {
    const teacherStudentService = createTeacherStudentService();
    const app = createApp({ teacherStudentService });

    const response = await request(app)
      .post('/api/register')
      .send({
        students: ['StudentOne@Example.com'],
        teacher: 'Teacher@Example.com',
      });

    expect(response.status).toBe(204);
    expect(
      teacherStudentService.registerStudentsToTeacher,
    ).toHaveBeenCalledWith('Teacher@Example.com', ['StudentOne@Example.com']);
  });

  it('returns the register missing teacher validation message', async () => {
    const app = createApp({
      teacherStudentService: createTeacherStudentService(),
    });

    const response = await request(app)
      .post('/api/register')
      .send({
        students: ['student@example.com'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: {
        teacher: ['Teacher is missing'],
      },
      message: 'Validation errors',
      status: 400,
    });
  });

  it('returns the register invalid student validation message', async () => {
    const app = createApp({
      teacherStudentService: createTeacherStudentService(),
    });

    const response = await request(app)
      .post('/api/register')
      .send({
        students: ['student'],
        teacher: 'teacher@example.com',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: {
        students: ['One or more students is not in a valid format'],
      },
      message: 'Validation errors',
      status: 400,
    });
  });

  it('returns an empty list for common students when no teacher query is provided', async () => {
    const teacherStudentService = createTeacherStudentService();
    teacherStudentService.retrieveCommonStudents.mockResolvedValue([]);
    const app = createApp({ teacherStudentService });

    const response = await request(app).get('/api/commonstudents');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      students: [],
    });
    expect(teacherStudentService.retrieveCommonStudents).toHaveBeenCalledWith(
      [],
    );
  });

  it('returns recipients for notifications', async () => {
    const teacherStudentService = createTeacherStudentService();
    teacherStudentService.retrieveRecipientsForNotification.mockResolvedValue([
      'student@example.com',
    ]);
    const app = createApp({ teacherStudentService });

    const response = await request(app)
      .post('/api/retrievefornotifications')
      .send({
        notification: 'Hello @student@example.com',
        teacher: 'teacher@example.com',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      recipients: ['student@example.com'],
    });
  });

  it('returns the retrieve-for-notifications missing notification message', async () => {
    const app = createApp({
      teacherStudentService: createTeacherStudentService(),
    });

    const response = await request(app)
      .post('/api/retrievefornotifications')
      .send({
        teacher: 'teacher@example.com',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: {
        notification: ['Notification is missing'],
      },
      message: 'Validation errors',
      status: 400,
    });
  });

  it('suspends a student', async () => {
    const teacherStudentService = createTeacherStudentService();
    const app = createApp({ teacherStudentService });

    const response = await request(app).post('/api/suspend').send({
      student: 'student@example.com',
    });

    expect(response.status).toBe(204);
    expect(teacherStudentService.suspendStudent).toHaveBeenCalledWith(
      'student@example.com',
    );
  });

  it('returns the suspend missing student validation message', async () => {
    const app = createApp({
      teacherStudentService: createTeacherStudentService(),
    });

    const response = await request(app).post('/api/suspend').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: {
        student: ['Student is missing'],
      },
      message: 'Validation errors',
      status: 400,
    });
  });

  it('returns 404 when suspend fails for a missing student', async () => {
    const teacherStudentService = createTeacherStudentService();
    teacherStudentService.suspendStudent.mockRejectedValue(
      new NotFoundAppError('Student not found'),
    );
    const app = createApp({ teacherStudentService });

    const response = await request(app).post('/api/suspend').send({
      student: 'missing@example.com',
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Student not found',
      status: 404,
    });
  });
});
