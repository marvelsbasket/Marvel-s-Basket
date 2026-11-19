import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../constants';
import { ApiErrorResponse, FieldError, RequestWithCorrelation } from '../interfaces';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelation>();

    const correlationId =
      request.correlationId || (response.getHeader('x-correlation-id') as string) || 'unknown';
    const path = request.originalUrl || request.url || '';
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred';
    let errors: FieldError[] | undefined = undefined;

    // 1. NestJS HttpException (including BadRequestException from ValidationPipe)
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message =
          (typeof resp.message === 'string' ? resp.message : undefined) || exception.message;

        // Custom validation error format from ValidationPipe
        if (resp.errors && Array.isArray(resp.errors)) {
          errors = resp.errors as FieldError[];
          code = ErrorCode.VALIDATION_ERROR;
        } else if (Array.isArray(resp.message)) {
          // Standard class-validator string array
          errors = (resp.message as unknown[]).map((msg) => {
            const strMsg = String(msg);
            const firstSpace = strMsg.indexOf(' ');
            const field = firstSpace > -1 ? strMsg.substring(0, firstSpace) : 'request';
            return { field, message: strMsg };
          });
          code = ErrorCode.VALIDATION_ERROR;
          message = 'Request validation failed';
        }
      }

      // Map standard HTTP status codes to application error codes
      code = this.mapHttpStatusToErrorCode(statusCode, code);
    }
    // 2. Prisma Database Known Request Errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      statusCode = prismaError.statusCode;
      code = prismaError.code;
      message = prismaError.message;
    }
    // 3. Prisma Initialization / Validation Errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = ErrorCode.DATABASE_ERROR;
      message = 'Database query validation error';
    }
    // 4. Unexpected Runtime Errors
    else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'production'
          ? 'An internal error occurred while processing your request'
          : exception.message;

      this.logger.error(
        `[${correlationId}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `[${correlationId}] Unknown Non-Error Exception: ${JSON.stringify(exception)}`,
      );
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode,
      code,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      timestamp,
      path,
      correlationId,
    };

    response.status(statusCode).json(errorPayload);
  }

  private mapHttpStatusToErrorCode(status: number, defaultCode: ErrorCode): ErrorCode {
    if (defaultCode === ErrorCode.VALIDATION_ERROR) {
      return defaultCode;
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    code: ErrorCode;
    message: string;
  } {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ErrorCode.CONFLICT,
          message: `Unique constraint violation on ${target}. Record already exists.`,
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: 'The requested resource was not found.',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: ErrorCode.BAD_REQUEST,
          message: 'Foreign key constraint failed. Related record does not exist.',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.DATABASE_ERROR,
          message: 'Database transaction error occurred.',
        };
    }
  }
}
