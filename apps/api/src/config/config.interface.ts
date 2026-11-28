export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  apiVersion: string;
  corsOrigin: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  swaggerEnabled: boolean;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  url?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface EmailConfig {
  resendApiKey: string;
  from: string;
  otpLength: number;
  otpTtlSeconds: number;
  resendCooldownSeconds: number;
  maxAttempts: number;
  passwordResetTtlSeconds: number;
  emailOtpEnabled: boolean;
  devLogEmailOtp: boolean;
  devSendRealEmails: boolean;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface SecurityConfig {
  encryptionKey: string;
}

export interface RazorpayConfig {
  mode: 'test' | 'live';
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  previousWebhookSecret?: string;
  currency: string;
  captureMode: 'automatic' | 'manual';
  codMaxAmount: number;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  email: EmailConfig;
  cloudinary: CloudinaryConfig;
  security: SecurityConfig;
  razorpay: RazorpayConfig;
}
