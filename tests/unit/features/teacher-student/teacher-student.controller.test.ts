import type { NextFunction, Request, Response } from 'express';

import { TeacherStudentController } from '../../../../src/features/teacher-student/teacher-student.controller';

describe('TeacherStudentController', () => {
  const createResponse = (): Response => {
    const response = {
      json: jest.fn(),
      send: jest.fn(),
      status: jest.fn(),
    } as unknown as Response;

    response.status = jest.fn().mockReturnValue(response);

    return response;
  };

  const createService = () => {
    return {
      registerStudentsToTeacher: jest.fn(),
      retrieveCommonStudents: jest.fn(),
      retrieveRecipientsForNotification: jest.fn(),
      suspendStudent: jest.fn(),
    };
  };

  it('returns 204 for register', async () => {
    const response = createResponse();
    const service = createService();
    const controller = new TeacherStudentController(service);

    await controller.register(
      {
        body: {
          students: ['student@example.com'],
          teacher: 'teacher@example.com',
        },
      } as Request,
      response,
      jest.fn() as NextFunction,
    );

    expect(service.registerStudentsToTeacher).toHaveBeenCalledWith(
      'teacher@example.com',
      ['student@example.com'],
    );
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledWith();
  });

  it('forwards register errors', async () => {
    const error = new Error('boom');
    const next = jest.fn();
    const service = createService();
    service.registerStudentsToTeacher.mockRejectedValue(error);
    const controller = new TeacherStudentController(service);

    await controller.register(
      {
        body: {
          students: ['student@example.com'],
          teacher: 'teacher@example.com',
        },
      } as Request,
      createResponse(),
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(error);
  });

  it('returns common students', async () => {
    const response = createResponse();
    const service = createService();
    service.retrieveCommonStudents.mockResolvedValue(['student@example.com']);
    const controller = new TeacherStudentController(service);

    await controller.retrieveCommonStudents(
      {
        query: {
          teacher: ['teacher@example.com'],
        },
      } as unknown as Request,
      response,
      jest.fn() as NextFunction,
    );

    expect(service.retrieveCommonStudents).toHaveBeenCalledWith([
      'teacher@example.com',
    ]);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      students: ['student@example.com'],
    });
  });

  it('forwards common-student errors', async () => {
    const error = new Error('boom');
    const next = jest.fn();
    const service = createService();
    service.retrieveCommonStudents.mockRejectedValue(error);
    const controller = new TeacherStudentController(service);

    await controller.retrieveCommonStudents(
      {
        query: {
          teacher: [],
        },
      } as unknown as Request,
      createResponse(),
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(error);
  });

  it('returns notification recipients', async () => {
    const response = createResponse();
    const service = createService();
    service.retrieveRecipientsForNotification.mockResolvedValue([
      'student@example.com',
    ]);
    const controller = new TeacherStudentController(service);

    await controller.retrieveForNotifications(
      {
        body: {
          notification: 'Hello',
          teacher: 'teacher@example.com',
        },
      } as Request,
      response,
      jest.fn() as NextFunction,
    );

    expect(service.retrieveRecipientsForNotification).toHaveBeenCalledWith(
      'teacher@example.com',
      'Hello',
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      recipients: ['student@example.com'],
    });
  });

  it('forwards notification errors', async () => {
    const error = new Error('boom');
    const next = jest.fn();
    const service = createService();
    service.retrieveRecipientsForNotification.mockRejectedValue(error);
    const controller = new TeacherStudentController(service);

    await controller.retrieveForNotifications(
      {
        body: {
          notification: 'Hello',
          teacher: 'teacher@example.com',
        },
      } as Request,
      createResponse(),
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(error);
  });

  it('returns 204 for suspend', async () => {
    const response = createResponse();
    const service = createService();
    const controller = new TeacherStudentController(service);

    await controller.suspend(
      {
        body: {
          student: 'student@example.com',
        },
      } as Request,
      response,
      jest.fn() as NextFunction,
    );

    expect(service.suspendStudent).toHaveBeenCalledWith('student@example.com');
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledWith();
  });

  it('forwards suspend errors', async () => {
    const error = new Error('boom');
    const next = jest.fn();
    const service = createService();
    service.suspendStudent.mockRejectedValue(error);
    const controller = new TeacherStudentController(service);

    await controller.suspend(
      {
        body: {
          student: 'student@example.com',
        },
      } as Request,
      createResponse(),
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});
