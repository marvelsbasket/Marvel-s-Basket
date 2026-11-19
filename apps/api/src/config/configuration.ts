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
  },
});
