import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validationExceptionFactory } from './common/pipes/validation-factory';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 4000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', '1');
  const corsOrigin = configService.get<string>('app.corsOrigin', 'http://localhost:3000');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled', true);

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Request body limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 3. Global Route Prefix and URI Versioning
  const normalizedPrefix = apiPrefix.replace(/\/v\d+$/, '');
  app.setGlobalPrefix(normalizedPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  // 4. CORS Configuration
  const allowedOrigins = corsOrigin.includes(',')
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : corsOrigin;

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 5. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // 6. Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 7. Global Interceptors (Logging + Standardized Response Envelope)
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor(reflector));

  // 8. OpenAPI / Swagger Documentation
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Marvel's Basket API")
      .setDescription(
        'Hyperlocal Multi-Vendor Grocery & Essentials Marketplace Backend API Documentation',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT bearer token for authorized operations',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Health', 'System health and infrastructure readiness monitoring')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: "Marvel's Basket API Documentation",
      jsonDocumentUrl: 'api/docs-json',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    });
  }

  // 9. Graceful Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log('================================================================');
  logger.log(
    ` Marvel's Basket API running on: http://localhost:${port}/${normalizedPrefix}/v${apiVersion}`,
  );
  logger.log(
    ` Health Endpoint:               http://localhost:${port}/${normalizedPrefix}/v${apiVersion}/health`,
  );
  logger.log(
    ` Liveness Probe:                http://localhost:${port}/${normalizedPrefix}/v${apiVersion}/health/live`,
  );
  logger.log(
    ` Readiness Probe:               http://localhost:${port}/${normalizedPrefix}/v${apiVersion}/health/ready`,
  );
  if (swaggerEnabled) {
    logger.log(` Swagger Documentation:         http://localhost:${port}/api/docs`);
    logger.log(` OpenAPI JSON Specification:    http://localhost:${port}/api/docs-json`);
  }
  logger.log(` Environment:                   ${nodeEnv}`);
  logger.log('================================================================');
}

bootstrap();
