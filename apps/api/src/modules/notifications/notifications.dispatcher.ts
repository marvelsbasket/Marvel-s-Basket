import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  OutboxEvent,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import {
  DisabledPushProvider,
  DisabledSmsProvider,
  IPushProvider,
  ISmsProvider,
} from './channels/channel.interfaces';
import { isPermanentNotificationFailure } from './notifications.constants';
import { NOTIFICATION_EVENTS, NotificationEventKey } from './notifications.events';
import { NotificationPreferencesService } from './notifications.preferences.service';
import { renderNotificationTemplate } from './notifications.templates';

@Injectable()
export class NotificationsDispatcher {
  private readonly logger = new Logger(NotificationsDispatcher.name);
  private readonly smsProvider: ISmsProvider = new DisabledSmsProvider();
  private readonly pushProvider: IPushProvider = new DisabledPushProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly preferencesService: NotificationPreferencesService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  private isChannelGloballyEnabled(channel: NotificationChannel): boolean {
    if (!this.configService.get<boolean>('notifications.enabled', true)) {
      return false;
    }
    switch (channel) {
      case NotificationChannel.IN_APP:
        return this.configService.get<boolean>('notifications.inAppEnabled', true);
      case NotificationChannel.EMAIL:
        return this.configService.get<boolean>('notifications.emailEnabled', true);
      case NotificationChannel.SMS:
        return this.configService.get<boolean>('notifications.smsEnabled', false);
      case NotificationChannel.PUSH:
        return this.configService.get<boolean>('notifications.pushEnabled', false);
      default:
        return false;
    }
  }

