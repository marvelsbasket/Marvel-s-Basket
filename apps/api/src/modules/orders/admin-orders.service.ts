import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import {
  OrderDetailResponse,
  OrderStatusHistoryItem,
  PaginatedOrdersResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { AdminInterveneOrderDto, QueryOrdersDto } from './dto/orders.dto';
import { assertValidOrderTransition } from './order-state-machine';
import { OrderNotificationsService } from './order-notifications.service';
import { mapOrderDetail, mapOrderSummary } from './order-mapper';

const ADMIN_ORDER_INCLUDE = {
  seller: {
    select: { id: true, businessName: true, storeDisplayName: true, slug: true, ownerUserId: true },
  },
  customer: { select: { id: true, name: true, email: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  complaints: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: InventoryReservationService,
    private readonly notifications: OrderNotificationsService,
  ) {}

  async listOrders(query: QueryOrdersDto): Promise<PaginatedOrdersResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              { storeNameSnapshot: { contains: query.search.trim(), mode: 'insensitive' } },
              { customer: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          seller: { select: { id: true, businessName: true, storeDisplayName: true, slug: true } },
          customer: { select: { id: true, name: true } },
          items: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map(mapOrderSummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ADMIN_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return mapOrderDetail(order);
  }

  async getOrderHistory(orderId: string): Promise<OrderStatusHistoryItem[]> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    const history = await this.prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return history.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      note: h.note || null,
      changedBy: h.changedBy || null,
      actorRole: h.actorRole || null,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  async interveneOrder(
    adminUserId: string,
    orderId: string,
    dto: AdminInterveneOrderDto,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ADMIN_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status === dto.targetStatus) {
      return mapOrderDetail(order);
    }

    assertValidOrderTransition(order.status, dto.targetStatus);

    const now = new Date();
    const isCancelling =
      dto.targetStatus === OrderStatus.CANCELLED || dto.targetStatus === OrderStatus.REJECTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = {
        status: dto.targetStatus,
      };
      if (dto.targetStatus === OrderStatus.CONFIRMED) data.confirmedAt = now;
      if (dto.targetStatus === OrderStatus.PACKED) data.packedAt = now;
      if (dto.targetStatus === OrderStatus.OUT_FOR_DELIVERY) {
        data.dispatchedAt = now;
        data.deliveryStatus = DeliveryStatus.IN_TRANSIT;
      }
      if (dto.targetStatus === OrderStatus.DELIVERED) {
        data.deliveredAt = now;
        data.deliveryStatus = DeliveryStatus.DELIVERED;
      }
      if (isCancelling) {
        data.cancelledAt = now;
        data.cancelledBy = adminUserId;
        data.cancellationReason = dto.reason.trim();
        data.deliveryStatus = DeliveryStatus.CANCELLED;
        if (order.paymentStatus === PaymentStatus.SUCCESS) {
          data.paymentStatus = PaymentStatus.REFUND_PENDING;
        }
      }

      await tx.order.update({ where: { id: order.id }, data });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: dto.targetStatus,
          note: `[ADMIN INTERVENTION] ${dto.reason.trim()}`,
          changedBy: adminUserId,
          actorRole: 'ADMIN',
        },
      });

      if (isCancelling) {
        await this.reservationService.restoreOrderStockInTx(tx, {
          orderId: order.id,
          reason: `Admin intervention (${dto.targetStatus}): ${dto.reason.trim()}`,
          actorId: adminUserId,
          items: order.items.map((i) => ({
            orderItemId: i.id,
            sellerProductId: i.sellerProductId,
            quantity: i.quantity,
          })),
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ADMIN_ORDER_INCLUDE,
      });
    });

    void this.notifications.notifyOrderStatusChanged({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      customerEmail: updated.customer?.email,
      sellerOwnerUserId: updated.seller?.ownerUserId,
      storeName: updated.storeNameSnapshot || updated.seller?.businessName || 'Store',
      newStatus: dto.targetStatus,
      reason: dto.reason.trim(),
    });

    return mapOrderDetail(updated);
  }
}
