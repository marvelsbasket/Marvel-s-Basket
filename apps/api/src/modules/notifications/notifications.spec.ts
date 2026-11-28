import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus, NotificationType } from '@prisma/client';
import * as crypto from 'crypto';
import {
  computeRetryDelayMs,
  isPermanentNotificationFailure,
} from './notifications.constants';
import { NOTIFICATION_EVENTS } from './notifications.events';
import { NotificationPreferencesService } from './notifications.preferences.service';
import { renderNotificationTemplate } from './notifications.templates';
import { ResendWebhookService } from './resend-webhook.service';

describe('Phase 17 Notifications Unit Suite', () => {
  describe('Event catalog & templates', () => {
    it('marks security and financial events as mandatory and promotion as optional', () => {
      expect(NOTIFICATION_EVENTS.ACCOUNT_PASSWORD_CHANGED.isMandatory).toBe(true);
      expect(NOTIFICATION_EVENTS.PAYMENT_SUCCEEDED.isMandatory).toBe(true);
      expect(NOTIFICATION_EVENTS.PROMOTION_ANNOUNCEMENT.isMandatory).toBe(false);
    });

    it('escapes HTML in rendered email templates and strips unsafe actionUrl', () => {
      const rendered = renderNotificationTemplate('ORDER_PLACED_CUSTOMER', {
        orderNumber: '<script>alert(1)</script>',
        storeName: 'Fresh & Pure',
        totalAmount: 249.5,
        actionUrl: '//evil.example/phish',
      });

      expect(rendered.emailHtml).not.toContain('<script>');
      expect(rendered.emailHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(rendered.actionUrl).toBe('/orders');
    });
  });

  describe('Retry classification & jittered backoff', () => {
    it('classifies invalid email and bounced errors as permanent', () => {
      expect(isPermanentNotificationFailure('Invalid email address')).toBe(true);
      expect(isPermanentNotificationFailure('Recipient bounced')).toBe(true);
      expect(isPermanentNotificationFailure('ETIMEDOUT socket hang up')).toBe(false);
    });

    it('computes bounded exponential delay with jitter', () => {
      const d1 = computeRetryDelayMs(1);
      const d3 = computeRetryDelayMs(3);
      expect(d1).toBeGreaterThanOrEqual(1600);
      expect(d1).toBeLessThanOrEqual(2400);
      expect(d3).toBeGreaterThanOrEqual(6400);
      expect(d3).toBeLessThanOrEqual(9600);
    });
  });

  describe('NotificationPreferencesService', () => {
    it('allows mandatory notifications even if user opted out of channel/category', async () => {
      const prisma = {
        notificationPreference: { findUnique: jest.fn().mockResolvedValue({ isEnabled: false }) },
        notificationCategoryPreference: {
          findUnique: jest.fn().mockResolvedValue({ isEnabled: false }),
        },
      } as any;
      const service = new NotificationPreferencesService(prisma);

      const allowed = await service.isChannelAllowedForUser({
        userId: 'u1',
        channel: NotificationChannel.EMAIL,
        category: NotificationType.PAYMENT,
        isMandatory: true,
      });
      expect(allowed).toBe(true);
    });

    it('blocks optional notifications when category preference is disabled', async () => {
      const prisma = {
        notificationPreference: { findUnique: jest.fn().mockResolvedValue({ isEnabled: true }) },
        notificationCategoryPreference: {
          findUnique: jest.fn().mockResolvedValue({ isEnabled: false }),
        },
      } as any;
      const service = new NotificationPreferencesService(prisma);

      const allowed = await service.isChannelAllowedForUser({
        userId: 'u1',
        channel: NotificationChannel.EMAIL,
        category: NotificationType.PROMOTION,
        isMandatory: false,
      });
      expect(allowed).toBe(false);
    });
  });

  describe('ResendWebhookService', () => {
    const secret = 'whsec_' + Buffer.from('test-webhook-secret-key-32bytes!').toString('base64');
    const configService = {
      get: jest.fn().mockReturnValue(secret),
    } as any;

    it('verifies valid Svix HMAC signature and rejects tampered payload', () => {
      const service = new ResendWebhookService({} as any, configService);
      const rawBody = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_123' } });
      const svixId = 'msg_1';
      const svixTimestamp = String(Math.floor(Date.now() / 1000));
      const keyBytes = Buffer.from(secret.slice(6), 'base64');
      const sig = crypto
        .createHmac('sha256', keyBytes)
        .update(`${svixId}.${svixTimestamp}.${rawBody}`)
        .digest('base64');

      expect(() =>
        service.verifySignature({
          rawBody,
          svixId,
          svixTimestamp,
          svixSignature: `v1,${sig}`,
        }),
      ).not.toThrow();

      expect(() =>
        service.verifySignature({
          rawBody,
          svixId,
          svixTimestamp,
          svixSignature: 'v1,invalid_signature',
        }),
      ).toThrow(UnauthorizedException);
    });

    it('rejects expired timestamps outside replay window', () => {
      const service = new ResendWebhookService({} as any, configService);
      expect(() =>
        service.verifySignature({
          rawBody: '{}',
          svixId: 'msg_1',
          svixTimestamp: String(Math.floor(Date.now() / 1000) - 900),
          svixSignature: 'v1,abc',
        }),
      ).toThrow(BadRequestException);
    });

    it('prevents stale email.sent webhook from overwriting DELIVERED state', async () => {
      const update = jest.fn();
      const prisma = {
        notificationDelivery: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'del-1',
            status: NotificationDeliveryStatus.DELIVERED,
            isPermanentFailure: false,
            failureReason: null,
            deliveredAt: new Date(),
          }),
          update,
        },
      } as any;
      const service = new ResendWebhookService(prisma, configService);

      const res = await service.processWebhookEvent({
        type: 'email.sent',
        data: { email_id: 're_123' },
      });

      expect(res.updated).toBe(false);
      expect(update).not.toHaveBeenCalled();
    });
  });
});
