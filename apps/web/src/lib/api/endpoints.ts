/**
 * Centralized API Endpoints Directory
 * Mirrors backend routes in apps/api (Version 1).
 */

export const ENDPOINTS = {
  HEALTH: {
    ROOT: '/health',
    LIVE: '/health/live',
    READY: '/health/ready',
  },
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_OTP: '/auth/resend-verification-otp',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    LOGOUT_ALL: '/auth/logout-all',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
  },
  USERS: {
    ME: '/users/me',
    ACCOUNT: '/users/me/account',
    PREFERENCES: '/users/me/preferences',
    DEACTIVATE: '/users/me/deactivate',
  },
  ADDRESSES: {
    LIST: '/addresses',
    CREATE: '/addresses',
    DETAIL: (id: string) => `/addresses/${id}`,
    UPDATE: (id: string) => `/addresses/${id}`,
    DELETE: (id: string) => `/addresses/${id}`,
    SET_DEFAULT: (id: string) => `/addresses/${id}/default`,
  },
} as const;
