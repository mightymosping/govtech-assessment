import type { NextFunction, Request, Response } from 'express';

import { HealthController } from '../../../src/features/health/health.controller';
import type { HealthService } from '../../../src/features/health/health.service';

describe('HealthController', () => {
  const createResponse = (): Response => {
    const response = {
      json: jest.fn(),
      status: jest.fn(),
    } as unknown as Response;

    response.status = jest.fn().mockReturnValue(response);

    return response;
  };

  it('returns the service response', async () => {
    const response = createResponse();
    const service = {
      getHealth: jest.fn().mockResolvedValue({
        database: 'up',
        status: 'ok',
        timestamp: '2026-04-05T00:00:00.000Z',
      }),
    } as unknown as HealthService;
    const controller = new HealthController(service);

    await controller.getHealth(
      {} as Request,
      response,
      jest.fn() as NextFunction,
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      database: 'up',
      status: 'ok',
      timestamp: '2026-04-05T00:00:00.000Z',
    });
  });

  it('forwards service errors to the error pipeline', async () => {
    const error = new Error('boom');
    const next = jest.fn();
    const service = {
      getHealth: jest.fn().mockRejectedValue(error),
    } as unknown as HealthService;
    const controller = new HealthController(service);

    await controller.getHealth(
      {} as Request,
      createResponse(),
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});