  async dispatchOutboxEvent(outboxEvent: OutboxEvent): Promise<{ hasTransientFailure: boolean }> {
    const eventDef = NOTIFICATION_EVENTS[outboxEvent.eventKey as NotificationEventKey];
    if (!eventDef) {
      this.logger.warn(`Unknown notification eventKey=${outboxEvent.eventKey}; skipping.`);
      return { hasTransientFailure: false };
    }

    const payload = (outboxEvent.payload ?? {}) as Record<string, unknown>;
    const recipientUserIds = await this.resolveRecipients(outboxEvent, eventDef.recipientRole);

    if (recipientUserIds.length === 0) {
      return { hasTransientFailure: false };
    }

    const rendered = renderNotificationTemplate(outboxEvent.eventKey as NotificationEventKey, payload);
    let hasTransientFailure = false;

    for (const userId of recipientUserIds) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true },
      });
      if (!user) continue;

      let createdInAppNotificationId: string | null = null;

      for (const channel of eventDef.channels) {
        const deliveryKey = `${outboxEvent.idempotencyKey}:${user.id}:${channel}`;
        const existingDelivery = await this.prisma.notificationDelivery.findUnique({
          where: { idempotencyKey: deliveryKey },
        });

        if (
          existingDelivery &&
          (existingDelivery.status === NotificationDeliveryStatus.SENT ||
            existingDelivery.status === NotificationDeliveryStatus.DELIVERED ||
            existingDelivery.status === NotificationDeliveryStatus.SKIPPED ||
            existingDelivery.isPermanentFailure)
        ) {
          continue;
        }

        const globallyEnabled = this.isChannelGloballyEnabled(channel);
        const userAllowed = globallyEnabled
          ? await this.preferencesService.isChannelAllowedForUser({
              userId: user.id,
              channel,
              category: eventDef.category,
              isMandatory: eventDef.isMandatory,
            })
          : false;

        if (!globallyEnabled || !userAllowed) {
          await this.upsertDeliveryRecord({
            deliveryKey,
            outboxEventId: outboxEvent.id,
            notificationId: createdInAppNotificationId,
            recipientUserId: user.id,
            eventKey: eventDef.eventKey,
            channel,
            templateId: eventDef.templateId,
            provider: globallyEnabled ? 'preference_opt_out' : 'channel_disabled',
            status: NotificationDeliveryStatus.SKIPPED,
            failureReason: globallyEnabled
              ? 'Skipped due to user notification preferences'
              : 'Channel disabled by configuration',
          });
          continue;
        }

        if (channel === NotificationChannel.IN_APP) {
          const inAppIdempotencyKey = `${outboxEvent.idempotencyKey}:${user.id}:IN_APP`;
          const notification = await this.prisma.notification.upsert({
            where: { idempotencyKey: inAppIdempotencyKey },
            create: {
              userId: user.id,
              type: eventDef.category,
              channel: NotificationChannel.IN_APP,
              priority: eventDef.priority,
              eventKey: eventDef.eventKey,
              title: rendered.title,
              message: rendered.message,
              actionUrl: rendered.actionUrl,
              relatedEntityType: outboxEvent.aggregateType,
              relatedEntityId: outboxEvent.aggregateId,
              metadata: payload as object,
              idempotencyKey: inAppIdempotencyKey,
            },
            update: {},
          });
          createdInAppNotificationId = notification.id;

          await this.upsertDeliveryRecord({
            deliveryKey,
            outboxEventId: outboxEvent.id,
            notificationId: notification.id,
            recipientUserId: user.id,
            eventKey: eventDef.eventKey,
            channel,
            templateId: eventDef.templateId,
            provider: 'postgres_in_app',
            providerMessageId: notification.id,
            status: NotificationDeliveryStatus.DELIVERED,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });
        } else if (channel === NotificationChannel.EMAIL) {
          const transient = await this.dispatchEmailChannel({
            deliveryKey,
            outboxEventId: outboxEvent.id,
            notificationId: createdInAppNotificationId,
            recipientUserId: user.id,
            recipientEmail: user.email,
            eventKey: eventDef.eventKey,
            templateId: eventDef.templateId,
            subject: rendered.emailSubject,
            html: rendered.emailHtml,
            text: rendered.emailText,
          });
          if (transient) hasTransientFailure = true;
        } else if (channel === NotificationChannel.SMS) {
          const res = await this.smsProvider.sendSms({
            toPhone: '',
            templateId: eventDef.templateId,
            body: rendered.message,
          });
          await this.upsertDeliveryRecord({
            deliveryKey,
            outboxEventId: outboxEvent.id,
            notificationId: createdInAppNotificationId,
            recipientUserId: user.id,
            eventKey: eventDef.eventKey,
            channel,
            templateId: eventDef.templateId,
            provider: res.provider,
            status: NotificationDeliveryStatus.SKIPPED,
            failureReason: res.error,
          });
        } else if (channel === NotificationChannel.PUSH) {
          const res = await this.pushProvider.sendPush({
            userId: user.id,
            title: rendered.title,
            body: rendered.message,
            actionUrl: rendered.actionUrl,
          });
          await this.upsertDeliveryRecord({
            deliveryKey,
            outboxEventId: outboxEvent.id,
            notificationId: createdInAppNotificationId,
            recipientUserId: user.id,
            eventKey: eventDef.eventKey,
            channel,
            templateId: eventDef.templateId,
            provider: res.provider,
            status: NotificationDeliveryStatus.SKIPPED,
            failureReason: res.error,
          });
        }
      }
    }

    return { hasTransientFailure };
  }

  private async dispatchEmailChannel(params: {
    deliveryKey: string;
    outboxEventId: string;
    notificationId: string | null;
    recipientUserId: string;
    recipientEmail: string | null;
    eventKey: string;
    templateId: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    if (!params.recipientEmail || !this.emailService) {
      await this.upsertDeliveryRecord({
        deliveryKey: params.deliveryKey,
        outboxEventId: params.outboxEventId,
        notificationId: params.notificationId,
        recipientUserId: params.recipientUserId,
        eventKey: params.eventKey,
        channel: NotificationChannel.EMAIL,
        templateId: params.templateId,
        provider: 'resend',
        status: NotificationDeliveryStatus.FAILED,
        isPermanentFailure: true,
        failureReason: !params.recipientEmail
          ? 'Recipient email address missing'
          : 'EmailService unavailable',
      });
      return false;
    }

    const res = await this.emailService.sendEmail({
      to: params.recipientEmail,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (res.success) {
      await this.upsertDeliveryRecord({
        deliveryKey: params.deliveryKey,
        outboxEventId: params.outboxEventId,
        notificationId: params.notificationId,
        recipientUserId: params.recipientUserId,
        eventKey: params.eventKey,
        channel: NotificationChannel.EMAIL,
        templateId: params.templateId,
        provider: 'resend',
        providerMessageId: res.messageId ?? null,
        status: NotificationDeliveryStatus.SENT,
        sentAt: new Date(),
      });
      return false;
    }

    const errorReason = res.error || 'Email delivery failed';
    const isPermanent = isPermanentNotificationFailure(errorReason);
    await this.upsertDeliveryRecord({
      deliveryKey: params.deliveryKey,
      outboxEventId: params.outboxEventId,
      notificationId: params.notificationId,
      recipientUserId: params.recipientUserId,
      eventKey: params.eventKey,
      channel: NotificationChannel.EMAIL,
      templateId: params.templateId,
      provider: 'resend',
      status: isPermanent
        ? NotificationDeliveryStatus.FAILED
        : NotificationDeliveryStatus.RETRY_SCHEDULED,
      isPermanentFailure: isPermanent,
      failureReason: errorReason,
    });
    return !isPermanent;
  }

  private async resolveRecipients(
    outboxEvent: OutboxEvent,
    recipientRole: 'CUSTOMER' | 'SELLER' | 'ADMIN',
  ): Promise<string[]> {
    if (outboxEvent.recipientUserId) {
      return [outboxEvent.recipientUserId];
    }

    if (recipientRole === 'ADMIN') {
      const admins = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: { roleType: { in: [UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN] } },
            },
          },
          status: 'ACTIVE',
        },
        select: { id: true },
        take: 20,
      });
      return admins.map((a) => a.id);
    }

    return [];
  }

  private async upsertDeliveryRecord(params: {
    deliveryKey: string;
    outboxEventId: string;
    notificationId: string | null;
    recipientUserId: string;
    eventKey: string;
    channel: NotificationChannel;
    templateId: string;
    provider: string;
    providerMessageId?: string | null;
    status: NotificationDeliveryStatus;
    isPermanentFailure?: boolean;
    failureReason?: string | null;
    sentAt?: Date;
    deliveredAt?: Date;
  }) {
    const now = new Date();
    await this.prisma.notificationDelivery.upsert({
      where: { idempotencyKey: params.deliveryKey },
      create: {
        outboxEventId: params.outboxEventId,
        notificationId: params.notificationId,
        recipientUserId: params.recipientUserId,
        eventKey: params.eventKey,
        channel: params.channel,
        templateId: params.templateId,
        provider: params.provider,
        providerMessageId: params.providerMessageId ?? null,
        status: params.status,
        attemptCount: 1,
        lastAttemptAt: now,
        sentAt: params.sentAt ?? null,
        deliveredAt: params.deliveredAt ?? null,
        failureReason: params.failureReason ?? null,
        isPermanentFailure: params.isPermanentFailure ?? false,
        idempotencyKey: params.deliveryKey,
      },
      update: {
        notificationId: params.notificationId ?? undefined,
        provider: params.provider,
        providerMessageId: params.providerMessageId ?? undefined,
        status: params.status,
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
        sentAt: params.sentAt ?? undefined,
        deliveredAt: params.deliveredAt ?? undefined,
        failureReason: params.failureReason ?? null,
        isPermanentFailure: params.isPermanentFailure ?? false,
      },
    });
  }
}
