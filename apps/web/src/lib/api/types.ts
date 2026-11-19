/**
 * Marvel's Basket API Response Interfaces
 * Strictly mirrors the NestJS TransformInterceptor and AllExceptionsFilter envelopes.
 */

export interface ApiResponse<T = unknown> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  timestamp: string;
  path: string;
  correlationId: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  errors?: ApiFieldError[];
  timestamp: string;
  path: string;
  correlationId: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}
