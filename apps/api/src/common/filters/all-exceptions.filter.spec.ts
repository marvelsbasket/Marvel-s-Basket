import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../constants';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeader: jest.fn().mockReturnValue('test-correlation-id'),
    };

    mockRequest = {
      url: '/api/v1/test',
      originalUrl: '/api/v1/test',
      correlationId: 'req-correlation-id',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should format standard HttpException properly', () => {
    const exception = new NotFoundException('Resource was not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.NOT_FOUND,
        message: 'Resource was not found',
        correlationId: 'req-correlation-id',
        path: '/api/v1/test',
      }),
    );
  });

  it('should format validation BadRequestException with field errors', () => {
    const exception = new BadRequestException({
      message: 'Request validation failed',
      errors: [{ field: 'email', message: 'email must be an email' }],
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        errors: [{ field: 'email', message: 'email must be an email' }],
      }),
    );
  });

  it('should preserve explicit custom error code and data payload from HttpException', () => {
    const exception = new BadRequestException({
      statusCode: HttpStatus.FORBIDDEN,
      code: ErrorCode.EMAIL_NOT_VERIFIED,
      message: 'Your email is not verified.',
      data: { email: 'user@example.com', requiresVerification: true },
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCode.EMAIL_NOT_VERIFIED,
        message: 'Your email is not verified.',
        data: { email: 'user@example.com', requiresVerification: true },
      }),
    );
  });

  it('should handle unhandled Error with 500 status and INTERNAL_SERVER_ERROR code', () => {
    const exception = new Error('Unexpected database failure');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      }),
    );
  });
});
