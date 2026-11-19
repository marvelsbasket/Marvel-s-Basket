import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRoleType, UserStatus, VerificationTokenType } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { RedisService } from '../../cache/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailOtpDto,
} from './dto';
import { JwtPayload, JwtTokens } from './interfaces';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
  tokens: JwtTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly otpExpirySeconds: number;
  private readonly otpCooldownSeconds: number;
  private readonly maxOtpAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {
    this.accessSecret = this.configService.get<string>('jwt.accessSecret')!;
    this.accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    this.refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    this.refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    this.otpExpirySeconds =
      this.configService.get<number>('email.verificationOtpExpirySeconds') || 300;
    this.otpCooldownSeconds =
      this.configService.get<number>('email.verificationCooldownSeconds') || 60;
    this.maxOtpAttempts = 5;
  }

  /**
   * Register a new user account as a CUSTOMER.
   * Dispatches a 6-digit verification OTP to the user's email.
   */
  async register(dto: RegisterDto): Promise<{
    message: string;
    userId: string;
    email: string;
  }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check for existing user with this email
    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    if (existingUser) {
      if (existingUser.emailVerifiedAt) {
        throw new ConflictException(
          'An account with this email address already exists. Please log in.',
        );
      }
      throw new ConflictException(
        'An account with this email exists but is unverified. Please verify your email or request a new OTP.',
      );
    }

    // Check if phone number is already registered if provided
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: dto.phone, deletedAt: null },
      });
      if (existingPhone) {
        throw new ConflictException('This phone number is already registered to another account.');
      }
    }

    // Securely hash password using Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Find default CUSTOMER role
    let defaultRole = await this.prisma.role.findFirst({
      where: {
        OR: [{ roleType: UserRoleType.CUSTOMER }, { name: UserRoleType.CUSTOMER }],
      },
    });

    if (!defaultRole) {
      // Fallback create CUSTOMER role if DB seed was incomplete
      defaultRole = await this.prisma.role.create({
        data: {
          name: UserRoleType.CUSTOMER,
          roleType: UserRoleType.CUSTOMER,
          description: 'Standard marketplace customer',
        },
      });
    }

    // Create user, customer role, customer profile, and empty cart in a single transaction
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: normalizedEmail,
          phone: dto.phone?.trim() || null,
          passwordHash,
          status: UserStatus.ACTIVE,
          userRoles: {
            create: {
              roleId: defaultRole.id,
            },
          },
          customerProfile: {
            create: {},
          },
          cart: {
            create: {},
          },
        },
      });

      return user;
    });

    // Generate and dispatch verification OTP
    await this.generateAndSendVerificationOtp(newUser.email!, newUser.name, newUser.id);

    return {
      message: 'Registration successful. Please check your email for a 6-digit verification code.',
      userId: newUser.id,
      email: newUser.email!,
    };
  }

  /**
   * Verify email address using the 6-digit OTP stored in Redis.
   */
  async verifyEmail(dto: VerifyEmailOtpDto): Promise<{
    message: string;
    verified: boolean;
  }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'Email address has already been verified.',
        verified: true,
      };
    }

    const otpKey = `otp:verify-email:${normalizedEmail}`;
    const attemptsKey = `otp:attempts:verify-email:${normalizedEmail}`;
    const cooldownKey = `otp:cooldown:verify-email:${normalizedEmail}`;

    // Check failed attempt counter to protect against brute-force
    const rawAttempts = await this.redisService.get(attemptsKey);
    const attempts = rawAttempts ? parseInt(rawAttempts, 10) : 0;

    if (attempts >= this.maxOtpAttempts) {
      // Invalidate OTP on excessive failed attempts
      await this.redisService.del(otpKey);
      throw new BadRequestException(
        'Maximum verification attempts exceeded. For security, this OTP has been invalidated. Please request a new code.',
      );
    }

    const storedHash = await this.redisService.get(otpKey);
    if (!storedHash) {
      throw new BadRequestException(
        'Verification code has expired or does not exist. Please request a new OTP.',
      );
    }

    // Compute SHA-256 of candidate OTP and compare safely
    const candidateHash = crypto.createHash('sha256').update(dto.otp.trim()).digest('hex');

    if (storedHash !== candidateHash) {
      const newAttempts = await this.redisService.incr(attemptsKey);
      await this.redisService.expire(attemptsKey, this.otpExpirySeconds);
      const remainingAttempts = Math.max(0, this.maxOtpAttempts - newAttempts);

      throw new BadRequestException(
        `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
      );
    }

    // OTP is valid: update user verification status
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      }),
      this.prisma.verificationToken.updateMany({
        where: {
          userId: user.id,
          type: VerificationTokenType.EMAIL_VERIFICATION,
          usedAt: null,
        },
        data: { usedAt: now },
      }),
    ]);

    // Clean up Redis keys
    await Promise.all([
      this.redisService.del(otpKey),
      this.redisService.del(attemptsKey),
      this.redisService.del(cooldownKey),
    ]);

    this.logger.log(`Email successfully verified for user ${user.id} (${user.email})`);

    return {
      message: 'Email address has been successfully verified. You can now log in.',
      verified: true,
    };
  }

  /**
   * Resend a verification OTP with 60-second cooldown protection.
   */
  async resendVerificationOtp(email: string): Promise<{
    message: string;
    cooldownRemainingSeconds: number;
  }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email address has already been verified.');
    }

    const cooldownKey = `otp:cooldown:verify-email:${normalizedEmail}`;
    const remainingCooldown = await this.redisService.ttl(cooldownKey);

    if (remainingCooldown > 0) {
      throw new BadRequestException(
        `Please wait ${remainingCooldown} second(s) before requesting a new verification code.`,
      );
    }

    await this.generateAndSendVerificationOtp(user.email!, user.name, user.id);

    return {
      message: 'A new verification code has been dispatched to your email.',
      cooldownRemainingSeconds: this.otpCooldownSeconds,
    };
  }

  /**
   * Authenticate user with email and password.
   * Returns JWT access token, rotating refresh token, and user claims.
   */
  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Timing-safe defense against account enumeration: verify fake hash if user missing
    if (!user || !user.passwordHash) {
      await argon2
        .verify(
          '$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummyhash$dummyhashdummyhash',
          dto.password,
        )
        .catch(() => false);
      throw new UnauthorizedException('Invalid email address or password.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your account has been deactivated or suspended. Please contact support.',
      );
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email address before logging in.');
    }

    // Extract roles and distinct permissions
    const roles = user.userRoles.map((ur) => ur.role.roleType || ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
      ),
    );

    // Create session and issue tokens
    const tokenFamilyId = crypto.randomUUID();
    const { accessToken, refreshToken, expiresIn } = await this.createSessionAndIssueTokens({
      userId: user.id,
      email: user.email!,
      roles,
      permissions,
      tokenFamilyId,
      metadata,
    });

    // Update last login timestamp
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Failed to update lastLoginAt for ${user.id}`, err);
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        name: user.name,
        roles,
        permissions,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
      },
    };
  }

  /**
   * Rotate refresh token and issue new access/refresh tokens.
   * Implements strict RFC 6749 Token Rotation with Reuse Detection.
   * If an already-revoked refresh token is presented, the entire token family is revoked.
   */
  async refresh(rawRefreshToken: string, metadata: RequestMetadata): Promise<AuthResponse> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken.trim()).digest('hex');

    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or unrecognized refresh token.');
    }

    // =========================================================================
    // RFC 6749 REUSE DETECTION:
    // If the token was previously revoked, a compromised token is being reused.
    // Invalidate ALL sessions belonging to the same token family immediately!
    // =========================================================================
    if (session.revokedAt !== null) {
      if (session.tokenFamilyId) {
        await this.prisma.session.updateMany({
          where: {
            tokenFamilyId: session.tokenFamilyId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }

      this.logger.warn(
        `SECURITY ALERT: Refresh token reuse detected for user ${session.userId} (family: ${session.tokenFamilyId}). Revoked all active sessions in family.`,
      );

      throw new UnauthorizedException(
        'Security violation: Refresh token reuse detected. All active sessions have been terminated. Please log in again.',
      );
    }

    // Check token expiration
    if (session.expiresAt < new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // Verify user account status
    const user = session.user;
    if (user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
      throw new UnauthorizedException('User account is suspended, inactive, or removed.');
    }

    // Invalidate the consumed session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Extract updated roles & permissions
    const roles = user.userRoles.map((ur) => ur.role.roleType || ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
      ),
    );

    // Issue new token pair preserving the existing tokenFamilyId
    const tokenFamilyId = session.tokenFamilyId || crypto.randomUUID();
    const { accessToken, refreshToken, expiresIn } = await this.createSessionAndIssueTokens({
      userId: user.id,
      email: user.email!,
      roles,
      permissions,
      tokenFamilyId,
      metadata,
    });

    return {
      user: {
        id: user.id,
        email: user.email!,
        name: user.name,
        roles,
        permissions,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
      },
    };
  }

  /**
   * Log out from the current session by revoking the refresh token.
   */
  async logout(rawRefreshToken: string): Promise<{ message: string }> {
    if (!rawRefreshToken) {
      return { message: 'Successfully logged out.' };
    }

    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken.trim()).digest('hex');

    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Successfully logged out.' };
  }

  /**
   * Terminate all active sessions for the authenticated user across all devices.
   */
  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'All active sessions have been successfully terminated.' };
  }

  /**
   * Request password reset link.
   * Generates a single-use cryptographically secure reset token with 15-minute TTL.
   * Always returns a generic success message to prevent user enumeration.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'If an account exists with this email address, password reset instructions have been sent.',
    };

    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return genericResponse;
    }

    // Generate 64-char crypto reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetExpiryMinutes = 15;
    const expiresAt = new Date(Date.now() + resetExpiryMinutes * 60 * 1000);

    // Invalidate previous unused reset tokens for this user
    await this.prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: VerificationTokenType.PASSWORD_RESET,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Record new reset token
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: VerificationTokenType.PASSWORD_RESET,
        expiresAt,
      },
    });

    // Construct reset link (points to frontend app)
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Dispatch reset email
    await this.emailService.sendPasswordResetEmail(
      user.email!,
      user.name,
      resetLink,
      resetExpiryMinutes,
    );

    return genericResponse;
  }

  /**
   * Reset user password using the cryptographically verified token.
   * Invalidates all existing sessions to enforce re-login.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const candidateHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');

    const verificationRecord = await this.prisma.verificationToken.findFirst({
      where: {
        tokenHash: candidateHash,
        type: VerificationTokenType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationRecord || !verificationRecord.user) {
      throw new BadRequestException(
        'Password reset link is invalid or has expired. Please request a new one.',
      );
    }

    const user = verificationRecord.user;
    if (user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
      throw new BadRequestException('User account is inactive or removed.');
    }

    // Hash new password using Argon2id
    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const now = new Date();

    // Transactionally update password, mark token used, and revoke ALL existing sessions
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          // If the user was somehow unverified, completing a password reset via their email verifies it
          emailVerifiedAt: user.emailVerifiedAt || now,
        },
      }),
      this.prisma.verificationToken.update({
        where: { id: verificationRecord.id },
        data: { usedAt: now },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    this.logger.log(`Password successfully reset for user ${user.id}. All prior sessions revoked.`);

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Retrieve profile and permission set of the currently authenticated user.
   */
  async getMe(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    phone: string | null;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
    roles: string[];
    permissions: string[];
    customerProfile: unknown;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        customerProfile: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                roleType: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const roles = user.userRoles.map((ur) => ur.role.roleType || ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
      ),
    );

    return {
      id: user.id,
      email: user.email || '',
      name: user.name,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      roles,
      permissions,
      customerProfile: user.customerProfile,
    };
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Generate a 6-digit numeric OTP, persist SHA-256 hash in Redis, set cooldown, and dispatch email.
   */
  private async generateAndSendVerificationOtp(
    email: string,
    name: string,
    userId: string,
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    // Secure 6-digit OTP using crypto.randomInt
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const otpKey = `otp:verify-email:${normalizedEmail}`;
    const attemptsKey = `otp:attempts:verify-email:${normalizedEmail}`;
    const cooldownKey = `otp:cooldown:verify-email:${normalizedEmail}`;

    // Store hashed OTP and set TTL in Redis
    await this.redisService.set(otpKey, otpHash, this.otpExpirySeconds);
    // Reset attempt counter
    await this.redisService.del(attemptsKey);
    // Set 60-second cooldown key
    await this.redisService.set(cooldownKey, '1', this.otpCooldownSeconds);

    // Audit record in PostgreSQL VerificationToken
    const expiresAt = new Date(Date.now() + this.otpExpirySeconds * 1000);
    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash: otpHash,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    // Send email via Resend
    const expiryMinutes = Math.floor(this.otpExpirySeconds / 60);
    await this.emailService.sendVerificationOtpEmail(normalizedEmail, name, otp, expiryMinutes);
  }

  /**
   * Create database Session record and issue Access (JWT) & Refresh (opaque hex) tokens.
   */
  private async createSessionAndIssueTokens(params: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    tokenFamilyId: string;
    metadata: RequestMetadata;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Generate secure opaque 80-character hex refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    // Parse refresh expiration (e.g. '7d' -> 7 days)
    const refreshDays = parseInt(this.refreshExpiresIn.replace(/\D/g, ''), 10) || 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    // Persist session in PostgreSQL
    const session = await this.prisma.session.create({
      data: {
        userId: params.userId,
        refreshTokenHash,
        tokenFamilyId: params.tokenFamilyId,
        expiresAt,
        ipAddress: params.metadata.ipAddress || null,
        userAgent: params.metadata.userAgent || null,
      },
    });

    // Calculate access token expiresIn seconds
    const accessExpiresInSeconds = this.parseDurationToSeconds(this.accessExpiresIn, 900);

    // Sign Access JWT
    const payload: JwtPayload = {
      sub: params.userId,
      email: params.email,
      roles: params.roles,
      permissions: params.permissions,
      sessionId: session.id,
      tokenFamilyId: params.tokenFamilyId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: accessExpiresInSeconds,
    };
  }

  /**
   * Helper to parse string durations like '15m', '7d', '1h' into seconds.
   */
  private parseDurationToSeconds(duration: string, fallback: number): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return fallback;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return fallback;
    }
  }
}
