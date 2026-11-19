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
  },
});
