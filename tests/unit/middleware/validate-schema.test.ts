import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { ValidationAppError } from '../../../src/shared/errors/app-error';
import { validateSchema } from '../../../src/middleware/validate-schema';

describe('validateSchema', () => {
  const response = {} as Response;

  it('writes parsed body values back to the request', async () => {
    const middleware = validateSchema({
      body: z.object({ amount: z.coerce.number().int() }),
    });
    const request = { body: { amount: '5' }, params: {}, query: {} } as Request;
    const next: NextFunction = jest.fn();

    await middleware(request, response, next);

    expect(request.body).toEqual({ amount: 5 });
    expect(next).toHaveBeenCalledWith();
  });

  it('writes parsed query values back to the request', async () => {
    const middleware = validateSchema({
      query: z.object({ limit: z.coerce.number().int() }),
    });
    const request = {
      body: {},
      params: {},
      query: { limit: '2' },
    } as unknown as Request;
    const next: NextFunction = jest.fn();

    await middleware(request, response, next);

    expect(request.query).toEqual({ limit: 2 });
    expect(next).toHaveBeenCalledWith();
  });

  it('writes parsed query values back when request.query is getter-only', async () => {
    const middleware = validateSchema({
      query: z.object({ teacher: z.array(z.string()).default([]) }),
    });
    const request = {} as Request;

    Object.defineProperty(request, 'body', {
      configurable: true,
      enumerable: true,
      value: {},
      writable: true,
    });
    Object.defineProperty(request, 'params', {
      configurable: true,
      enumerable: true,
      value: {},
      writable: true,
    });
    Object.defineProperty(request, 'query', {
      configurable: true,
      enumerable: true,
      get: () => ({}),
    });

    const next: NextFunction = jest.fn();

    await middleware(request, response, next);

    expect(request.query).toEqual({ teacher: [] });
    expect(next).toHaveBeenCalledWith();
  });

  it('writes parsed params values back to the request', async () => {
    const middleware = validateSchema({
      params: z.object({ id: z.coerce.number().int() }),
    });
    const request = {
      body: {},
      params: { id: '7' },
      query: {},
    } as unknown as Request;
    const next: NextFunction = jest.fn();

    await middleware(request, response, next);

    expect(request.params).toEqual({ id: 7 });
    expect(next).toHaveBeenCalledWith();
  });

  it('maps validation failures into aggregated field errors', async () => {
    const middleware = validateSchema({
      body: z
        .object({
          teacher: z.string().email('Invalid format'),
          students: z
            .array(z.string().email('Invalid email format'))
            .min(2, 'Must contain at least 2 items'),
        })
        .superRefine((_value, context) => {
          context.addIssue({
            code: 'custom',
            message: 'Invalid format',
            path: ['students'],
          });
        }),
    });
    const request = {
      body: {
        teacher: 'teacher',
        students: ['student'],
      },
      params: {},
      query: {},
    } as unknown as Request;
    const next = jest.fn();

    await middleware(request, response, next);

    const [error] = next.mock.calls[0] as [ValidationAppError];

    expect(error).toBeInstanceOf(ValidationAppError);
    expect(error.errors).toEqual({
      students: ['Must contain at least 2 items', 'Invalid format'],
      'students[0]': ['Invalid email format'],
      teacher: ['Invalid format'],
    });
  });
});
