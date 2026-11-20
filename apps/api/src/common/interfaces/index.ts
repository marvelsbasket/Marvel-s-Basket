import { Request } from 'express';

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
  path: string;
  correlationId: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
  data?: unknown;
  timestamp: string;
  path: string;
  correlationId: string;
}

export interface RequestWithCorrelation extends Request {
  correlationId?: string;
  startTime?: number;
}
