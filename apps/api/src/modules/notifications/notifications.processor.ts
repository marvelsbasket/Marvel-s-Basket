import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE, { concurrency: 5 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<{ outboxEventId: string }>): Promise<void> {
    const { outboxEventId } = job.data;
    try {
      await this.notificationsService.processOutboxEvent(outboxEventId);
    } catch (err) {
      this.logger.warn(
        `Notification job ${job.id} failed for outbox ${outboxEventId} (attempt ${job.attemptsMade + 1}): ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
