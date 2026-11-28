import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  OutboxEventStatus,
  Prisma,
} from '@prisma/client';
import { Queue } from 'bullmq';
import {
  AdminNotificationDeliveryItem,
  AdminNotificationHealthResponse,
  AdminOutboxEventItem,
  NotificationItem,
  PaginatedAdminDeliveriesResponse,
  PaginatedAdminOutboxResponse,
  PaginatedNotificationsResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { AdminDeliveriesQueryDto, ListNotificationsQueryDto } from './dto/notifications.dto';
import {
  NOTIFICATION_JOB_BASE_DELAY_MS,
  NOTIFICATION_JOB_MAX_ATTEMPTS,
  NOTIFICATIONS_QUEUE,
  computeRetryDelayMs,
} from './notifications.constants';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NOTIFICATION_EVENTS, NotificationEventKey } from './notifications.events';

export interface PublishNotificationEventInput {
  eventKey: NotificationEventKey;
  aggregateType: string;
  aggregateId: string;
  recipientUserId?: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly dispatcher: NotificationsDispatcher,
    @Optional()
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue?: Queue,
  ) {}

  /**
   * Persists an OutboxEvent inside an existing Prisma transaction so notification
   * generation is atomic with the business state change.
   */
  async recordOutboxEventInTx(
    tx: Prisma.TransactionClient,
    input: PublishNotificationEventInput,
  ) {
    return tx.outboxEvent.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        eventKey: input.eventKey,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        recipientUserId: input.recipientUserId ?? null,
        payload: input.payload as object,
        idempotencyKey: input.idempotencyKey,
        status: OutboxEventStatus.PENDING,
      },
      update: {},
    });
  }

  /**
   * Non-blocking helper for callers outside a transaction: records the outbox event
   * and enqueues it on BullMQ without ever throwing to the caller.
   */
  async publishEvent(input: PublishNotificationEventInput): Promise<void> {
    try {
      const event = await this.prisma.outboxEvent.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        create: {
          eventKey: input.eventKey,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          recipientUserId: input.recipientUserId ?? null,
          payload: input.payload as object,
          idempotencyKey: input.idempotencyKey,
          status: OutboxEventStatus.PENDING,
        },
        update: {},
      });

      await this.enqueueOutboxEvent(event.id, event.idempotencyKey);
    } catch (err) {
      this.logger.warn(
        `Non-blocking notification publish failed for ${input.eventKey}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Enqueues an already-committed OutboxEvent onto BullMQ. Safe if Redis is down
   * because NotificationOutboxWorker will sweep PENDING records.
   */
  async enqueueOutboxEvent(outboxEventId: string, idempotencyKey: string): Promise<void> {
    if (!this.notificationsQueue) {
      // Fallback inline execution when queue is absent (e.g., isolated unit specs)
      await this.processOutboxEvent(outboxEventId);
      return;
    }

    try {
      await this.notificationsQueue.add(
        'dispatch-notification',
        { outboxEventId },
        {
          jobId: idempotencyKey.replace(/:/g, '_'),
          attempts: NOTIFICATION_JOB_MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: NOTIFICATION_JOB_BASE_DELAY_MS,
          },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
      await this.prisma.outboxEvent.updateMany({
        where: { id: outboxEventId, status: OutboxEventStatus.PENDING },
        data: { status: OutboxEventStatus.PUBLISHED },
      });
    } catch (err) {
      this.logger.warn(
        `Redis enqueue failed for outbox ${outboxEventId}; outbox worker will recover: ${(err as Error).message}`,
      );
    }
  }

  async processOutboxEvent(outboxEventId: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxEventId },
    });
    if (!event || event.status === OutboxEventStatus.PROCESSED) {
      return;
    }

    try {
      const { hasTransientFailure } = await this.dispatcher.dispatchOutboxEvent(event);
      if (hasTransientFailure) {
        const nextAttempt = event.attempts + 1;
        const exhausted = nextAttempt >= NOTIFICATION_JOB_MAX_ATTEMPTS;
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: exhausted ? OutboxEventStatus.FAILED : OutboxEventStatus.PENDING,
            attempts: nextAttempt,
            lastAttemptAt: new Date(),
            nextRetryAt: exhausted ? null : new Date(Date.now() + computeRetryDelayMs(nextAttempt)),
            errorMessage: 'Transient external channel delivery failure',
          },
        });
        if (!exhausted) {
          throw new Error('Transient external channel delivery failure');
        }
        return;
      }

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxEventStatus.PROCESSED,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (err) {
      const msg = (err as Error).message;
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxEventStatus.FAILED,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          errorMessage: msg,
        },
      });
      throw err;
    }
  }

  async listUserNotifications(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotificationsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: NotificationChannel.IN_APP,
      dismissedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId,
          channel: NotificationChannel.IN_APP,
          dismissedAt: null,
          isRead: false,
        },
      }),
    ]);

    return {
      items: items.map((n) => this.mapNotification(n)),
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        dismissedAt: null,
        isRead: false,
      },
    });
    return { unreadCount };
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationItem> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, dismissedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = existing.isRead
      ? existing
      : await this.prisma.notification.update({
          where: { id: existing.id },
          data: { isRead: true, readAt: new Date() },
        });

    return this.mapNotification(updated);
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const res = await this.prisma.notification.updateMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        dismissedAt: null,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: res.count };
  }

  async dismissNotification(userId: string, notificationId: string): Promise<{ dismissed: true }> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, dismissedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    await this.prisma.notification.update({
      where: { id: existing.id },
      data: { dismissedAt: new Date(), isRead: true, readAt: existing.readAt ?? new Date() },
    });
    return { dismissed: true };
  }

  // Admin monitoring & recovery
  async adminListDeliveries(
    query: AdminDeliveriesQueryDto,
  ): Promise<PaginatedAdminDeliveriesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationDeliveryWhereInput = {
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventKey ? { eventKey: query.eventKey } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);

    return {
      items: items.map((d): AdminNotificationDeliveryItem => ({
        id: d.id,
        outboxEventId: d.outboxEventId,
        recipientUserId: d.recipientUserId,
        eventKey: d.eventKey,
        channel: d.channel,
        templateId: d.templateId,
        provider: d.provider,
        providerMessageId: d.providerMessageId,
        status: d.status,
        attemptCount: d.attemptCount,
        lastAttemptAt: d.lastAttemptAt ? d.lastAttemptAt.toISOString() : null,
        sentAt: d.sentAt ? d.sentAt.toISOString() : null,
        deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
        failureReason: d.failureReason,
        isPermanentFailure: d.isPermanentFailure,
        createdAt: d.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async adminListOutbox(page = 1, limit = 25): Promise<PaginatedAdminOutboxResponse> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.outboxEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.outboxEvent.count(),
    ]);

    return {
      items: items.map((e): AdminOutboxEventItem => ({
        id: e.id,
        eventKey: e.eventKey,
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        recipientUserId: e.recipientUserId,
        status: e.status,
        attempts: e.attempts,
        lastAttemptAt: e.lastAttemptAt ? e.lastAttemptAt.toISOString() : null,
        processedAt: e.processedAt ? e.processedAt.toISOString() : null,
        errorMessage: e.errorMessage,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async adminGetHealth(): Promise<AdminNotificationHealthResponse> {
    const [pendingOutbox, failedOutbox, failedDeliveries, bouncedDeliveries, complainedDeliveries] =
      await Promise.all([
        this.prisma.outboxEvent.count({ where: { status: OutboxEventStatus.PENDING } }),
        this.prisma.outboxEvent.count({ where: { status: OutboxEventStatus.FAILED } }),
        this.prisma.notificationDelivery.count({
          where: { status: NotificationDeliveryStatus.FAILED },
        }),
        this.prisma.notificationDelivery.count({
          where: { status: NotificationDeliveryStatus.BOUNCED },
        }),
        this.prisma.notificationDelivery.count({
          where: { status: NotificationDeliveryStatus.COMPLAINED },
        }),
      ]);

    let queueStats: AdminNotificationHealthResponse['queue'] = null;
    if (this.notificationsQueue) {
      try {
        const counts = await this.notificationsQueue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        );
        queueStats = {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        };
      } catch {
        queueStats = null;
      }
    }

    return {
      enabled: this.configService.get<boolean>('notifications.enabled', true),
      channels: {
        inApp: this.configService.get<boolean>('notifications.inAppEnabled', true),
        email: this.configService.get<boolean>('notifications.emailEnabled', true),
        sms: this.configService.get<boolean>('notifications.smsEnabled', false),
        push: this.configService.get<boolean>('notifications.pushEnabled', false),
      },
      queue: queueStats,
      outbox: {
        pending: pendingOutbox,
        failed: failedOutbox,
      },
      deliveries: {
        failed: failedDeliveries,
        bounced: bouncedDeliveries,
        complained: complainedDeliveries,
      },
    };
  }

  async adminRetryDelivery(deliveryId: string): Promise<{ requeued: boolean }> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) {
      throw new NotFoundException('Notification delivery record not found.');
    }
    if (
      delivery.status === NotificationDeliveryStatus.DELIVERED ||
      delivery.status === NotificationDeliveryStatus.SENT
    ) {
      throw new BadRequestException('Delivery has already succeeded and cannot be retried.');
    }
    if (!delivery.outboxEventId) {
      throw new BadRequestException('Delivery has no associated outbox event.');
    }

    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: NotificationDeliveryStatus.RETRY_SCHEDULED,
        isPermanentFailure: false,
      },
    });

    await this.prisma.outboxEvent.update({
      where: { id: delivery.outboxEventId },
      data: { status: OutboxEventStatus.PENDING },
    });

    await this.processOutboxEvent(delivery.outboxEventId);
    return { requeued: true };
  }

  getEventCatalog() {
    return Object.values(NOTIFICATION_EVENTS);
  }

  private mapNotification(n: {
    id: string;
    type: NotificationItem['type'];
    channel: NotificationItem['channel'];
    priority: NotificationItem['priority'];
    eventKey: string | null;
    title: string;
    message: string;
    actionUrl: string | null;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    metadata: unknown;
    isRead: boolean;
    readAt: Date | null;
    sentAt: Date;
    createdAt: Date;
  }): NotificationItem {
    return {
      id: n.id,
      type: n.type,
      channel: n.channel,
      priority: n.priority,
      eventKey: n.eventKey,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl,
      relatedEntityType: n.relatedEntityType,
      relatedEntityId: n.relatedEntityId,
      metadata: (n.metadata as Record<string, unknown> | null) ?? null,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      sentAt: n.sentAt.toISOString(),
      createdAt: n.createdAt.toISOString(),
    };
  }
}
