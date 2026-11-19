import { ApiFieldError } from './types';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: ApiFieldError[];
  public readonly correlationId?: string;
  public readonly timestamp?: string;

  constructor(params: {
    message: string;
    statusCode: number;
    code: string;
    errors?: ApiFieldError[];
    correlationId?: string;
    timestamp?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.errors = params.errors;
    this.correlationId = params.correlationId;
    this.timestamp = params.timestamp;

    // Restore prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  get isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR' || (this.errors && this.errors.length > 0) || false;
  }
}
