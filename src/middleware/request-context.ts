import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { logger } from '../shared/logging/logger';

type RequestContextStore = {
  logger: typeof logger;
  requestId: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

const HEADER_NAME = 'x-request-id';

const resolveRequestId = (request: Request): string => {
  const incomingHeader = request.header(HEADER_NAME);

  return incomingHeader && incomingHeader.trim().length > 0
    ? incomingHeader
    : randomUUID();
};

export const requestContextMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const requestId = resolveRequestId(request);
  const requestLogger = logger.child({ requestId });

  request.requestId = requestId;
  request.log = requestLogger;
  response.setHeader(HEADER_NAME, requestId);

  requestContextStorage.run(
    {
      logger: requestLogger,
      requestId,
    },
    next,
  );
};

export const getRequestContext = (): RequestContextStore | undefined => {
  return requestContextStorage.getStore();
};

export const getRequestLogger = (): typeof logger => {
  return getRequestContext()?.logger ?? logger;
};
