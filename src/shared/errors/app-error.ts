export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;
  public readonly isExternal: boolean;

  public constructor(
    statusCode: number,
    message: string,
    options?: {
      cause?: unknown;
      errors?: Record<string, string[]>;
      isExternal?: boolean;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.errors = options?.errors;
    this.isExternal = options?.isExternal ?? false;
  }
}

export class ValidationAppError extends AppError {
  public constructor(errors: Record<string, string[]>) {
    super(400, 'Validation errors', { errors });
  }
}

export class NotFoundAppError extends AppError {
  public constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class ExternalDependencyAppError extends AppError {
  public constructor(message = 'External dependency failure', cause?: unknown) {
    super(500, message, { cause, isExternal: true });
  }
}
