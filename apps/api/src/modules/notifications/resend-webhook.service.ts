import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDeliveryStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

export interface ResendWebhookEventPayload {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    reason?: string;
  };
}

const STATUS_RANK: Record<NotificationDeliveryStatus, number> = {
  PENDING: 0,
  PROCESSING: 1,
  RETRY_SCHEDULED: 1,
  SKIPPED: 2,
  SENT: 3,
  DELIVERED: 4,
  BOUNCED: 5,
  COMPLAINED: 6,
  FAILED: 5,
};

@Injectable()
export class ResendWebhookService {
  private readonly logger = new Logger(ResendWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  verifySignature(params: {
    rawBody: Buffer | string;
    svixId?: string;
    svixTimestamp?: string;
    svixSignature?: string;
  }): void {
    const secret = this.configService.get<string>('notifications.resendWebhookSecret', '');
    if (!secret) {
      throw new UnauthorizedException('Resend webhook secret is not configured.');
    }

    if (!params.svixId || !params.svixTimestamp || !params.svixSignature) {
      throw new UnauthorizedException('Missing webhook signature headers.');
    }

    const tsNum = Number(params.svixTimestamp);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
      throw new BadRequestException('Webhook timestamp is outside the allowed replay window.');
    }

    const rawText = Buffer.isBuffer(params.rawBody)
      ? params.rawBody.toString('utf8')
      : params.rawBody;
    const signedContent = `${params.svixId}.${params.svixTimestamp}.${rawText}`;
    const keyBytes = secret.startsWith('whsec_')
      ? Buffer.from(secret.slice(6), 'base64')
      : Buffer.from(secret, 'utf8');

    const expectedSig = crypto
      .createHmac('sha256', keyBytes)
      .update(signedContent)
      .digest('base64');

    const signatures = params.svixSignature
      .split(' ')
      .map((s) => s.split(',')[1])
      .filter(Boolean);

    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    const matched = signatures.some((sig) => {
      const sigBuf = Buffer.from(sig, 'utf8');
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    });

    if (!matched) {
      throw new UnauthorizedException('Invalid Resend webhook signature.');
    }
  }

  async processWebhookEvent(payload: ResendWebhookEventPayload): Promise<{ updated: boolean }> {
    const emailId = payload.data?.email_id;
    if (!emailId) {
      return { updated: false };
    }

    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: { providerMessageId: emailId },
    });
    if (!delivery) {
      return { updated: false };
    }

    let nextStatus: NotificationDeliveryStatus | null = null;
    let isPermanentFailure = delivery.isPermanentFailure;
    let failureReason = delivery.failureReason;

    switch (payload.type) {
      case 'email.sent':
        nextStatus = NotificationDeliveryStatus.SENT;
        break;
      case 'email.delivered':
        nextStatus = NotificationDeliveryStatus.DELIVERED;
        break;
      case 'email.bounced':
        nextStatus = NotificationDeliveryStatus.BOUNCED;
        isPermanentFailure = true;
        failureReason = payload.data?.reason || 'Email bounced by recipient server';
        break;
      case 'email.complained':
        nextStatus = NotificationDeliveryStatus.COMPLAINED;
        isPermanentFailure = true;
        failureReason = 'Recipient marked email as spam/complaint';
        break;
      case 'email.delivery_delayed':
        nextStatus = NotificationDeliveryStatus.RETRY_SCHEDULED;
        break;
      default:
        return { updated: false };
    }

    // Prevent stale/out-of-order webhooks from regressing newer delivery states.
    if (STATUS_RANK[nextStatus] <= STATUS_RANK[delivery.status]) {
      return { updated: false };
    }

    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: nextStatus,
        isPermanentFailure,
        failureReason,
        deliveredAt:
          nextStatus === NotificationDeliveryStatus.DELIVERED
            ? new Date()
            : delivery.deliveredAt,
        providerMetadata: {
          lastWebhookType: payload.type,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Updated delivery ${delivery.id} -> ${nextStatus} via Resend webhook`);
    return { updated: true };
  }
}
