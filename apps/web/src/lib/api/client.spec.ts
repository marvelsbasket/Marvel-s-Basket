import { ApiClient } from './client';
import { ApiError } from './errors';

describe('ApiClient', () => {
  let client: ApiClient;
  const mockBaseUrl = 'https://api.marvelsbasket.test/api/v1';

  beforeEach(() => {
    client = new ApiClient({ baseUrl: mockBaseUrl, defaultTimeoutMs: 1000 });
    jest.restoreAllMocks();
  });

  it('initializes with custom baseUrl and default timeout', () => {
    expect(client.getAccessToken()).toBeNull();
  });

  it('manages access token state correctly', () => {
    client.setAccessToken('sample-jwt-token');
    expect(client.getAccessToken()).toBe('sample-jwt-token');

    client.setAccessToken(null);
    expect(client.getAccessToken()).toBeNull();
  });

  it('executes successful GET request and deserializes response', async () => {
    const mockPayload = {
      success: true,
      statusCode: 200,
      message: 'OK',
      data: { status: 'healthy' },
      timestamp: new Date().toISOString(),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayload,
    });

    const res = await client.get('/health');
    expect(res).toEqual(mockPayload);
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/health`,
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it('appends query parameters to request URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: [] }),
    });

    await client.get('/stores', { params: { query: 'groceries', limit: 10, page: 1 } });

    expect(global.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/stores?query=groceries&limit=10&page=1`,
      expect.any(Object),
    );
  });

  it('attaches Authorization header when access token is set', async () => {
    client.setAccessToken('test-auth-token');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { user: 'Alice' } }),
    });

    await client.get('/auth/me');

    const lastCall = (global.fetch as jest.Mock).mock.calls[0];
    const headers = lastCall[1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-auth-token');
  });

  it('serializes JSON body on POST requests', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { id: 'item-1' } }),
    });

    const body = { name: 'Item One', quantity: 2 };
    await client.post('/items', body);

    const lastCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(lastCall[1].method).toBe('POST');
    expect(lastCall[1].body).toBe(JSON.stringify(body));
    const headers = lastCall[1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError on HTTP error status with parsed response', async () => {
    const errorBody = {
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'email', message: 'Invalid email format' }],
      correlationId: 'req-12345',
      timestamp: new Date().toISOString(),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorBody,
    });

    await expect(client.get('/error-test')).rejects.toThrow(ApiError);

    try {
      await client.get('/error-test');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.message).toBe('Validation failed');
      expect(apiErr.isClientError).toBe(true);
      expect(apiErr.isValidationError).toBe(true);
      expect(apiErr.errors).toHaveLength(1);
    }
  });

  it('parses EMAIL_NOT_VERIFIED error with payload data', async () => {
    const errorBody = {
      success: false,
      statusCode: 403,
      message: 'Your email is not verified.',
      code: 'EMAIL_NOT_VERIFIED',
      data: {
        email: 'unverified@example.com',
        requiresVerification: true,
        cooldownRemainingSeconds: 45,
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorBody,
    });

    try {
      await client.post('/auth/login', {
        email: 'unverified@example.com',
        password: 'Password@123',
      });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.code).toBe('EMAIL_NOT_VERIFIED');
      expect(apiErr.isEmailNotVerified).toBe(true);
      expect(apiErr.data).toEqual(errorBody.data);
    }
  });

  it('throws ApiError with code REQUEST_TIMEOUT when request aborts', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(client.get('/timeout-test')).rejects.toMatchObject({
      statusCode: 408,
      code: 'REQUEST_TIMEOUT',
    });
  });

  it('throws ApiError with code NETWORK_ERROR on unexpected error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    await expect(client.get('/network-fail')).rejects.toMatchObject({
      statusCode: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
