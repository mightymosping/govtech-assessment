import type { NextFunction, Request, Response } from 'express';

import {
  getRequestContext,
  getRequestLogger,
  requestContextMiddleware,
} from '../../../src/middleware/request-context';
import { logger } from '../../../src/shared/logging/logger';

describe('requestContextMiddleware', () => {
  const createResponse = (): Response => {
    return {
      setHeader: jest.fn(),
    } as unknown as Response;
  };

  it('uses the incoming x-request-id and binds request context', () => {
    const request = {
      header: jest.fn().mockReturnValue('incoming-id'),
    } as unknown as Request;
    const response = createResponse();
    const next: NextFunction = jest.fn(() => {
      expect(getRequestContext()?.requestId).toBe('incoming-id');
      expect(getRequestLogger()).toBe(request.log);
    });

    requestContextMiddleware(request, response, next);

    expect(request.requestId).toBe('incoming-id');
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'incoming-id',
    );
    expect(request.log).toBeDefined();
  });

  it('generates a request id when one is not supplied', () => {
    const request = {
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const response = createResponse();
    const next = jest.fn();

    requestContextMiddleware(request, response, next);

    expect(request.requestId).toEqual(expect.any(String));
    expect(request.requestId).not.toHaveLength(0);
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      request.requestId,
    );
  });

  it('falls back to the base logger outside a request context', () => {
    expect(getRequestLogger()).toBe(logger);
  });
});
