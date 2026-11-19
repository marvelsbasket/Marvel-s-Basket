import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: ExecutionContext;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    interceptor = new TransformInterceptor(reflector);

    mockResponse = {
      statusCode: 200,
      headersSent: false,
      getHeader: jest.fn().mockReturnValue('test-cid-123'),
    };

    mockRequest = {
      originalUrl: '/api/v1/test',
      url: '/api/v1/test',
      correlationId: 'test-cid-123',
    };

    mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  });

  it('should wrap standard payload in ApiSuccessResponse envelope', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const callHandler: CallHandler = {
      handle: () => of({ name: 'Marvel Item', price: 99 }),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result: any) => {
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Request completed successfully');
      expect(result.data).toEqual({ name: 'Marvel Item', price: 99 });
      expect(result.correlationId).toBe('test-cid-123');
      expect(result.path).toBe('/api/v1/test');
      expect(typeof result.timestamp).toBe('string');
      done();
    });
  });

  it('should bypass transformation when @BypassTransform() is present', (done) => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === 'custom:bypass_transform') return true;
      return undefined;
    });

    const rawData = Buffer.from('raw-file-content');
    const callHandler: CallHandler = {
      handle: () => of(rawData),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result: any) => {
      expect(result).toBe(rawData);
      done();
    });
  });

  it('should use custom message when @ResponseMessage() is provided', (done) => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === 'custom:response_message') return 'Custom Success Message';
      return undefined;
    });

    const callHandler: CallHandler = {
      handle: () => of({ id: 1 }),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result: any) => {
      expect(result.message).toBe('Custom Success Message');
      done();
    });
  });
});
