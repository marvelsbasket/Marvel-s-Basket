import { RootConfig } from './config.interface';

export default (): RootConfig => ({
  app: {
    nodeEnv: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    apiVersion: process.env.API_VERSION || '1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || 're_dev_placeholder_api_key',
    from: process.env.EMAIL_FROM || "Marvel's Basket <noreply@marvelsbasket.com>",
    otpLength: parseInt(process.env.EMAIL_VERIFICATION_OTP_LENGTH || '6', 10),
    otpTtlSeconds: parseInt(process.env.EMAIL_VERIFICATION_OTP_TTL_SECONDS || '300', 10),
    resendCooldownSeconds: parseInt(
      process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS || '60',
      10,
    ),
    maxAttempts: parseInt(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || '5', 10),
    passwordResetTtlSeconds: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS || '900', 10),
    emailOtpEnabled: process.env.EMAIL_OTP_ENABLED !== 'false',
    devLogEmailOtp:
      process.env.NODE_ENV !== 'production' &&
      (process.env.DEV_LOG_EMAIL_OTP === 'true' ||
        (process.env.NODE_ENV === 'development' && process.env.DEV_LOG_EMAIL_OTP !== 'false')),
    devSendRealEmails:
      process.env.NODE_ENV !== 'production' && process.env.DEV_SEND_REAL_EMAILS === 'true',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'marvels-basket-aes256-default-key-32b!',
  },
  razorpay: {
    mode: (process.env.RAZORPAY_MODE as 'test' | 'live') || 'test',
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    previousWebhookSecret: process.env.RAZORPAY_PREVIOUS_WEBHOOK_SECRET || undefined,
    currency: (process.env.RAZORPAY_CURRENCY || 'INR').toUpperCase(),
    captureMode: (process.env.RAZORPAY_CAPTURE_MODE as 'automatic' | 'manual') || 'automatic',
    codMaxAmount: parseInt(process.env.COD_MAX_AMOUNT || '1500', 10),
  },
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
    inAppEnabled: process.env.NOTIFICATIONS_IN_APP_ENABLED !== 'false',
    emailEnabled: process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'false',
    smsEnabled: process.env.NOTIFICATIONS_SMS_ENABLED === 'true',
    pushEnabled: process.env.NOTIFICATIONS_PUSH_ENABLED === 'true',
    devMode:
      process.env.NODE_ENV !== 'production' && process.env.NOTIFICATIONS_DEV_MODE !== 'false',
    logContent:
      process.env.NODE_ENV !== 'production' && process.env.NOTIFICATIONS_LOG_CONTENT === 'true',
    resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
  },
});
