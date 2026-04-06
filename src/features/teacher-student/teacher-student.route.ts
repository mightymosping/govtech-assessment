import { Router } from 'express';

import { validateSchema } from '../../middleware/validate-schema';
import {
  commonStudentsQuerySchema,
  registerBodySchema,
  retrieveForNotificationsBodySchema,
  suspendBodySchema,
} from './teacher-student.schemas';
import {
  TeacherStudentService,
  type TeacherStudentServiceLike,
} from './teacher-student.service';
import { TeacherStudentController } from './teacher-student.controller';

export const createTeacherStudentRouter = (
  teacherStudentService: TeacherStudentServiceLike = new TeacherStudentService(),
) => {
  const teacherStudentRouter = Router();
  const controller = new TeacherStudentController(teacherStudentService);

  teacherStudentRouter.post(
    '/register',
    validateSchema({ body: registerBodySchema }),
    controller.register,
  );
  teacherStudentRouter.get(
    '/commonstudents',
    validateSchema({ query: commonStudentsQuerySchema }),
    controller.retrieveCommonStudents,
  );
  teacherStudentRouter.post(
    '/suspend',
    validateSchema({ body: suspendBodySchema }),
    controller.suspend,
  );
  teacherStudentRouter.post(
    '/retrievefornotifications',
    validateSchema({ body: retrieveForNotificationsBodySchema }),
    controller.retrieveForNotifications,
  );

  return teacherStudentRouter;
};
