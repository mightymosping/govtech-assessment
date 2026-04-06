import { Router } from 'express';

import type { HealthService } from '../features/health/health.service';
import { createHealthRouter } from '../features/health/health.route';
import type { TeacherStudentServiceLike } from '../features/teacher-student/teacher-student.service';
import { createTeacherStudentRouter } from '../features/teacher-student/teacher-student.route';

export type RouteDependencies = {
  healthService?: HealthService;
  teacherStudentService?: TeacherStudentServiceLike;
};

export const createRoutes = (dependencies: RouteDependencies = {}) => {
  const router = Router();

  router.use('/api/health', createHealthRouter(dependencies.healthService));
  router.use(
    '/api',
    createTeacherStudentRouter(dependencies.teacherStudentService),
  );

  return router;
};
