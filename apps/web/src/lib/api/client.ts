import { env } from '../config/env';
import { ApiError } from './errors';
import { ApiErrorResponse, ApiResponse, RequestOptions } from './types';

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private accessToken: string | null = null;

  constructor(config?: { baseUrl?: string; defaultTimeoutMs?: number }) {
    this.baseUrl = config?.baseUrl || env.apiUrl;
    this.defaultTimeoutMs = config?.defaultTimeoutMs || 15000;
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      body,
      params,
      headers: customHeaders,
      timeoutMs = this.defaultTimeoutMs,
      ...fetchOptions
    } = options;

    // Construct URL with query parameters
    let urlString = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    if (params) {
      const url = new URL(urlString);
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
      urlString = url.toString();
    }

    // Set up standard headers
    const headers = new Headers(customHeaders);
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach Bearer token if available
    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    // Configure AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(urlString, {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'include', // Ensure HttpOnly cookies are transported
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
          this.setAccessToken(null);
          try {
            localStorage.removeItem('mb_access_token');
          } catch {
            // Ignore storage access errors
          }
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        const errorData = data as ApiErrorResponse | null;
        throw new ApiError({
          message: errorData?.message || `Request failed with status ${response.status}`,
          statusCode: errorData?.statusCode || response.status,
          code: errorData?.code || 'HTTP_ERROR',
          errors: errorData?.errors,
          correlationId:
            errorData?.correlationId || response.headers.get('x-correlation-id') || undefined,
          timestamp: errorData?.timestamp,
        });
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiError({
          message: `Request timed out after ${timeoutMs}ms`,
          statusCode: 408,
          code: 'REQUEST_TIMEOUT',
        });
      }

      throw new ApiError({
        message:
          err instanceof Error
            ? err.message
            : 'A network error occurred. Please check your connection.',
        statusCode: 0,
        code: 'NETWORK_ERROR',
      });
    }
  }

  public get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  public delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
