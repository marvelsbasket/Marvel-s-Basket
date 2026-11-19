import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Set global API route prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Enable global request validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(` Marvel's Basket API running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(` Health endpoint: http://localhost:${port}/${apiPrefix}/health`);
  logger.log(` Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
  logger.log(`====================================================`);
}

bootstrap();
