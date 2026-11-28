import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import axios from 'axios';
import {
  RazorpayOrderCreateParams,
  RazorpayOrderEntity,
  RazorpayPaymentEntity,
  RazorpayRefundCreateParams,
  RazorpayRefundEntity,
} from './razorpay.types';

@Injectable()
export class RazorpayClient {
  private readonly logger = new Logger(RazorpayClient.name);
  private readonly sdk: Razorpay | null;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('razorpay.keyId', '');
    this.keySecret = this.configService.get<string>('razorpay.keySecret', '');

    if (this.isConfigured()) {
      this.sdk = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.sdk = null;
      this.logger.warn(
        'Razorpay credentials are not configured or use placeholders. Gateway API calls will fail until valid Test/Live keys are provided.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.keyId &&
        this.keySecret &&
        !this.keyId.includes('placeholder') &&
        !this.keySecret.includes('placeholder'),
    );
  }

  getPublicKeyId(): string {
    return this.keyId;
  }

  private getSdk(): Razorpay {
    if (!this.sdk) {
      throw new ServiceUnavailableException({
        code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        message: 'Razorpay payment gateway is not configured on this server.',
      });
    }
    return this.sdk;
  }

  async createOrder(params: RazorpayOrderCreateParams): Promise<RazorpayOrderEntity> {
    const sdk = this.getSdk();
    const order = await sdk.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      payment_capture: params.payment_capture,
      notes: params.notes,
    } as Parameters<typeof sdk.orders.create>[0]);
    return order as unknown as RazorpayOrderEntity;
  }

  async fetchOrder(orderId: string): Promise<RazorpayOrderEntity> {
    const sdk = this.getSdk();
    const order = await sdk.orders.fetch(orderId);
    return order as unknown as RazorpayOrderEntity;
  }

  async fetchOrderPayments(orderId: string): Promise<RazorpayPaymentEntity[]> {
    const sdk = this.getSdk();
    const res = (await sdk.orders.fetchPayments(orderId)) as unknown as {
      items?: RazorpayPaymentEntity[];
    };
    return res.items || [];
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPaymentEntity> {
    const sdk = this.getSdk();
    const payment = await sdk.payments.fetch(paymentId);
    return payment as unknown as RazorpayPaymentEntity;
  }

  async capturePayment(
    paymentId: string,
    amountPaise: number,
    currency: string,
  ): Promise<RazorpayPaymentEntity> {
    const sdk = this.getSdk();
    const payment = await sdk.payments.capture(paymentId, amountPaise, currency);
    return payment as unknown as RazorpayPaymentEntity;
  }

  /**
   * Creates a Razorpay refund with mandatory X-Refund-Idempotency header support
   * per Razorpay Refunds API specification.
   */
  async createRefund(
    paymentId: string,
    params: RazorpayRefundCreateParams,
    idempotencyKey?: string,
  ): Promise<RazorpayRefundEntity> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
        message: 'Razorpay payment gateway is not configured on this server.',
      });
    }

    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const headers: Record<string, string> = {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['X-Refund-Idempotency'] = idempotencyKey;
    }

    const response = await axios.post<RazorpayRefundEntity>(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      params,
      { headers, timeout: 15000 },
    );

    return response.data;
  }

  async fetchRefund(refundId: string): Promise<RazorpayRefundEntity> {
    const sdk = this.getSdk();
    const refund = await sdk.refunds.fetch(refundId);
    return refund as unknown as RazorpayRefundEntity;
  }
}
