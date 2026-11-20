import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRoleType, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { RedisService } from '../../cache/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { ErrorCode } from '../../common/constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let redisService: any;
  let emailService: any;

  const mockUser = {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Test Customer',
    email: 'customer@test.com',
    phone: '+919876543210',
    passwordHash: '',
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    deletedAt: null,
    userRoles: [
      {
        role: {
          name: 'CUSTOMER',
          roleType: UserRoleType.CUSTOMER,
          rolePermissions: [],
        },
      },
    ],
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('SecurePass@2026!');
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'u1' }),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'b0000000-0000-0000-0000-000000000001',
          name: 'CUSTOMER',
          roleType: UserRoleType.CUSTOMER,
        }),
        create: jest.fn(),
      },
      verificationToken: {
        create: jest.fn().mockResolvedValue({ id: 'v1' }),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      session: {
        create: jest.fn().mockResolvedValue({ id: 's1' }),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 's1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    };

    configService = {
      get: jest.fn((key: string) => {
        const configMap: Record<string, any> = {
          'jwt.accessSecret': 'test-access-secret-minimum-32-characters-long',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-minimum-32-characters-long',
          'jwt.refreshExpiresIn': '7d',
          'email.verificationOtpExpirySeconds': 300,
          'email.verificationCooldownSeconds': 60,
          'app.frontendUrl': 'http://localhost:3000',
        };
        return configMap[key];
      }),
    };

    const redisStore: Record<string, string> = {};
    redisService = {
      get: jest.fn(async (key: string) => redisStore[key] || null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore[key] = val;
      }),
      del: jest.fn(async (key: string) => {
        delete redisStore[key];
      }),
      incr: jest.fn(async (key: string) => {
        const val = parseInt(redisStore[key] || '0', 10) + 1;
        redisStore[key] = val.toString();
        return val;
      }),
      expire: jest.fn().mockResolvedValue(true),
      ttl: jest.fn(async (key: string) => (redisStore[key] ? 45 : -2)),
      _store: redisStore,
    };

    emailService = {
      sendVerificationOtpEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'm1' }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'm2' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('Registration & Email OTP', () => {
    it('should register a new customer and dispatch verification OTP', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null); // No existing email
      prisma.user.create.mockResolvedValueOnce({
        id: 'user-123',
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
      });

      const result = await service.register({
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        password: 'Password@123',
      });

      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('rohan@example.com');
      expect(emailService.sendVerificationOtpEmail).toHaveBeenCalledWith(
        'rohan@example.com',
        'Rohan Sharma',
        expect.stringMatching(/^\d{6}$/),
        5,
      );
      expect(redisService.set).toHaveBeenCalledWith(
        'otp:verify-email:rohan@example.com',
        expect.any(String),
        300,
      );
    });

    it('should reject registration if email is already verified', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'existing-1',
        email: 'rohan@example.com',
        emailVerifiedAt: new Date(),
      });

      await expect(
        service.register({
          name: 'Rohan',
          email: 'rohan@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should automatically resend fresh OTP when an existing unverified email registers again (Scenario A)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'existing-unverified-1',
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        emailVerifiedAt: null,
      });

      redisService.ttl.mockResolvedValueOnce(-2); // Cooldown expired

      const result = await service.register({
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        password: 'Password@123',
      });

      expect(result.userId).toBe('existing-unverified-1');
      expect(result.isExistingUnverified).toBe(true);
      expect(result.requiresVerification).toBe(true);
      expect(result.message).toContain(
        'An account with this email already exists but is not verified',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.verificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'existing-unverified-1',
            usedAt: null,
          }),
        }),
      );
      expect(emailService.sendVerificationOtpEmail).toHaveBeenCalledWith(
        'rohan@example.com',
        'Rohan Sharma',
        expect.stringMatching(/^\d{6}$/),
        5,
      );
    });

    it('should return active cooldown if existing unverified user registers during cooldown', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'existing-unverified-1',
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        emailVerifiedAt: null,
      });

      redisService.ttl.mockResolvedValueOnce(45); // 45 seconds remaining

      const result = await service.register({
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        password: 'Password@123',
      });

      expect(result.userId).toBe('existing-unverified-1');
      expect(result.isExistingUnverified).toBe(true);
      expect(result.cooldownRemainingSeconds).toBe(45);
      expect(emailService.sendVerificationOtpEmail).not.toHaveBeenCalled();
    });

    it('should successfully verify email with valid OTP', async () => {
      const email = 'rohan@example.com';
      const otp = '123456';
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        email,
        emailVerifiedAt: null,
      });

      redisService._store[`otp:verify-email:${email}`] = otpHash;

      const result = await service.verifyEmail({ email, otp });

      expect(result.verified).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
        }),
      );
    });

    it('should reject invalid OTP and increment attempt counter', async () => {
      const email = 'rohan@example.com';
      const otpHash = crypto.createHash('sha256').update('123456').digest('hex');

      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        email,
        emailVerifiedAt: null,
      });

      redisService._store[`otp:verify-email:${email}`] = otpHash;

      await expect(service.verifyEmail({ email, otp: '999999' })).rejects.toThrow(
        BadRequestException,
      );

      expect(redisService.incr).toHaveBeenCalledWith(`otp:attempts:verify-email:${email}`);
    });

    it('should invalidate OTP when maximum attempts (5) are reached', async () => {
      const email = 'rohan@example.com';
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        email,
        emailVerifiedAt: null,
      });

      redisService._store[`otp:attempts:verify-email:${email}`] = '5';
      redisService._store[`otp:verify-email:${email}`] = 'hash';

      await expect(service.verifyEmail({ email, otp: '123456' })).rejects.toThrow(
        BadRequestException,
      );

      expect(redisService.del).toHaveBeenCalledWith(`otp:verify-email:${email}`);
    });

    it('should enforce cooldown on resend verification OTP', async () => {
      const email = 'rohan@example.com';
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        email,
        emailVerifiedAt: null,
      });

      redisService._store[`otp:cooldown:verify-email:${email}`] = '1';

      await expect(service.resendVerificationOtp(email)).rejects.toThrow(BadRequestException);
    });

    it('should NEVER include OTP value in registration API response', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user-no-otp',
        name: 'Safe User',
        email: 'safe@example.com',
      });

      const result = await service.register({
        name: 'Safe User',
        email: 'safe@example.com',
        password: 'Password@123',
      });

      expect((result as any).otp).toBeUndefined();
      expect((result as any).token).toBeUndefined();
      expect(result.message).toContain('Registration successful');
    });

    it('should log OTP to terminal in development when devLogEmailOtp is true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Create a service instance with devLogEmailOtp = true and nodeEnv = 'development'
      configService.get.mockImplementation((key: string) => {
        const configMap: Record<string, any> = {
          'app.nodeEnv': 'development',
          'email.emailOtpEnabled': true,
          'email.devLogEmailOtp': true,
          'jwt.accessSecret': 'test-access-secret-minimum-32-characters-long',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-minimum-32-characters-long',
          'jwt.refreshExpiresIn': '7d',
          'email.verificationOtpExpirySeconds': 300,
          'email.verificationCooldownSeconds': 60,
        };
        return configMap[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: configService },
          { provide: RedisService, useValue: redisService },
          { provide: EmailService, useValue: emailService },
        ],
      }).compile();

      const devAuthService = module.get<AuthService>(AuthService);

      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'dev-user-1',
        name: 'Dev User',
        email: 'dev@marvelsbasket.com',
      });

      await devAuthService.register({
        name: 'Dev User',
        email: 'dev@marvelsbasket.com',
        password: 'Password@123',
      });

      expect(consoleSpy).toHaveBeenCalled();
      const loggedBox = consoleSpy.mock.calls.find((call) =>
        String(call[0]).includes('[DEV EMAIL OTP]'),
      );
      expect(loggedBox).toBeDefined();
      expect(loggedBox![0]).toContain('Purpose: Email Verification');
      expect(loggedBox![0]).toContain('Email: dev@marvelsbasket.com');
      expect(loggedBox![0]).toMatch(/OTP: \d{6}/);

      consoleSpy.mockRestore();
    });

    it('CRITICAL: should NEVER log OTP in production even if devLogEmailOtp is misconfigured', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      configService.get.mockImplementation((key: string) => {
        const configMap: Record<string, any> = {
          'app.nodeEnv': 'production',
          'email.emailOtpEnabled': true,
          'email.devLogEmailOtp': true, // Misconfigured flag in prod!
          'jwt.accessSecret': 'test-access-secret-minimum-32-characters-long',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-minimum-32-characters-long',
          'jwt.refreshExpiresIn': '7d',
          'email.verificationOtpExpirySeconds': 300,
          'email.verificationCooldownSeconds': 60,
        };
        return configMap[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: configService },
          { provide: RedisService, useValue: redisService },
          { provide: EmailService, useValue: emailService },
        ],
      }).compile();

      const prodAuthService = module.get<AuthService>(AuthService);

      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'prod-user-1',
        name: 'Prod User',
        email: 'prod@marvelsbasket.com',
      });

      await prodAuthService.register({
        name: 'Prod User',
        email: 'prod@marvelsbasket.com',
        password: 'Password@123',
      });

      const loggedBox = consoleSpy.mock.calls.find((call) =>
        String(call[0]).includes('[DEV EMAIL OTP]'),
      );
      expect(loggedBox).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should auto-verify user on registration if emailOtpEnabled is false', async () => {
      configService.get.mockImplementation((key: string) => {
        const configMap: Record<string, any> = {
          'app.nodeEnv': 'development',
          'email.emailOtpEnabled': false,
          'email.devLogEmailOtp': false,
          'jwt.accessSecret': 'test-access-secret-minimum-32-characters-long',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-minimum-32-characters-long',
          'jwt.refreshExpiresIn': '7d',
          'email.verificationOtpExpirySeconds': 300,
          'email.verificationCooldownSeconds': 60,
        };
        return configMap[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: configService },
          { provide: RedisService, useValue: redisService },
          { provide: EmailService, useValue: emailService },
        ],
      }).compile();

      const noOtpAuthService = module.get<AuthService>(AuthService);

      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'no-otp-user',
        name: 'No Otp User',
        email: 'nootp@example.com',
      });

      const result = await noOtpAuthService.register({
        name: 'No Otp User',
        email: 'nootp@example.com',
        password: 'Password@123',
      });

      expect(result.message).toContain('Email verification is disabled');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'no-otp-user' },
          data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
        }),
      );
      expect(emailService.sendVerificationOtpEmail).not.toHaveBeenCalled();
    });
  });

  describe('Login & Session Management', () => {
    it('should authenticate valid user and issue JWT and refresh token', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUser);

      const result = await service.login(
        { email: 'customer@test.com', password: 'SecurePass@2026!' },
        { ipAddress: '127.0.0.1', userAgent: 'JestTest' },
      );

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toHaveLength(80);
      expect(result.user.email).toBe('customer@test.com');
      expect(result.user.roles).toContain(UserRoleType.CUSTOMER);
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('should reject login if password does not match', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: 'customer@test.com', password: 'WrongPassword@123' }, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login for unverified user with correct password and automatically dispatch OTP (Scenario B)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUser,
        emailVerifiedAt: null,
      });

      redisService.ttl.mockResolvedValueOnce(-2); // Cooldown expired

      let caughtError: any;
      try {
        await service.login({ email: 'customer@test.com', password: 'SecurePass@2026!' }, {});
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ForbiddenException);
      const resp = caughtError.getResponse();
      expect(resp.code).toBe(ErrorCode.EMAIL_NOT_VERIFIED);
      expect(resp.data.requiresVerification).toBe(true);
      expect(resp.data.email).toBe('customer@test.com');
      expect(resp.data.cooldownRemainingSeconds).toBe(60);
      expect(emailService.sendVerificationOtpEmail).toHaveBeenCalledWith(
        'customer@test.com',
        mockUser.name,
        expect.stringMatching(/^\d{6}$/),
        5,
      );
    });

    it('should NOT dispatch OTP on login if password is incorrect for unverified user', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUser,
        emailVerifiedAt: null,
      });

      await expect(
        service.login({ email: 'customer@test.com', password: 'WrongPassword@123' }, {}),
      ).rejects.toThrow(UnauthorizedException);

      expect(emailService.sendVerificationOtpEmail).not.toHaveBeenCalled();
    });

    it('should return active cooldown on login for unverified user without dispatching duplicate OTP', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUser,
        emailVerifiedAt: null,
      });

      redisService.ttl.mockResolvedValueOnce(35); // 35 seconds cooldown remaining

      let caughtError: any;
      try {
        await service.login({ email: 'customer@test.com', password: 'SecurePass@2026!' }, {});
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ForbiddenException);
      const resp = caughtError.getResponse();
      expect(resp.code).toBe(ErrorCode.EMAIL_NOT_VERIFIED);
      expect(resp.data.cooldownRemainingSeconds).toBe(35);
      expect(emailService.sendVerificationOtpEmail).not.toHaveBeenCalled();
    });

    it('should clean up Redis keys if email delivery fails during OTP dispatch', async () => {
      emailService.sendVerificationOtpEmail.mockRejectedValueOnce(
        new Error('Resend delivery failure'),
      );

      await expect(
        service.sendOrResendVerificationOtp(
          { id: mockUser.id, email: 'customer@test.com', name: 'Test Customer' },
          { checkCooldown: false },
        ),
      ).rejects.toThrow('Resend delivery failure');

      expect(redisService.del).toHaveBeenCalledWith('otp:verify-email:customer@test.com');
      expect(redisService.del).toHaveBeenCalledWith('otp:cooldown:verify-email:customer@test.com');
      expect(redisService.del).toHaveBeenCalledWith('otp:attempts:verify-email:customer@test.com');
    });

    it('should reject login if user account is inactive', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUser,
        status: UserStatus.INACTIVE,
      });

      await expect(
        service.login({ email: 'customer@test.com', password: 'SecurePass@2026!' }, {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Refresh Token Rotation & RFC 6749 Reuse Detection', () => {
    it('should rotate valid refresh token and preserve token family', async () => {
      const rawToken = 'a'.repeat(80);
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const mockSession = {
        id: 'session-1',
        tokenFamilyId: 'family-100',
        userId: mockUser.id,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        user: mockUser,
      };

      prisma.session.findFirst.mockResolvedValueOnce(mockSession);

      const result = await service.refresh(rawToken, {});

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokenFamilyId: 'family-100' }),
        }),
      );
    });

    it('should detect token reuse and revoke all sessions in token family', async () => {
      const rawToken = 'b'.repeat(80);
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const revokedSession = {
        id: 'session-already-used',
        tokenFamilyId: 'family-999',
        userId: mockUser.id,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(Date.now() - 5000), // Already revoked!
        user: mockUser,
      };

      prisma.session.findFirst.mockResolvedValueOnce(revokedSession);

      await expect(service.refresh(rawToken, {})).rejects.toThrow(UnauthorizedException);

      // Verify all sessions in family were revoked
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          tokenFamilyId: 'family-999',
          revokedAt: null,
        },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });

  describe('Password Reset Workflow', () => {
    it('should generate reset token and dispatch email for active user', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        email: 'user@example.com',
        name: 'User One',
        status: UserStatus.ACTIVE,
      });

      const result = await service.forgotPassword({ email: 'user@example.com' });

      expect(result.message).toContain('password reset instructions');
      expect(prisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            type: 'PASSWORD_RESET',
          }),
        }),
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return generic success message when user does not exist (enumeration defense)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      const result = await service.forgotPassword({ email: 'unknown@example.com' });

      expect(result.message).toContain('password reset instructions');
      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should reset password with valid token and revoke all sessions', async () => {
      const resetToken = 'c'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      prisma.verificationToken.findFirst.mockResolvedValueOnce({
        id: 'vt-1',
        tokenHash,
        userId: 'u1',
        user: { id: 'u1', status: UserStatus.ACTIVE, deletedAt: null },
      });

      const result = await service.resetPassword({
        token: resetToken,
        newPassword: 'NewPassword@2026!',
      });

      expect(result.message).toContain('Password has been reset successfully');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', revokedAt: null },
        }),
      );
    });
  });
});
