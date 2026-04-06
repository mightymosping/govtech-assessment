import type { NextFunction, Request, Response } from 'express';

import type {
  CommonStudentsQuery,
  RegisterBody,
  RetrieveForNotificationsBody,
  SuspendBody,
} from './teacher-student.schemas';
import type { TeacherStudentServiceLike } from './teacher-student.service';

export class TeacherStudentController {
  public constructor(
    private readonly teacherStudentService: TeacherStudentServiceLike,
  ) {}

  public readonly register = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = request.body as RegisterBody;

      await this.teacherStudentService.registerStudentsToTeacher(
        body.teacher,
        body.students,
      );

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public readonly retrieveCommonStudents = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = request.query as unknown as CommonStudentsQuery;
      const students = await this.teacherStudentService.retrieveCommonStudents(
        query.teacher,
      );

      response.status(200).json({ students });
    } catch (error) {
      next(error);
    }
  };

  public readonly retrieveForNotifications = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = request.body as RetrieveForNotificationsBody;
      const recipients =
        await this.teacherStudentService.retrieveRecipientsForNotification(
          body.teacher,
          body.notification,
        );

      response.status(200).json({ recipients });
    } catch (error) {
      next(error);
    }
  };

  public readonly suspend = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = request.body as SuspendBody;

      await this.teacherStudentService.suspendStudent(body.student);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
