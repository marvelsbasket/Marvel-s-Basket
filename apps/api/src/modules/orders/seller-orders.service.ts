import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { DeliveryStatus, OrderStatus, PaymentStatus, Prisma, SellerStatus } from '@prisma/client';
import { OrderDetailResponse, PaginatedOrdersResponse } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { QueryOrdersDto, RejectOrderDto } from './dto/orders.dto';
import { assertValidOrderTransition } from './order-state-machine';
import { OrderNotificationsService } from './order-notifications.service';
import { mapOrderDetail, mapOrderSummary } from './order-mapper';
import { DeliveryService } from '../delivery/delivery.service';

const SELLER_ORDER_INCLUDE = {
  seller: {
    select: {
      id: true,
      businessName: true,
      storeDisplayName: true,
      slug: true,
      ownerUserId: true,
      status: true,
    },
  },
  customer: { select: { id: true, name: true, email: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  complaints: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class SellerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: InventoryReservationService,
    private readonly notifications: OrderNotificationsService,
    @Optional()
    @Inject(forwardRef(() => DeliveryService))
    private readonly deliveryService?: DeliveryService,
  ) {}

  private async resolveOwnedSeller(sellerUserId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller store not found for this account.');
    }
    return seller;
  }

  private assertSellerOperational(status: SellerStatus) {
    if (status === SellerStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: 'SELLER_SUSPENDED',
        message: 'Suspended stores cannot accept or fulfill orders.',
      });
    }
    if (status !== SellerStatus.APPROVED_ACTIVE && status !== SellerStatus.APPROVED) {
      throw new ForbiddenException({
        code: 'SELLER_NOT_APPROVED',
        message: 'Only approved active stores can manage orders.',
      });
    }
  }

  async listSellerOrders(
    sellerUserId: string,
    query: QueryOrdersDto,
  ): Promise<PaginatedOrdersResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.OrderWhereInput = { sellerId: seller.id };
    const where: Prisma.OrderWhereInput = {
      ...baseWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              { customer: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [orders, total, groupedCounts] = await Promise.all([
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
      this.prisma.order.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const g of groupedCounts) {
      statusCounts[g.status] = g._count._all;
    }

    return {
      items: orders.map(mapOrderSummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      statusCounts,
    };
  }

  async getSellerOrderDetail(sellerUserId: string, orderId: string): Promise<OrderDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: SELLER_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found for your store.');
    }
    return mapOrderDetail(order);
  }

  async acceptOrder(sellerUserId: string, orderId: string): Promise<OrderDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    this.assertSellerOperational(seller.status);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: SELLER_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found for your store.');
    }
    if (order.status === OrderStatus.CONFIRMED) {
      return mapOrderDetail(order); // Idempotent
    }

    assertValidOrderTransition(order.status, OrderStatus.CONFIRMED);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED, confirmedAt: now },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: OrderStatus.CONFIRMED,
          note: 'Order accepted by store',
          changedBy: sellerUserId,
          actorRole: 'SELLER',
        },
      });
      await this.deliveryService?.ensureDeliveryForOrderInTx(tx, order.id, sellerUserId, 'SELLER');
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: SELLER_ORDER_INCLUDE,
      });
    });

    void this.notifications.notifyOrderStatusChanged({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      customerEmail: updated.customer?.email,
      storeName: updated.storeNameSnapshot || seller.businessName,
      newStatus: OrderStatus.CONFIRMED,
    });

    return mapOrderDetail(updated);
  }

  async rejectOrder(
    sellerUserId: string,
    orderId: string,
    dto: RejectOrderDto,
  ): Promise<OrderDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: SELLER_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found for your store.');
    }
    if (order.status === OrderStatus.REJECTED) {
      return mapOrderDetail(order); // Idempotent
    }

    assertValidOrderTransition(order.status, OrderStatus.REJECTED);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: OrderStatus.REJECTED,
          deliveryStatus: DeliveryStatus.CANCELLED,
          paymentStatus:
            order.paymentStatus === PaymentStatus.SUCCESS
              ? PaymentStatus.REFUND_PENDING
              : order.paymentStatus,
          rejectionReason: dto.reason.trim(),
          cancelledBy: sellerUserId,
          cancelledAt: now,
        },
      });

      if (transitioned.count > 0) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: OrderStatus.REJECTED,
            note: dto.reason.trim(),
            changedBy: sellerUserId,
            actorRole: 'SELLER',
          },
        });

        await this.reservationService.restoreOrderStockInTx(tx, {
          orderId: order.id,
          reason: `Seller rejected order ${order.orderNumber}: ${dto.reason.trim()}`,
          actorId: sellerUserId,
          items: order.items.map((i) => ({
            orderItemId: i.id,
            sellerProductId: i.sellerProductId,
            quantity: i.quantity,
          })),
        });

        await this.deliveryService?.cancelDeliveryForOrderInTx(
          tx,
          order.id,
          dto.reason.trim(),
          sellerUserId,
          'SELLER',
        );
      }

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: SELLER_ORDER_INCLUDE,
      });
    });

    void this.notifications.notifyOrderStatusChanged({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      customerEmail: updated.customer?.email,
      storeName: updated.storeNameSnapshot || seller.businessName,
      newStatus: OrderStatus.REJECTED,
      reason: dto.reason.trim(),
    });

    return mapOrderDetail(updated);
  }

  async packOrder(sellerUserId: string, orderId: string): Promise<OrderDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    this.assertSellerOperational(seller.status);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: SELLER_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found for your store.');
    }
    if (order.status === OrderStatus.PACKED) {
      return mapOrderDetail(order);
    }

    assertValidOrderTransition(order.status, OrderStatus.PACKED);

    const now = new Date();
    let plainOtp: string | null = null;
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PACKED, packedAt: now },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: OrderStatus.PACKED,
          note: 'Order packed and ready for dispatch',
          changedBy: sellerUserId,
          actorRole: 'SELLER',
        },
      });
      if (this.deliveryService) {
        const res = await this.deliveryService.markOrderReadyForPickupInTx(
          tx,
          order.id,
          sellerUserId,
          'SELLER',
        );
        plainOtp = res.plainOtp;
      }
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: SELLER_ORDER_INCLUDE,
      });
    });

    if (plainOtp) {
      void this.notifications.notifyDeliveryEvent({
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        customerId: updated.customerId,
        customerEmail: updated.customer?.email,
        storeName: updated.storeNameSnapshot || seller.businessName,
        eventTitle: `Delivery OTP for order ${updated.orderNumber}`,
        message: `Your order ${updated.orderNumber} is packed and ready for pickup. Share Delivery OTP ${plainOtp} with your delivery partner upon arrival.`,
      });
    }

    void this.notifications.notifyOrderStatusChanged({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      customerEmail: updated.customer?.email,
      storeName: updated.storeNameSnapshot || seller.businessName,
      newStatus: OrderStatus.PACKED,
    });

    return mapOrderDetail(updated);
  }

  async dispatchOrder(sellerUserId: string, orderId: string): Promise<OrderDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    this.assertSellerOperational(seller.status);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: SELLER_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found for your store.');
    }
    if (order.status === OrderStatus.OUT_FOR_DELIVERY) {
      return mapOrderDetail(order);
    }
    if (order.status !== OrderStatus.PACKED) {
      throw new BadRequestException({
        code: 'INVALID_ORDER_TRANSITION',
        message: `Order must be PACKED before dispatch (current: ${order.status}).`,
      });
    }

    assertValidOrderTransition(order.status, OrderStatus.OUT_FOR_DELIVERY);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.OUT_FOR_DELIVERY,
          deliveryStatus: DeliveryStatus.IN_TRANSIT,
          dispatchedAt: now,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: OrderStatus.OUT_FOR_DELIVERY,
          note: 'Order handed over for delivery',
          changedBy: sellerUserId,
          actorRole: 'SELLER',
        },
      });
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: SELLER_ORDER_INCLUDE,
      });
    });

    void this.notifications.notifyOrderStatusChanged({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      customerEmail: updated.customer?.email,
      storeName: updated.storeNameSnapshot || seller.businessName,
      newStatus: OrderStatus.OUT_FOR_DELIVERY,
    });

    return mapOrderDetail(updated);
  }
}
