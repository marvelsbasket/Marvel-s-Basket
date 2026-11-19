import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { RequestWithCorrelation } from '../interfaces';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<RequestWithCorrelation>();
    const res = httpContext.getResponse<Response>();

    const { method, originalUrl, correlationId } = req;
    const startTime = req.startTime || Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;
          this.logger.log(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} +${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || (error.getStatus ? error.getStatus() : 500);
          this.logger.error(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} +${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
