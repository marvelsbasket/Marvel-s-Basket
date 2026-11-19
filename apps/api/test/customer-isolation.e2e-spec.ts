import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { validationExceptionFactory } from '../src/common/pipes/validation-factory';
import { PrismaService } from '../src/database/prisma.service';
import { EmailService } from '../src/modules/email/email.service';

describe('Customer Data Isolation & Security (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;

  const timestamp = Date.now();
  const customerA = {
    name: 'Customer Alice',
    email: `alice.${timestamp}@example.com`,
    password: 'Password@Alice123!',
  };

  const customerB = {
    name: 'Customer Bob',
    email: `bob.${timestamp}@example.com`,
    password: 'Password@Bob123!',
  };

  let tokenA: string;
  let tokenB: string;
  let addressA1Id: string;
  let addressA2Id: string;

  let capturedOtpAlice: string | null = null;
  let capturedOtpBob: string | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
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

    prisma = app.get<PrismaService>(PrismaService);
    emailService = app.get<EmailService>(EmailService);

    jest
      .spyOn(emailService, 'sendVerificationOtpEmail')
      .mockImplementation(async (to, _name, otp) => {
        if (to === customerA.email) capturedOtpAlice = otp;
        if (to === customerB.email) capturedOtpBob = otp;
        return { success: true, messageId: 'mock-id' };
      });

    await app.init();

    // 1. Register & verify Customer A
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(customerA).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: customerA.email, otp: capturedOtpAlice })
      .expect(200);

    const loginResA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customerA.email, password: customerA.password })
      .expect(200);

    tokenA = loginResA.body.data.tokens.accessToken;

    // 2. Register & verify Customer B
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(customerB).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: customerB.email, otp: capturedOtpBob })
      .expect(200);

    const loginResB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customerB.email, password: customerB.password })
      .expect(200);

    tokenB = loginResB.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup created test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [customerA.email, customerB.email] },
      },
    });
    await app.close();
  });

  describe('Unauthenticated Access Controls', () => {
    it('should reject unauthenticated request to /api/v1/users/me with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('should reject unauthenticated request to /api/v1/addresses with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/addresses').expect(401);
    });
  });

  describe('Profile Isolation', () => {
    it('Customer A should retrieve their own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data.name).toBe(customerA.name);
      expect(res.body.data.email).toBe(customerA.email);
    });

    it('Customer B should retrieve their own profile, completely isolated from Customer A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body.data.name).toBe(customerB.name);
      expect(res.body.data.email).toBe(customerB.email);
    });

    it('Customer A updating their profile does not impact Customer B', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Alice In Wonderland' })
        .expect(200);

      const resB = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(resB.body.data.name).toBe(customerB.name);
    });
  });

  describe('Address Management & Strict Cross-Customer Isolation (No IDOR)', () => {
    it('Customer A creates Address A1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          label: 'Home',
          recipientName: 'Alice Residence',
          phone: '9876543210',
          addressLine1: 'Villa 101, Palm Avenue',
          city: 'Azamgarh',
          state: 'Uttar Pradesh',
          postalCode: '276001',
          isDefault: true,
        })
        .expect(201);

      addressA1Id = res.body.data.id;
      expect(addressA1Id).toBeDefined();
      expect(res.body.data.isDefault).toBe(true);
    });

    it('Customer B cannot view Customer A address in their address list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const addressIds = res.body.data.map((a: any) => a.id);
      expect(addressIds).not.toContain(addressA1Id);
    });

    it('Customer B cannot retrieve Customer A address directly by ID (IDOR prevention -> 404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('Customer B cannot update Customer A address (IDOR prevention -> 404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ recipientName: 'Malicious Bob' })
        .expect(404);

      // Verify Customer A's address recipient remains unchanged
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(checkRes.body.data.recipientName).toBe('Alice Residence');
    });

    it('Customer B cannot delete Customer A address (IDOR prevention -> 404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('Customer B cannot set Customer A address as default (IDOR prevention -> 404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/addresses/${addressA1Id}/default`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('Customer A creates Address A2 with isDefault: true, which safely unsets A1 default', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          label: 'Work',
          recipientName: 'Alice Office',
          phone: '9876543210',
          addressLine1: 'Tech Park, Floor 3',
          city: 'Azamgarh',
          state: 'Uttar Pradesh',
          postalCode: '276001',
          isDefault: true,
        })
        .expect(201);

      addressA2Id = res.body.data.id;
      expect(res.body.data.isDefault).toBe(true);

      // Verify A1 is now isDefault: false
      const a1Res = await request(app.getHttpServer())
        .get(`/api/v1/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(a1Res.body.data.isDefault).toBe(false);
    });

    it('Customer A deletes Address A2 (default), automatically promoting Address A1 to default', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/addresses/${addressA2Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // Verify A1 has been promoted to isDefault: true
      const a1Res = await request(app.getHttpServer())
        .get(`/api/v1/addresses/${addressA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(a1Res.body.data.isDefault).toBe(true);
    });
  });
});
