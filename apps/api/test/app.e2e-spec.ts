import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { validationExceptionFactory } from '../src/common/pipes/validation-factory';
import { Reflector } from '@nestjs/core';

describe('Marvel Basket API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: validationExceptionFactory,
      }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());

    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    // Setup Swagger
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Marvel's Basket API")
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('/api/v1/health (GET) - returns 200 with standard response envelope', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.service).toBe('marvels-basket-api');
      expect(response.body.data.status).toBe('ok');
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('/api/v1/health/live (GET) - returns 200 process liveness', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });

    it('/api/v1/health/ready (GET) - returns 200 and infrastructure checks', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.checks.database.status).toBe('healthy');
      expect(response.body.data.checks.redis.status).toBe('healthy');
    });
  });

  describe('Correlation ID Middleware', () => {
    it('should propagate incoming x-correlation-id header', async () => {
      const customCorrelationId = 'custom-test-correlation-id-999';

      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('x-correlation-id', customCorrelationId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(customCorrelationId);
      expect(response.body.correlationId).toBe(customCorrelationId);
    });
  });

  describe('Swagger Documentation', () => {
    it('/api/docs (GET) - returns 200 HTML documentation', async () => {
      await request(app.getHttpServer()).get('/api/docs/').expect(200);
    });

    it('/api/docs-json (GET) - returns valid OpenAPI 3 specification', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

      expect(response.body.openapi).toBe('3.0.0');
      expect(response.body.info.title).toBe("Marvel's Basket API");
      expect(response.body.paths['/api/v1/health']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error envelope for non-existent routes (404)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
      expect(response.body.correlationId).toBeDefined();
      expect(response.body.path).toBe('/api/v1/unknown-endpoint');
    });
  });
});
