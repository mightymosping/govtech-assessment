import { Router } from 'express';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

export const createHealthRouter = (
  healthService: HealthService = new HealthService(),
) => {
  const healthRouter = Router();
  const controller = new HealthController(healthService);

  healthRouter.get('/', controller.getHealth);

  return healthRouter;
};
