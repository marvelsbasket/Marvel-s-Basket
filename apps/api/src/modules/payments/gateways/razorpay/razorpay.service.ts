import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RazorpayClient } from './razorpay.client';
import {
  RazorpayOrderEntity,
  RazorpayPaymentEntity,
  RazorpayRefundCreateParams,
  RazorpayRefundEntity,
} from './razorpay.types';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(
    private readonly client: RazorpayClient,
    private readonly configService: ConfigService,
  ) {}

  getPublicKeyId(): string {
    return this.client.getPublicKeyId();
  }

  getMode(): 'test' | 'live' {
    return this.configService.get<'test' | 'live'>('razorpay.mode', 'test');
  }

  getCaptureMode(): 'automatic' | 'manual' {
    return this.configService.get<'automatic' | 'manual'>('razorpay.captureMode', 'automatic');
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  private async withRetry<T>(
    operationName: string,
    fn: () => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const statusCode = this.extractStatusCode(err);
        const isRetryable = statusCode === 409 || (statusCode !== null && statusCode >= 500) || statusCode === null;

        if (!isRetryable || attempt === maxAttempts) {
          break;
        }
        const backoffMs = 200 * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Razorpay ${operationName} failed (attempt ${attempt}/${maxAttempts}, status=${statusCode ?? 'network'}). Retrying in ${backoffMs}ms.`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    throw this.mapGatewayError(operationName, lastError);
  }

  private extractStatusCode(err: unknown): number | null {
    if (!err || typeof err !== 'object') return null;
    const e = err as Record<string, unknown>;
    if (typeof e.statusCode === 'number') return e.statusCode;
    if (e.response && typeof (e.response as Record<string, unknown>).status === 'number') {
      return (e.response as Record<string, unknown>).status as number;
    }
    return null;
  }

  private mapGatewayError(operationName: string, err: unknown): Error {
    const statusCode = this.extractStatusCode(err);
    const e = err as Record<string, unknown> | undefined;
    const errorObj = (e?.error as Record<string, unknown> | undefined) ||
      ((e?.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.error as Record<string, unknown> | undefined;
    const description =
      (errorObj?.description as string) ||
      (e?.message as string) ||
      `Razorpay ${operationName} failed`;

    this.logger.error(`Razorpay ${operationName} error (status=${statusCode ?? 'unknown'}): ${description}`);

    if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 409) {
      return new BadRequestException({
        code: 'PAYMENT_GATEWAY_REJECTED',
        message: description,
      });
    }
    return new BadGatewayException({
      code: 'PAYMENT_GATEWAY_UNAVAILABLE',
      message: 'Payment gateway is temporarily unavailable. Please try again shortly.',
    });
  }

  async createOrder(params: {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrderEntity> {
    const captureMode = this.getCaptureMode();
    try {
      return await this.client.createOrder({
        amount: params.amountPaise,
        currency: 'INR',
        receipt: params.receipt,
        payment_capture: captureMode === 'automatic' ? 1 : 0,
        notes: params.notes,
      });
    } catch (err) {
      throw this.mapGatewayError('createOrder', err);
    }
  }

  async fetchOrderPayments(providerOrderId: string): Promise<RazorpayPaymentEntity[]> {
    return this.withRetry('fetchOrderPayments', () =>
      this.client.fetchOrderPayments(providerOrderId),
    );
  }

  async fetchPayment(providerPaymentId: string): Promise<RazorpayPaymentEntity> {
    return this.withRetry('fetchPayment', () => this.client.fetchPayment(providerPaymentId));
  }

  async capturePayment(
    providerPaymentId: string,
    amountPaise: number,
  ): Promise<RazorpayPaymentEntity> {
    try {
      return await this.client.capturePayment(providerPaymentId, amountPaise, 'INR');
    } catch (err) {
      throw this.mapGatewayError('capturePayment', err);
    }
  }

  async createRefund(
    providerPaymentId: string,
    params: RazorpayRefundCreateParams,
    idempotencyKey: string,
  ): Promise<RazorpayRefundEntity> {
    // Safe to retry with identical body and identical X-Refund-Idempotency key
    return this.withRetry('createRefund', () =>
      this.client.createRefund(providerPaymentId, params, idempotencyKey),
    );
  }

  async fetchRefund(providerRefundId: string): Promise<RazorpayRefundEntity> {
    return this.withRetry('fetchRefund', () => this.client.fetchRefund(providerRefundId));
  }
}
