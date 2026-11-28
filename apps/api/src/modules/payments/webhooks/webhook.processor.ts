import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentsService } from '../payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { RazorpayWebhookPayload } from '../gateways/razorpay/razorpay.types';
import { PAYMENT_WEBHOOKS_QUEUE } from './webhook.service';

@Processor(PAYMENT_WEBHOOKS_QUEUE)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
  ) {
    super();
  }

  async process(job: Job<{ webhookRecordId: string; eventId: string }>): Promise<void> {
    const { webhookRecordId, eventId } = job.data;

    const record = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id: webhookRecordId },
    });

    if (!record || record.status === 'PROCESSED') {
      return;
    }

    try {
      const payload = record.payload as unknown as RazorpayWebhookPayload;
      await this.handleEvent(eventId, payload);

      await this.prisma.paymentWebhookEvent.update({
        where: { id: record.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(
        `Failed to process Razorpay webhook ${eventId} (attempt ${job.attemptsMade + 1}): ${message}`,
      );
      await this.prisma.paymentWebhookEvent.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          retryCount: { increment: 1 },
          errorMessage: message,
        },
      });
      throw err;
    }
  }

  async handleEvent(eventId: string, payload: RazorpayWebhookPayload): Promise<void> {
    const eventType = payload.event;
    const rpPayment = payload.payload?.payment?.entity;
    const rpOrder = payload.payload?.order?.entity;
    const rpRefund = payload.payload?.refund?.entity;

    switch (eventType) {
      case 'payment.authorized': {
        if (!rpPayment?.order_id) return;
        const payment = await this.prisma.payment.findFirst({
          where: { provider: 'RAZORPAY', providerOrderId: rpPayment.order_id },
        });
        if (!payment) return;
        await this.paymentsService.markPaymentAuthorized({
          paymentId: payment.id,
          providerPaymentId: rpPayment.id,
          method: rpPayment.method || 'razorpay',
          gatewayStatus: rpPayment.status,
          source: 'WEBHOOK',
          providerEventId: eventId,
          rawPayload: payload as unknown as Record<string, unknown>,
        });
        return;
      }

      case 'payment.captured': {
        if (!rpPayment?.order_id) return;
        const payment = await this.prisma.payment.findFirst({
          where: { provider: 'RAZORPAY', providerOrderId: rpPayment.order_id },
        });
        if (!payment) return;
        await this.paymentsService.confirmCapturedPayment({
          paymentId: payment.id,
          providerPaymentId: rpPayment.id,
          amountPaise: rpPayment.amount,
          currency: rpPayment.currency,
          method: rpPayment.method || 'razorpay',
          gatewayStatus: rpPayment.status,
          source: 'WEBHOOK',
          providerEventId: eventId,
          rawPayload: payload as unknown as Record<string, unknown>,
        });
        return;
      }

      case 'order.paid': {
        const providerOrderId = rpOrder?.id || rpPayment?.order_id;
        if (!providerOrderId || !rpPayment) return;
        const payment = await this.prisma.payment.findFirst({
          where: { provider: 'RAZORPAY', providerOrderId },
        });
        if (!payment) return;
        await this.paymentsService.confirmCapturedPayment({
          paymentId: payment.id,
          providerPaymentId: rpPayment.id,
          amountPaise: rpPayment.amount,
          currency: rpPayment.currency,
          method: rpPayment.method || 'razorpay',
          gatewayStatus: rpPayment.status || 'captured',
          source: 'WEBHOOK',
          providerEventId: eventId,
          rawPayload: payload as unknown as Record<string, unknown>,
        });
        return;
      }

      case 'payment.failed': {
        if (!rpPayment?.order_id) return;
        const payment = await this.prisma.payment.findFirst({
          where: { provider: 'RAZORPAY', providerOrderId: rpPayment.order_id },
        });
        if (!payment) return;
        await this.paymentsService.markPaymentFailed({
          paymentId: payment.id,
          providerPaymentId: rpPayment.id,
          gatewayStatus: rpPayment.status || 'failed',
          failureCode: rpPayment.error_code || 'GATEWAY_FAILED',
          failureReason:
            rpPayment.error_description || rpPayment.error_reason || 'Payment failed',
          source: 'WEBHOOK',
          providerEventId: eventId,
          rawPayload: payload as unknown as Record<string, unknown>,
        });
        return;
      }

      case 'refund.created':
      case 'refund.processed':
      case 'refund.failed': {
        if (!rpRefund) return;
        await this.refundsService.syncGatewayRefund(rpRefund, `WEBHOOK:${eventType}`);
        return;
      }

      default:
        this.logger.debug(`Ignored unhandled Razorpay webhook event type: ${eventType}`);
    }
  }
}
