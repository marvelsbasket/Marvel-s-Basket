import { Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationChannel, NotificationType, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrderNotificationsService {
  private readonly logger = new Logger(OrderNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  private async createInAppNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          channel: NotificationChannel.IN_APP,
          title: params.title,
          message: params.message,
          metadata: (params.metadata || {}) as object,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to create in-app notification: ${(err as Error).message}`);
    }
  }

  private async sendOrderEmail(to: string | null | undefined, subject: string, text: string) {
    if (!this.emailService || !to) return;
    try {
      await this.emailService.sendEmail({
        to,
        subject,
        text,
        html: `<div style="font-family:sans-serif;line-height:1.5;color:#111827;"><p>${text.replace(/\n/g, '<br/>')}</p><p style="color:#6b7280;font-size:12px;">Marvel's Basket</p></div>`,
      });
    } catch (err) {
      this.logger.warn(`Failed to send order email to ${to}: ${(err as Error).message}`);
    }
  }

  async notifyOrderPlaced(params: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    customerEmail?: string | null;
    sellerOwnerUserId: string;
    sellerEmail?: string | null;
    storeName: string;
    totalAmount: number;
  }): Promise<void> {
    await Promise.allSettled([
      this.createInAppNotification({
        userId: params.customerId,
        type: NotificationType.ORDER,
        title: `Order ${params.orderNumber} placed`,
        message: `Your order of ₹${params.totalAmount.toFixed(2)} from ${params.storeName} has been placed.`,
        metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
      }),
      this.createInAppNotification({
        userId: params.sellerOwnerUserId,
        type: NotificationType.ORDER,
        title: `New order ${params.orderNumber}`,
        message: `You received a new order of ₹${params.totalAmount.toFixed(2)}. Please review and accept.`,
        metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
      }),
      this.sendOrderEmail(
        params.customerEmail,
        `Order ${params.orderNumber} placed — Marvel's Basket`,
        `Your order ${params.orderNumber} from ${params.storeName} for ₹${params.totalAmount.toFixed(2)} has been placed and is awaiting store confirmation.`,
      ),
      this.sendOrderEmail(
        params.sellerEmail,
        `New Order ${params.orderNumber} received — Marvel's Basket`,
        `A new order (${params.orderNumber}) for ₹${params.totalAmount.toFixed(2)} has been placed at ${params.storeName}. Open your Seller Orders dashboard to accept and pack.`,
      ),
    ]);
  }

  async notifyOrderStatusChanged(params: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    customerEmail?: string | null;
    sellerOwnerUserId?: string | null;
    storeName: string;
    newStatus: OrderStatus;
    reason?: string | null;
  }): Promise<void> {
    const statusLabelMap: Partial<Record<OrderStatus, string>> = {
      CONFIRMED: 'confirmed by the store',
      PACKED: 'packed and ready for dispatch',
      OUT_FOR_DELIVERY: 'out for delivery',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      REJECTED: 'rejected by the store',
      FAILED: 'marked as delivery failed',
    };

    const label = statusLabelMap[params.newStatus] || params.newStatus.toLowerCase();
    const reasonSuffix = params.reason ? ` Reason: ${params.reason}` : '';
    const message = `Your order ${params.orderNumber} from ${params.storeName} is now ${label}.${reasonSuffix}`;

    const tasks: Promise<unknown>[] = [
      this.createInAppNotification({
        userId: params.customerId,
        type: NotificationType.ORDER,
        title: `Order ${params.orderNumber} ${label}`,
        message,
        metadata: {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          status: params.newStatus,
        },
      }),
      this.sendOrderEmail(
        params.customerEmail,
        `Order ${params.orderNumber} update — Marvel's Basket`,
        message,
      ),
    ];

    if (params.newStatus === OrderStatus.CANCELLED && params.sellerOwnerUserId) {
      tasks.push(
        this.createInAppNotification({
          userId: params.sellerOwnerUserId,
          type: NotificationType.ORDER,
          title: `Order ${params.orderNumber} cancelled`,
          message: `Order ${params.orderNumber} was cancelled.${reasonSuffix}`,
          metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
        }),
      );
    }

    await Promise.allSettled(tasks);
  }

  async notifyDeliveryEvent(params: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    customerEmail?: string | null;
    storeName: string;
    eventTitle: string;
    message: string;
  }): Promise<void> {
    await Promise.allSettled([
      this.createInAppNotification({
        userId: params.customerId,
        type: NotificationType.DELIVERY,
        title: params.eventTitle,
        message: params.message,
        metadata: {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          storeName: params.storeName,
        },
      }),
      this.sendOrderEmail(
        params.customerEmail,
        `${params.eventTitle} — Marvel's Basket`,
        params.message,
      ),
    ]);
  }
}
