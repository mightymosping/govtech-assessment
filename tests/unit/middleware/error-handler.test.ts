import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { errorHandler } from '../../../src/middleware/error-handler';
import {
  AppError,
  ExternalDependencyAppError,
} from '../../../src/shared/errors/app-error';

describe('errorHandler', () => {
  const createResponse = (): Response => {
    const response = {
      json: jest.fn(),
      status: jest.fn(),
    } as unknown as Response;

    response.status = jest.fn().mockReturnValue(response);

    return response;
  };

  it('returns a normalized validation payload for zod errors', () => {
    const response = createResponse();
    const request = {} as Request;

    errorHandler(
      new ZodError([
        {
          code: 'custom',
          message: 'Invalid format',
          path: ['teacher'],
        },
      ]),
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      errors: { teacher: ['Invalid format'] },
      message: 'Validation errors',
      status: 400,
    });
  });

  it('returns the explicit status code for known HTTP errors', () => {
    const response = createResponse();
    const request = {} as Request;

    errorHandler(
      { message: 'Not Found', status: 404 },
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Not Found',
      status: 404,
    });
  });

  it('normalizes 5xx status objects and logs them as request failures', () => {
    const response = createResponse();
    const request = {
      log: {
        error: jest.fn(),
      },
    } as unknown as Request;

    errorHandler(
      { statusCode: 503 },
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(request.log?.error).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Request failed',
      status: 503,
    });
  });

  it('logs and returns external dependency failures', () => {
    const response = createResponse();
    const request = {
      log: {
        error: jest.fn(),
      },
      requestId: 'req-1',
    } as unknown as Request;

    errorHandler(
      new ExternalDependencyAppError(),
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(request.log?.error).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: 'External dependency failure',
      status: 500,
    });
  });

  it('falls back to internal server error for unknown failures', () => {
    const response = createResponse();
    const request = {
      log: {
        error: jest.fn(),
      },
    } as unknown as Request;

    errorHandler(
      new Error('boom'),
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Internal Server Error',
      status: 500,
    });
  });

  it('passes through existing app errors', () => {
    const response = createResponse();
    const request = {} as Request;

    errorHandler(
      new AppError(409, 'Conflict'),
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Conflict',
      status: 409,
    });
  });
});
