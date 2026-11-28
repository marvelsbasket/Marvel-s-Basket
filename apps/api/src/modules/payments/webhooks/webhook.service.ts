import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { verifyWebhookSignature } from '../gateways/razorpay/razorpay.signature';
import { RazorpayWebhookPayload } from '../gateways/razorpay/razorpay.types';

export const PAYMENT_WEBHOOKS_QUEUE = 'payment-webhooks';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(PAYMENT_WEBHOOKS_QUEUE) private readonly webhookQueue: Queue,
  ) {}

  /**
   * Durable webhook inbox:
   * 1. Verifies HMAC-SHA256 signature against the exact raw HTTP body BEFORE parsing JSON.
   * 2. Enforces unique (provider, eventId) in PostgreSQL to reject/deduplicate replays.
   * 3. Queues async BullMQ processing and returns fast (< 5s).
   */
  async ingestRazorpayWebhook(params: {
    rawBody: Buffer | string;
    signature?: string;
    eventId?: string;
  }): Promise<{ status: 'ok'; duplicate?: boolean; eventId: string }> {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret', '');
    const previousWebhookSecret = this.configService.get<string>(
      'razorpay.previousWebhookSecret',
    );

    if (!params.signature) {
      throw new BadRequestException({
        code: 'MISSING_WEBHOOK_SIGNATURE',
        message: 'Missing X-Razorpay-Signature header.',
      });
    }

    const sigResult = verifyWebhookSignature({
      rawBody: params.rawBody,
      signature: params.signature,
      webhookSecret,
      previousWebhookSecret,
    });

    if (!sigResult.valid) {
      this.logger.warn('Rejected Razorpay webhook with invalid signature');
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Webhook signature verification failed.',
      });
    }

    if (sigResult.usedPreviousSecret) {
      this.logger.warn(
        'Verified Razorpay webhook using previous rotated webhook secret.',
      );
    }

    let parsed: RazorpayWebhookPayload;
    try {
      const text = Buffer.isBuffer(params.rawBody)
        ? params.rawBody.toString('utf8')
        : params.rawBody;
      parsed = JSON.parse(text) as RazorpayWebhookPayload;
    } catch {
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK_PAYLOAD',
        message: 'Webhook body is not valid JSON.',
      });
    }

    const eventId = params.eventId?.trim();
    if (!eventId) {
      throw new BadRequestException({
        code: 'MISSING_WEBHOOK_EVENT_ID',
        message: 'Missing x-razorpay-event-id header.',
      });
    }

    // Persist durably with unique (provider, eventId) constraint
    let webhookRecordId: string;
    try {
      const created = await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: 'RAZORPAY',
          eventId,
          eventType: parsed.event || 'unknown',
          payload: parsed as unknown as Prisma.InputJsonValue,
          status: 'RECEIVED',
          signatureVerified: true,
        },
      });
      webhookRecordId = created.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.log(`Duplicate Razorpay webhook event ignored: ${eventId}`);
        return { status: 'ok', duplicate: true, eventId };
      }
      throw err;
    }

    // Enqueue async processing (do not block Razorpay 5s response timeout)
    await this.webhookQueue.add(
      'process-razorpay-webhook',
      { webhookRecordId, eventId },
      {
        jobId: `rzp-wh-${eventId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: 200,
      },
    );

    return { status: 'ok', eventId };
  }
}
