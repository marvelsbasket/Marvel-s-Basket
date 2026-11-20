import {
  AuthUser,
  LoginRequest,
  LoginResponseData,
  RegisterRequest,
  VerifyEmailRequest,
} from '@marvels-basket/shared';
import { api } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { RegisterResponseData } from '../types';

const ACCESS_TOKEN_KEY = 'mb_access_token';

export const authService = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setToken(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      api.setAccessToken(token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      api.setAccessToken(null);
    }
  },

  initToken(): string | null {
    const token = this.getToken();
    if (token) {
      api.setAccessToken(token);
    }
    return token;
  },

  async login(credentials: LoginRequest): Promise<LoginResponseData> {
    const response = await api.post<LoginResponseData>(ENDPOINTS.AUTH.LOGIN, credentials);
    if (response.data?.tokens?.accessToken) {
      this.setToken(response.data.tokens.accessToken);
    }
    return response.data;
  },

  async register(data: RegisterRequest): Promise<RegisterResponseData> {
    const response = await api.post<RegisterResponseData>(ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },

  async verifyEmail(data: VerifyEmailRequest): Promise<unknown> {
    const response = await api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, data);
    return response.data;
  },

  async resendOtp(email: string): Promise<unknown> {
    const response = await api.post(ENDPOINTS.AUTH.RESEND_OTP, { email });
    return response.data;
  },

  async getMe(): Promise<AuthUser> {
    const response = await api.get<AuthUser>(ENDPOINTS.AUTH.ME);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Ignore network failures on logout
    } finally {
      this.setToken(null);
    }
  },
};
