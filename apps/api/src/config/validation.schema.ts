import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(4000),

  API_PREFIX: Joi.string().default('api'),

  API_VERSION: Joi.string().default('1'),

  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is a required environment variable for database connectivity',
  }),

  REDIS_HOST: Joi.string().default('localhost'),

  REDIS_PORT: Joi.number().port().default(6380),

  REDIS_PASSWORD: Joi.string().allow('').optional(),

  REDIS_URL: Joi.string().uri().allow('').optional(),

  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),

  SWAGGER_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),

  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long for cryptographic security',
    'any.required': 'JWT_SECRET is a required environment variable',
  }),

  JWT_EXPIRES_IN: Joi.string().default('7d'),

  JWT_ACCESS_SECRET: Joi.string().min(32).optional(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),

  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),

  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  RESEND_API_KEY: Joi.string().default('re_dev_placeholder_api_key'),

  EMAIL_FROM: Joi.string().default("Marvel's Basket <noreply@marvelsbasket.com>"),

  EMAIL_VERIFICATION_OTP_LENGTH: Joi.number().min(4).max(8).default(6),

  EMAIL_VERIFICATION_OTP_TTL_SECONDS: Joi.number().min(60).max(3600).default(300),

  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: Joi.number().min(10).max(600).default(60),

  EMAIL_VERIFICATION_MAX_ATTEMPTS: Joi.number().min(1).max(10).default(5),

  PASSWORD_RESET_TOKEN_TTL_SECONDS: Joi.number().min(60).max(7200).default(900),

  EMAIL_OTP_ENABLED: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),

  DEV_LOG_EMAIL_OTP: Joi.boolean().truthy('true', '1').falsy('false', '0').default(true),

  DEV_SEND_REAL_EMAILS: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),

  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),

  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),

  ENCRYPTION_KEY: Joi.string().min(32).default('marvels-basket-aes256-default-key-32b!'),

  RAZORPAY_MODE: Joi.string().valid('test', 'live').default('test'),

  RAZORPAY_KEY_ID: Joi.string().allow('').optional(),

  RAZORPAY_KEY_SECRET: Joi.string().allow('').optional(),

  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  RAZORPAY_PREVIOUS_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  RAZORPAY_CURRENCY: Joi.string().valid('INR').default('INR'),

  RAZORPAY_CAPTURE_MODE: Joi.string().valid('automatic', 'manual').default('automatic'),

  COD_MAX_AMOUNT: Joi.number().min(100).max(50000).default(1500),
})
  .custom((value, helpers) => {
    const isProd = value.NODE_ENV === 'production';
    const mode = value.RAZORPAY_MODE || 'test';
    const keyId: string = value.RAZORPAY_KEY_ID || '';
    const keySecret: string = value.RAZORPAY_KEY_SECRET || '';
    const webhookSecret: string = value.RAZORPAY_WEBHOOK_SECRET || '';

    if (isProd && mode !== 'live') {
      return helpers.message({
        custom: 'RAZORPAY_MODE must be "live" when NODE_ENV is "production"',
      });
    }

    if (mode === 'live') {
      if (!keyId || !keyId.startsWith('rzp_live_')) {
        return helpers.message({
          custom: 'RAZORPAY_KEY_ID must be a valid Live Mode key (rzp_live_*) when RAZORPAY_MODE=live',
        });
      }
      if (!keySecret || keySecret.includes('placeholder')) {
        return helpers.message({
          custom: 'RAZORPAY_KEY_SECRET is required and cannot be a placeholder in live mode',
        });
      }
      if (!webhookSecret || webhookSecret.includes('placeholder')) {
        return helpers.message({
          custom: 'RAZORPAY_WEBHOOK_SECRET is required and cannot be a placeholder in live mode',
        });
      }
    }

    if (mode === 'test' && keyId.startsWith('rzp_live_')) {
      return helpers.message({
        custom: 'Live Razorpay key (rzp_live_*) cannot be used when RAZORPAY_MODE=test',
      });
    }

    return value;
  })
  .unknown(true);
