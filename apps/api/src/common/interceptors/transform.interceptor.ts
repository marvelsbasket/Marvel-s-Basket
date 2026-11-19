import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { BYPASS_TRANSFORM_KEY, RESPONSE_MESSAGE_KEY } from '../constants';
import { ApiSuccessResponse, PaginationMeta, RequestWithCorrelation } from '../interfaces';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(BYPASS_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isBypassed) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithCorrelation>();
    const response = httpContext.getResponse<Response>();

    const customMessage = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((result: T): ApiSuccessResponse<T> | T => {
        // If response is already sent or null/undefined in stream bypass
        if (response.headersSent) {
          return result;
        }

        const resObj =
          result && typeof result === 'object' ? (result as Record<string, unknown>) : null;

        // Avoid double-wrapping if already structured
        if (resObj && resObj.success === true && 'data' in resObj) {
          return result;
        }

        let data: unknown = result;
        let meta: PaginationMeta | undefined = undefined;

        // Extract pagination meta if standard payload returned
        if (resObj && 'data' in resObj && 'meta' in resObj && Array.isArray(resObj.data)) {
          data = resObj.data;
          meta = resObj.meta as PaginationMeta | undefined;
        }

        const statusCode = response.statusCode || 200;
        const message = customMessage || 'Request completed successfully';
        const path = request.originalUrl || request.url || '';
        const correlationId =
          request.correlationId || (response.getHeader('x-correlation-id') as string) || '';

        return {
          success: true,
          statusCode,
          message,
          data: data as T,
          ...(meta ? { meta } : {}),
          timestamp: new Date().toISOString(),
          path,
          correlationId,
        };
      }),
    );
  }
}
