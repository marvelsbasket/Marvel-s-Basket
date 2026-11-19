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
} as const;
