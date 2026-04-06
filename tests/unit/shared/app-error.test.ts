import {
  AppError,
  ExternalDependencyAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../../src/shared/errors/app-error';

describe('app errors', () => {
  it('stores shared error properties', () => {
    const error = new AppError(418, 'Teapot');

    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('Teapot');
    expect(error.isExternal).toBe(false);
  });

  it('creates specialized error variants', () => {
    const validationError = new ValidationAppError({
      teacher: ['Invalid format'],
    });
    const notFoundError = new NotFoundAppError();
    const externalError = new ExternalDependencyAppError();

    expect(validationError.errors).toEqual({ teacher: ['Invalid format'] });
    expect(notFoundError.statusCode).toBe(404);
    expect(externalError.isExternal).toBe(true);
  });
});
