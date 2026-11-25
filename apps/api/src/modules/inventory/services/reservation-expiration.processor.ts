import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  InventoryReservationService,
  RESERVATION_EXPIRATION_QUEUE,
} from './inventory-reservation.service';

export interface ExpireReservationJobData {
  checkoutSessionId: string;
}

@Processor(RESERVATION_EXPIRATION_QUEUE)
export class ReservationExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservationExpirationProcessor.name);

  constructor(private readonly reservationService: InventoryReservationService) {
    super();
  }

  async process(job: Job<ExpireReservationJobData | Record<string, never>>): Promise<unknown> {
    if (job.name === 'expire-checkout-reservation') {
      const { checkoutSessionId } = job.data as ExpireReservationJobData;
      if (!checkoutSessionId) {
        return { skipped: true, reason: 'Missing checkoutSessionId' };
      }
      this.logger.debug(`Processing BullMQ expiration job for session ${checkoutSessionId}`);
      return this.reservationService.expireSessionReservation(checkoutSessionId);
    }

    if (job.name === 'reconcile-expired-reservations') {
      return this.reservationService.expireReservations(50);
    }

    this.logger.warn(`Unknown BullMQ job name received: ${job.name}`);
    return { skipped: true };
  }
}
