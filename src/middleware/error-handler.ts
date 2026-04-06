import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError, ValidationAppError } from '../shared/errors/app-error';
import { logger } from '../shared/logging/logger';
import { formatZodError } from '../shared/utils/zod-error';

type ErrorWithStatus = {
  message?: string;
  status?: number;
  statusCode?: number;
};

const isErrorWithStatus = (error: unknown): error is ErrorWithStatus => {
  return typeof error === 'object' && error !== null;
};

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationAppError(formatZodError(error));
  }

  if (isErrorWithStatus(error)) {
    const statusCode = error.statusCode ?? error.status;

    if (typeof statusCode === 'number') {
      return new AppError(
        statusCode,
        error.message ?? 'Request failed',
        statusCode >= 500 ? { cause: error } : undefined,
      );
    }
  }

  return new AppError(500, 'Internal Server Error', { cause: error });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  const normalizedError = toAppError(error);
  const requestLogger = request.log ?? logger;

  if (normalizedError.statusCode >= 500) {
    requestLogger.error(
      {
        err: error,
        requestId: request.requestId,
      },
      normalizedError.isExternal
        ? 'External dependency failure'
        : 'Unhandled request failure',
    );
  }

  response.status(normalizedError.statusCode).json({
    ...(normalizedError.errors ? { errors: normalizedError.errors } : {}),
    message: normalizedError.message,
    status: normalizedError.statusCode,
  });
};
