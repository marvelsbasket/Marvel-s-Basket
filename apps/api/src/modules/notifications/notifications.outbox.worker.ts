import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OutboxEventStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { RedisService } from '../../cache/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationOutboxWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationOutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;
  private readonly workerId = crypto.randomUUID();
  private readonly LOCK_KEY = 'lock:notification_outbox_sweep';
  private readonly LOCK_TTL_MS = 25000;
  private readonly INTERVAL_MS = 30000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.logger.log(`Starting NotificationOutboxWorker [Worker ID: ${this.workerId}]`);
    this.timer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.sweepPendingOutbox();
      }
    }, this.INTERVAL_MS);
  }

  onApplicationShutdown() {
    this.isShuttingDown = true;
    this.logger.log('Stopping NotificationOutboxWorker');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async sweepPendingOutbox(): Promise<number> {
    if (this.isRunning || this.isShuttingDown) return 0;
    this.isRunning = true;
    let hasLock = false;

    try {
      const client = this.redisService.getClient();
      if (client) {
        const acquired = await client.set(
          this.LOCK_KEY,
          this.workerId,
          'PX',
          this.LOCK_TTL_MS,
          'NX',
        );
        if (!acquired) return 0;
        hasLock = true;
      }

      const now = new Date();
      const pending = await this.prisma.outboxEvent.findMany({
        where: {
          status: OutboxEventStatus.PENDING,
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const evt of pending) {
        if (this.isShuttingDown) break;
        try {
          await this.notificationsService.enqueueOutboxEvent(evt.id, evt.idempotencyKey);
        } catch (err) {
          this.logger.warn(`Outbox sweep failed for ${evt.id}: ${(err as Error).message}`);
        }
      }

      return pending.length;
    } catch (err) {
      this.logger.error('Error in NotificationOutboxWorker sweep:', err);
      return 0;
    } finally {
      if (hasLock) {
        try {
          const client = this.redisService.getClient();
          if (client) {
            await client.eval(
              `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
              1,
              this.LOCK_KEY,
              this.workerId,
            );
          }
        } catch {
          // Ignore lock cleanup failure
        }
      }
      this.isRunning = false;
    }
  }
}
