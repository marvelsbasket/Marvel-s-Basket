import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, RefundStatus } from '@prisma/client';
import * as crypto from 'crypto';
import {
  assertValidPaymentTransition,
  canTransitionPayment,
  paiseToRupees,
  rupeesToPaise,
} from './payment-state-machine';
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from './gateways/razorpay/razorpay.signature';
import { WebhookService } from './webhooks/webhook.service';
import { WebhookProcessor } from './webhooks/webhook.processor';
import { RefundsService } from './refunds/refunds.service';
import { PaymentReconciliationService } from './reconciliation/payment-reconciliation.service';
import { PaymentsService } from './payments.service';

describe('Phase 13 — Razorpay Payments Unit Suite', () => {
  describe('Amount Calculation (INR <-> Paise)', () => {
    it('converts decimal INR accurately to integer paise', () => {
      expect(rupeesToPaise(249.5)).toBe(24950);
      expect(rupeesToPaise('19.99')).toBe(1999);
      expect(rupeesToPaise(1)).toBe(100);
      expect(paiseToRupees(24950)).toBe(249.5);
    });

    it('rejects zero, negative, NaN, and below-₹1 amounts', () => {
      expect(() => rupeesToPaise(0)).toThrow(BadRequestException);
      expect(() => rupeesToPaise(-50)).toThrow(BadRequestException);
      expect(() => rupeesToPaise(0.5)).toThrow(BadRequestException);
      expect(() => rupeesToPaise(Number.NaN)).toThrow(BadRequestException);
    });
  });

  describe('Razorpay Signature Verification', () => {
    const keySecret = 'rzp_test_secret_1234567890';
    const webhookSecret = 'whsec_primary_123456';
    const prevWebhookSecret = 'whsec_old_654321';

    it('verifies valid Checkout HMAC-SHA256 signature and rejects tampered/missing values', () => {
      const orderId = 'order_Test123';
      const paymentId = 'pay_Test456';
      const sig = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(verifyCheckoutSignature({ orderId, paymentId, signature: sig, keySecret })).toBe(true);
      expect(
        verifyCheckoutSignature({
          orderId: 'order_Tampered',
          paymentId,
          signature: sig,
          keySecret,
        }),
      ).toBe(false);
      expect(
        verifyCheckoutSignature({ orderId, paymentId, signature: 'invalid_sig', keySecret }),
      ).toBe(false);
      expect(verifyCheckoutSignature({ orderId, paymentId, signature: '', keySecret })).toBe(false);
    });

    it('verifies webhook rawBody signature and supports safe secret rotation', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }));
      const primarySig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const prevSig = crypto.createHmac('sha256', prevWebhookSecret).update(rawBody).digest('hex');

      expect(
        verifyWebhookSignature({
          rawBody,
          signature: primarySig,
          webhookSecret,
          previousWebhookSecret: prevWebhookSecret,
        }),
      ).toEqual({ valid: true, usedPreviousSecret: false });

      expect(
        verifyWebhookSignature({
          rawBody,
          signature: prevSig,
          webhookSecret,
          previousWebhookSecret: prevWebhookSecret,
        }),
      ).toEqual({ valid: true, usedPreviousSecret: true });

      // Modified payload must fail
      const modifiedBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { x: 1 } }));
      expect(
        verifyWebhookSignature({
          rawBody: modifiedBody,
          signature: primarySig,
          webhookSecret,
        }).valid,
      ).toBe(false);
    });
  });

  describe('Payment State Machine', () => {
    it('allows valid forward transitions and blocks terminal overwrites', () => {
      expect(canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.CAPTURED)).toBe(true);
      expect(canTransitionPayment(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED)).toBe(true);
      expect(canTransitionPayment(PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED)).toBe(
        true,
      );
      expect(canTransitionPayment(PaymentStatus.CAPTURED, PaymentStatus.AUTHORIZED)).toBe(false);
      expect(canTransitionPayment(PaymentStatus.REFUNDED, PaymentStatus.CAPTURED)).toBe(false);
      expect(() =>
        assertValidPaymentTransition(PaymentStatus.FAILED, PaymentStatus.CAPTURED),
      ).toThrow(BadRequestException);
    });
  });

  describe('WebhookService & WebhookProcessor', () => {
    const webhookSecret = 'whsec_unit_test_secret';

    it('rejects missing/invalid webhook signature before parsing JSON', async () => {
      const prisma = { paymentWebhookEvent: { create: jest.fn() } } as any;
      const config = { get: jest.fn().mockReturnValue(webhookSecret) } as any;
      const queue = { add: jest.fn() } as any;
      const service = new WebhookService(prisma, config, queue);

      await expect(
        service.ingestRazorpayWebhook({
          rawBody: Buffer.from('{invalid'),
          signature: 'bad_sig',
          eventId: 'evt_1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('deduplicates duplicate x-razorpay-event-id without queuing twice', async () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }));
      const sig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const { Prisma } = require('@prisma/client');
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });

      const prisma = {
        paymentWebhookEvent: { create: jest.fn().mockRejectedValue(p2002) },
      } as any;
      const config = {
        get: jest.fn((k: string) => (k === 'razorpay.webhookSecret' ? webhookSecret : undefined)),
      } as any;
      const queue = { add: jest.fn() } as any;
      const service = new WebhookService(prisma, config, queue);

      const res = await service.ingestRazorpayWebhook({
        rawBody,
        signature: sig,
        eventId: 'evt_dup_123',
      });
      expect(res).toEqual({ status: 'ok', duplicate: true, eventId: 'evt_dup_123' });
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('routes payment.captured webhook to confirmCapturedPayment', async () => {
      const prisma = {
        payment: { findFirst: jest.fn().mockResolvedValue({ id: 'pay-uuid-1' }) },
      } as any;
      const paymentsService = {
        confirmCapturedPayment: jest.fn().mockResolvedValue({ status: PaymentStatus.CAPTURED }),
        markPaymentAuthorized: jest.fn(),
        markPaymentFailed: jest.fn(),
      } as any;
      const refundsService = { syncGatewayRefund: jest.fn() } as any;

      const processor = new WebhookProcessor(prisma, paymentsService, refundsService);
      await processor.handleEvent('evt_cap_1', {
        entity: 'event',
        account_id: 'acc_1',
        event: 'payment.captured',
        contains: ['payment'],
        created_at: 1700000000,
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_1',
              entity: 'payment',
              amount: 50000,
              currency: 'INR',
              status: 'captured',
              order_id: 'order_rzp_1',
              method: 'upi',
              amount_refunded: 0,
              refund_status: null,
              captured: true,
              created_at: 1700000000,
            },
          },
        },
      });

      expect(paymentsService.confirmCapturedPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'pay-uuid-1',
          providerPaymentId: 'pay_rzp_1',
          amountPaise: 50000,
          source: 'WEBHOOK',
          providerEventId: 'evt_cap_1',
        }),
      );
    });
  });

  describe('RefundsService Validation & Idempotency', () => {
    it('prevents refund exceeding remaining refundable balance', async () => {
      const mockTx = {
        payment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pay-1',
            orderId: 'ord-1',
            paymentMethod: PaymentMethod.RAZORPAY,
            providerPaymentId: 'pay_rzp_1',
            status: PaymentStatus.CAPTURED,
            amount: 500,
            capturedAmount: 500,
            refunds: [{ amount: 300, status: RefundStatus.PROCESSED }],
          }),
        },
      };

      const prisma = {
        refund: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn((cb: (tx: any) => any) => cb(mockTx)),
      } as any;
      const razorpayService = { createRefund: jest.fn() } as any;
      const service = new RefundsService(prisma, razorpayService);

      await expect(
        service.createRefund('admin-1', 'pay-1', {
          amount: 250,
          reason: 'Customer requested partial refund',
          idempotencyKey: 'rf_test_key_12345',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(razorpayService.createRefund).not.toHaveBeenCalled();
    });
  });

  describe('PaymentReconciliationService', () => {
    it('syncs CREATED payment to CAPTURED when Razorpay reports captured', async () => {
      const prisma = {
        payment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pay-1',
            orderId: 'ord-1',
            paymentMethod: PaymentMethod.RAZORPAY,
            providerOrderId: 'order_rzp_1',
            status: PaymentStatus.CREATED,
            gatewayStatus: 'created',
            amount: 350,
            order: { orderNumber: 'MB-20261128-ABC123', paymentStatus: PaymentStatus.PENDING },
          }),
        },
        paymentReconciliationLog: {
          create: jest.fn().mockResolvedValue({ createdAt: new Date() }),
        },
      } as any;

      const razorpayService = {
        fetchOrderPayments: jest.fn().mockResolvedValue([
          {
            id: 'pay_rzp_99',
            amount: 35000,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        ]),
      } as any;

      const paymentsService = {
        confirmCapturedPayment: jest.fn().mockResolvedValue({ status: PaymentStatus.CAPTURED }),
      } as any;

      const service = new PaymentReconciliationService(prisma, razorpayService, paymentsService);
      const res = await service.reconcilePayment('pay-1', 'admin-1');

      expect(res.previousStatus).toBe(PaymentStatus.CREATED);
      expect(res.newStatus).toBe(PaymentStatus.CAPTURED);
      expect(res.discrepancyDetected).toBe(true);
      expect(res.resolutionAction).toBe('SYNCED_TO_CAPTURED');
    });
  });

  describe('PaymentsService Initiation & Verification Guards', () => {
    it('blocks initiating payment for already-paid order', async () => {
      const prisma = {
        payment: { findUnique: jest.fn(), findFirst: jest.fn() },
        order: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'ord-1',
            customerId: 'cust-1',
            paymentMethod: PaymentMethod.RAZORPAY,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.SUCCESS,
          }),
        },
      } as any;

      const service = new PaymentsService(
        prisma,
        { get: jest.fn() } as any,
        { getPublicKeyId: jest.fn(), isConfigured: jest.fn() } as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await expect(service.initiatePayment('cust-1', { orderId: 'ord-1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
