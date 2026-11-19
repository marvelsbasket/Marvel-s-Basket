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
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
}
