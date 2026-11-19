import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import { Public, ResponseMessage } from '../../common/decorators';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyEmailOtpDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly isProduction: boolean;
  private readonly cookieName = 'refreshToken';

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new customer account',
    description:
      'Creates a user account with the CUSTOMER role and dispatches a 6-digit verification OTP to the provided email address.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Registration successful. Verification OTP sent.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or phone already registered.',
  })
  @ResponseMessage('Registration successful. Please verify your email.')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email with 6-digit OTP',
    description:
      'Validates the email verification OTP against Redis with rate-limiting and brute-force protection (max 5 attempts).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired OTP, or maximum attempts exceeded.',
  })
  @ResponseMessage('Email verification completed.')
  async verifyEmail(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification OTP',
    description:
      'Generates and dispatches a fresh 6-digit OTP to the user email, enforced by a 60-second cooldown.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification OTP resent successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cooldown period active or email already verified.',
  })
  @ResponseMessage('Verification OTP resent.')
  async resendVerificationOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendVerificationOtp(dto.email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user credentials',
    description:
      'Authenticates user using email and password (verified via Argon2id). Returns access token in response body and sets rotating refresh token in an HttpOnly cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication successful. Returns tokens and user claims.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Email address has not been verified.',
  })
  @ResponseMessage('Logged in successfully.')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const metadata = {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.login(dto, metadata);

    // Set refresh token in secure HttpOnly cookie
    res.cookie(this.cookieName, result.tokens.refreshToken, this.getCookieOptions());

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token with refresh token rotation',
    description:
      'Rotates refresh token and issues a new access token. Supports reading refresh token from HttpOnly cookie or request body. Implements RFC 6749 reuse detection.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token rotated successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or reused refresh token.',
  })
  @ApiCookieAuth('refreshToken')
  @ResponseMessage('Tokens refreshed successfully.')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: RefreshTokenDto,
  ) {
    // Extract refresh token from cookie first, then body fallback
    const rawRefreshToken = req.cookies?.[this.cookieName] || body?.refreshToken;

    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const metadata = {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.refresh(rawRefreshToken, metadata);

    // Update refresh token cookie
    res.cookie(this.cookieName, result.tokens.refreshToken, this.getCookieOptions());

    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out current session',
    description: 'Revokes the current refresh token session and clears the refresh token cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged out.',
  })
  @ResponseMessage('Logged out successfully.')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: RefreshTokenDto,
  ) {
    const rawRefreshToken = req.cookies?.[this.cookieName] || body?.refreshToken;

    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie(this.cookieName, {
      ...this.getCookieOptions(),
      maxAge: 0,
    });

    return { message: 'Successfully logged out.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Terminate all active sessions across all devices',
    description:
      'Revokes all active sessions for the authenticated user and clears the local cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All sessions terminated successfully.',
  })
  @ResponseMessage('All active sessions terminated.')
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logoutAll(userId);

    res.clearCookie(this.cookieName, {
      ...this.getCookieOptions(),
      maxAge: 0,
    });

    return result;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset email',
    description:
      'Generates a secure, single-use password reset token (15m expiry) and dispatches an email. Returns generic response to prevent account enumeration.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset request acknowledged.',
  })
  @ResponseMessage('Password reset request processed.')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using verification token',
    description:
      'Verifies the password reset token, updates the password using Argon2id, and invalidates all existing user sessions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password successfully reset.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired reset token.',
  })
  @ResponseMessage('Password reset completed.')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get currently authenticated user profile and permissions',
    description:
      'Returns the authenticated user details, customer profile, assigned roles, and granular permissions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authenticated user profile retrieved successfully.',
  })
  @ResponseMessage('User profile retrieved.')
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
