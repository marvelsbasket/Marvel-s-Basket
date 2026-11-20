import configuration from './configuration';
import { environmentValidationSchema } from './validation.schema';

describe('Environment Validation Schema', () => {
  const validBaseConfig = {
    NODE_ENV: 'test',
    PORT: 4000,
    API_PREFIX: 'api',
    API_VERSION: '1',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    CORS_ORIGIN: 'http://localhost:3000',
    JWT_SECRET: 'a_very_long_secret_key_minimum_32_characters_length_requirement',
    JWT_EXPIRES_IN: '7d',
    SWAGGER_ENABLED: true,
  };

  it('should validate a complete and correct environment configuration', () => {
    const { error, value } = environmentValidationSchema.validate(validBaseConfig);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(4000);
    expect(value.NODE_ENV).toBe('test');
  });

  it('should fail validation when DATABASE_URL is missing', () => {
    const invalidConfig = { ...validBaseConfig };
    delete (invalidConfig as any).DATABASE_URL;

    const { error } = environmentValidationSchema.validate(invalidConfig);

    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL is a required environment variable');
  });

  it('should fail validation when JWT_SECRET is shorter than 32 characters', () => {
    const invalidConfig = {
      ...validBaseConfig,
      JWT_SECRET: 'short_secret',
    };

    const { error } = environmentValidationSchema.validate(invalidConfig);

    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_SECRET must be at least 32 characters long');
  });

  it('should assign default values for optional environment variables', () => {
    const minimalConfig = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a_very_long_secret_key_minimum_32_characters_length_requirement',
    };

    const { error, value } = environmentValidationSchema.validate(minimalConfig);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(4000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.API_PREFIX).toBe('api');
    expect(value.API_VERSION).toBe('1');
    expect(value.SWAGGER_ENABLED).toBe(true);
    expect(value.EMAIL_OTP_ENABLED).toBe(true);
    expect(value.DEV_LOG_EMAIL_OTP).toBe(true);
    expect(value.DEV_SEND_REAL_EMAILS).toBe(false);
  });

  describe('Central Configuration Production Safety (configuration.ts)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('CRITICAL: must NEVER allow devLogEmailOtp in production even if DEV_LOG_EMAIL_OTP=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEV_LOG_EMAIL_OTP = 'true';
      process.env.JWT_SECRET = 'a_very_long_secret_key_minimum_32_characters_length_requirement';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/db';

      const config = configuration();

      expect(config.app.nodeEnv).toBe('production');
      expect(config.email.devLogEmailOtp).toBe(false);
    });

    it('should enable devLogEmailOtp by default in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DEV_LOG_EMAIL_OTP;
      process.env.JWT_SECRET = 'a_very_long_secret_key_minimum_32_characters_length_requirement';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/db';

      const config = configuration();

      expect(config.app.nodeEnv).toBe('development');
      expect(config.email.devLogEmailOtp).toBe(true);
    });

    it('should allow disabling devLogEmailOtp in development when DEV_LOG_EMAIL_OTP=false', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_LOG_EMAIL_OTP = 'false';
      process.env.JWT_SECRET = 'a_very_long_secret_key_minimum_32_characters_length_requirement';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/db';

      const config = configuration();

      expect(config.email.devLogEmailOtp).toBe(false);
    });
  });
});
