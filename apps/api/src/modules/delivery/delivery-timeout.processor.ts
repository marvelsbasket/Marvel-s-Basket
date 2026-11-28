import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DeliveryAssignmentStatus, DeliveryStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { DELIVERY_OPERATIONS_QUEUE } from './delivery.service';

@Processor(DELIVERY_OPERATIONS_QUEUE)
export class DeliveryTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(DeliveryTimeoutProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<{ assignmentId: string; deliveryId: string }>,
  ): Promise<void> {
    if (job.name !== 'assignment-timeout') return;

    const { assignmentId, deliveryId } = job.data;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.deliveryAssignment.findUnique({
        where: { id: assignmentId },
      });
      if (!assignment || assignment.status !== DeliveryAssignmentStatus.OFFERED) {
        return;
      }

      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
      });
      if (!delivery || delivery.status !== DeliveryStatus.ASSIGNED) {
        return;
      }

      await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: { status: DeliveryAssignmentStatus.EXPIRED, respondedAt: now },
      });

      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          deliveryPartnerId: null,
          status: DeliveryStatus.READY_FOR_PICKUP,
        },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: DeliveryStatus.ASSIGNED,
          newStatus: DeliveryStatus.READY_FOR_PICKUP,
          actorRole: 'SYSTEM',
          note: 'Rider assignment offer timed out; reverted to READY_FOR_PICKUP for reassignment',
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.READY_FOR_PICKUP },
      });

      this.logger.log(
        `Expired unaccepted delivery assignment ${assignmentId} for delivery ${deliveryId}`,
      );
    });
  }
}
