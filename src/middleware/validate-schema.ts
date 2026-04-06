import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodIssue, type ZodTypeAny } from 'zod';

import { ValidationAppError } from '../shared/errors/app-error';
import { formatZodError } from '../shared/utils/zod-error';

type RequestSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

const assignParsedValue = (
  request: Request,
  key: 'body' | 'params' | 'query',
  parsedValue: unknown,
): void => {
  try {
    request[key] = parsedValue as never;
  } catch {
    Object.defineProperty(request, key, {
      configurable: true,
      enumerable: true,
      value: parsedValue,
      writable: true,
    });
  }
};

const collectIssues = async (
  schema: ZodTypeAny | undefined,
  value: unknown,
  assign: (parsedValue: unknown) => void,
): Promise<ZodIssue[]> => {
  if (!schema) {
    return [];
  }

  const result = await schema.safeParseAsync(value);

  if (!result.success) {
    return result.error.issues;
  }

  assign(result.data);

  return [];
};

export const validateSchema = (schemas: RequestSchemas): RequestHandler => {
  return async (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const issues = [
      ...(await collectIssues(schemas.body, request.body, (parsedValue) => {
        assignParsedValue(request, 'body', parsedValue);
      })),
      ...(await collectIssues(schemas.query, request.query, (parsedValue) => {
        assignParsedValue(request, 'query', parsedValue);
      })),
      ...(await collectIssues(schemas.params, request.params, (parsedValue) => {
        assignParsedValue(request, 'params', parsedValue);
      })),
    ];

    if (issues.length > 0) {
      next(new ValidationAppError(formatZodError(new ZodError(issues))));

      return;
    }

    next();
  };
};
