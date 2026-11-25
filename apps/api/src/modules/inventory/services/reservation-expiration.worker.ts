import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { RedisService } from '../../../cache/redis.service';
import { InventoryReservationService } from './inventory-reservation.service';
import * as crypto from 'crypto';

@Injectable()
export class ReservationExpirationWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ReservationExpirationWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;
  private readonly workerId = crypto.randomUUID();
  private readonly LOCK_KEY = 'lock:reservation_expiration';
  private readonly LOCK_TTL_SECONDS = 50;
  private readonly INTERVAL_MS = 60 * 1000; // Run every 60 seconds

  constructor(
    private readonly redisService: RedisService,
    private readonly reservationService: InventoryReservationService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.logger.log(`Starting ReservationExpirationWorker [Worker ID: ${this.workerId}]`);
    // Run initial recovery sweep after short startup delay (5s), then every 60s
    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.processExpiredReservations();
      }
    }, 5000);
    this.timer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.processExpiredReservations();
      }
    }, this.INTERVAL_MS);
  }

  onApplicationShutdown() {
    this.isShuttingDown = true;
    this.logger.log('Stopping ReservationExpirationWorker');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Main periodic task with distributed locking to prevent duplicate runs across instances.
   */
  async processExpiredReservations(): Promise<number> {
    if (this.isRunning || this.isShuttingDown) return 0;
    this.isRunning = true;

    let hasLock = false;

    try {
      // 1. Acquire Distributed Lock with NX and EX
      const client = this.redisService.getClient();
      if (client) {
        const acquired = await client.set(
          this.LOCK_KEY,
          this.workerId,
          'PX',
          this.LOCK_TTL_SECONDS * 1000,
          'NX',
        );
        if (!acquired) {
          // Another instance is already processing the batch
          return 0;
        }
        hasLock = true;
      }

      // 2. Process expired reservations in bounded batches (50 items)
      const res = await this.reservationService.expireReservations(50);
      return res.releasedCount;
    } catch (err) {
      this.logger.error('Error during reservation expiration worker execution:', err);
      return 0;
    } finally {
      // 3. Release distributed lock safely if owned
      if (hasLock) {
        try {
          const client = this.redisService.getClient();
          if (client) {
            // Lua script to atomically release lock only if owned by this worker
            const releaseScript = `
              if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
              else
                return 0
              end
            `;
            await client.eval(releaseScript, 1, this.LOCK_KEY, this.workerId);
          }
        } catch (lockErr) {
          this.logger.warn('Error releasing expiration worker lock:', lockErr);
        }
      }
      this.isRunning = false;
    }
  }
}
