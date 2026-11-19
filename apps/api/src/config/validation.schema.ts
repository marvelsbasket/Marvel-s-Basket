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
}).unknown(true);
