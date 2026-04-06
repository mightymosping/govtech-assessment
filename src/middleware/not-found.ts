import type { NextFunction, Request, Response } from 'express';

import { NotFoundAppError } from '../shared/errors/app-error';

export const notFoundHandler = (
  _request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(new NotFoundAppError());
};
