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

describe('Authentication & Authorization (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;

  const testUser = {
    name: 'E2E Test User',
    email: `e2e.test.${Date.now()}@example.com`,
    password: 'SecurePassword@2026!',
    newPassword: 'UpdatedPassword@2026!',
  };

  let capturedOtp: string | null = null;
  let capturedResetToken: string | null = null;

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

    // Spy on email delivery to capture OTP and Reset tokens
    jest
      .spyOn(emailService, 'sendVerificationOtpEmail')
      .mockImplementation(async (_to, _name, otp) => {
        capturedOtp = otp;
        return { success: true, messageId: 'mock-e2e-msg' };
      });

    jest
      .spyOn(emailService, 'sendPasswordResetEmail')
      .mockImplementation(async (_to, _name, link) => {
        const url = new URL(link);
        capturedResetToken = url.searchParams.get('token');
        return { success: true, messageId: 'mock-e2e-reset' };
      });

    await app.init();
  });

  afterAll(async () => {
    // Clean up test user and dependencies
    try {
      const user = await prisma.user.findFirst({
        where: { email: testUser.email },
      });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  describe('1. Registration & Email Verification Workflow', () => {
    it('POST /api/v1/auth/register - should successfully register a customer and dispatch OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.userId).toBeDefined();
      expect(capturedOtp).toMatch(/^\d{6}$/);
    });

    it('POST /api/v1/auth/register - should automatically handle existing unverified account and resend OTP (Scenario A)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Existing Rohan',
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isExistingUnverified).toBe(true);
      expect(response.body.data.requiresVerification).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('POST /api/v1/auth/login - should reject unverified login with incorrect password with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'IncorrectPassword@999',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/auth/login - should reject unverified login with correct password with 403 and return EMAIL_NOT_VERIFIED (Scenario B)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.requiresVerification).toBe(true);
    });

    it('POST /api/v1/auth/resend-verification-otp - should reject resend while cooldown is active with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification-otp')
        .send({
          email: testUser.email,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Please wait');
    });

    it('POST /api/v1/auth/verify-email - should reject invalid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUser.email,
          otp: '000000',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid verification code');
    });

    it('POST /api/v1/auth/verify-email - should successfully verify email with captured OTP', async () => {
      expect(capturedOtp).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testUser.email,
          otp: capturedOtp,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(true);
    });

    it('POST /api/v1/auth/register - should reject verified user registration with 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Verified User Duplicate',
          email: testUser.email,
          password: testUser.password,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CONFLICT');
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('2. Login, Sessions & Token Issuance', () => {
    let accessToken: string;
    let refreshToken: string;
    let refreshTokenCookie: string;

    it('POST /api/v1/auth/login - should authenticate verified user and set refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.roles).toContain('CUSTOMER');

      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;

      // Check HttpOnly cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      refreshTokenCookie = (cookies as unknown as string[]).find((c) =>
        c.startsWith('refreshToken='),
      )!;
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('GET /api/v1/auth/me - should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('GET /api/v1/auth/me - should return user profile with valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.roles).toContain('CUSTOMER');
    });

    it('POST /api/v1/auth/refresh - should rotate refresh token and issue new token pair', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);

      // Verify new token works
      const newAccessToken = response.body.data.tokens.accessToken;
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });

    it('POST /api/v1/auth/refresh - RFC 6749: should detect reuse of consumed refresh token and revoke family', async () => {
      // Attempt to reuse the FIRST refresh token that has already been rotated/consumed
      const reuseResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(reuseResponse.body.success).toBe(false);
      expect(reuseResponse.body.message).toContain('Refresh token reuse detected');
    });
  });

  describe('3. Password Reset Workflow', () => {
    it('POST /api/v1/auth/forgot-password - should process forgot password request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('password reset instructions');
      expect(capturedResetToken).toBeDefined();
    });

    it('POST /api/v1/auth/reset-password - should reject invalid or expired reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-non-existent-token-1234567890',
          newPassword: testUser.newPassword,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('invalid or has expired');
    });

    it('POST /api/v1/auth/reset-password - should successfully reset password with captured token', async () => {
      expect(capturedResetToken).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: capturedResetToken,
          newPassword: testUser.newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('reset successfully');
    });

    it('POST /api/v1/auth/login - should allow login with NEW password and reject old password', async () => {
      // Old password rejected
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // New password succeeds
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('4. Logout & Multi-Device Session Termination', () => {
    let accessToken: string;
    let refreshTokenCookie: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.newPassword,
      });

      accessToken = loginRes.body.data.tokens.accessToken;
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='))!;
    });

    it('POST /api/v1/auth/logout - should revoke refresh session and clear cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('logged out');

      // Attempting to refresh with the logged out cookie should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(401);
    });

    it('POST /api/v1/auth/logout-all - should revoke all active sessions for user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('terminated');
    });
  });
});
