import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailSendResult, SendEmailOptions } from './email.interface';
import { renderVerificationOtpEmail } from './templates/verification-otp.template';
import { renderPasswordResetEmail } from './templates/password-reset.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly defaultFrom: string;
  private readonly isMockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('email.resendApiKey', '');
    this.defaultFrom =
      this.configService.get<string>('email.from') || "Marvel's Basket <noreply@marvelsbasket.com>";

    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');

    // Enable mock mode in tests, or if apiKey is a dev placeholder
    this.isMockMode =
      nodeEnv === 'test' ||
      !apiKey ||
      apiKey.startsWith('re_dev_placeholder') ||
      apiKey === 're_placeholder';

    if (!this.isMockMode && apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client initialized successfully.');
    } else {
      this.logger.log('EmailService running in simulated/mock mode (no live emails sent).');
    }
  }

  /**
   * Generic email dispatch via Resend or mock logger.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const to = Array.isArray(options.to) ? options.to : [options.to];

    if (this.isMockMode || !this.resend) {
      this.logger.log(
        `[MOCK EMAIL DISPATCH] To: ${to.join(', ')} | Subject: "${options.subject}" (Live delivery skipped)`,
      );
      return {
        success: true,
        messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.defaultFrom,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`);
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Unexpected failure sending email via Resend: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage || 'Unknown email delivery failure',
      };
    }
  }

  /**
   * Dispatches an email verification OTP notification.
   */
  async sendVerificationOtpEmail(
    to: string,
    name: string,
    otp: string,
    expiryMinutes: number,
  ): Promise<EmailSendResult> {
    const { html, text } = renderVerificationOtpEmail({ name, otp, expiryMinutes });
    return this.sendEmail({
      to,
      subject: "Marvel's Basket — Verify Your Email Address",
      html,
      text,
    });
  }

  /**
   * Dispatches a password reset instructions notification.
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
    expiryMinutes: number,
  ): Promise<EmailSendResult> {
    const { html, text } = renderPasswordResetEmail({ name, resetToken, expiryMinutes });
    return this.sendEmail({
      to,
      subject: "Marvel's Basket — Password Reset Request",
      html,
      text,
    });
  }
}
