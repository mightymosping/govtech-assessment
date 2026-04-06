import request from 'supertest';

import { createApp } from '../../src/app/app';
import { ExternalDependencyAppError } from '../../src/shared/errors/app-error';
import type { HealthService } from '../../src/features/health/health.service';

describe('app e2e', () => {
  it('returns health with an echoed request id', async () => {
    const app = createApp({
      healthService: {
        getHealth: jest.fn().mockResolvedValue({
          database: 'up',
          status: 'ok',
          timestamp: '2026-04-05T00:00:00.000Z',
        }),
      } as unknown as HealthService,
    });

    const response = await request(app)
      .get('/api/health')
      .set('x-request-id', 'incoming-id');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      database: 'up',
      status: 'ok',
      timestamp: '2026-04-05T00:00:00.000Z',
    });
    expect(response.headers['x-request-id']).toBe('incoming-id');
  });

  it('generates a request id when the header is absent', async () => {
    const app = createApp({
      healthService: {
        getHealth: jest.fn().mockResolvedValue({
          database: 'up',
          status: 'ok',
          timestamp: '2026-04-05T00:00:00.000Z',
        }),
      } as unknown as HealthService,
    });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toHaveLength(0);
  });

  it('returns a centralized 500 when the health check fails', async () => {
    const app = createApp({
      healthService: {
        getHealth: jest
          .fn()
          .mockRejectedValue(new ExternalDependencyAppError()),
      } as unknown as HealthService,
    });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: 'External dependency failure',
      status: 500,
    });
  });

  it('returns a 404 payload for unknown routes', async () => {
    const app = createApp({
      healthService: {
        getHealth: jest.fn(),
      } as unknown as HealthService,
    });

    const response = await request(app).get('/api/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Not Found',
      status: 404,
    });
  });
});
