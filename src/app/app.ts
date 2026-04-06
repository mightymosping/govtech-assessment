import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { createRoutes, type RouteDependencies } from './routes';
import { errorHandler } from '../middleware/error-handler';
import { notFoundHandler } from '../middleware/not-found';
import { requestContextMiddleware } from '../middleware/request-context';
import { createHttpLogger } from '../shared/logging/logger';

export const createApp = (dependencies: RouteDependencies = {}) => {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContextMiddleware);
  app.use(createHttpLogger());
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(createRoutes(dependencies));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
