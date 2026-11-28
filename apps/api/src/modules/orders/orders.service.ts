import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import {
  CheckoutSessionStatus,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  StockReservationStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CheckoutSnapshotItem,
  OrderDetailResponse,
  OrderTrackingMilestone,
  OrderTrackingResponse,
  PaginatedOrdersResponse,
} from '@marvels-basket/shared';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { CancelOrderDto, CreateOrderDto, QueryOrdersDto } from './dto/orders.dto';
import { assertValidOrderTransition, CUSTOMER_CANCELLABLE_STATUSES } from './order-state-machine';
import { OrderNotificationsService } from './order-notifications.service';
import { mapOrderDetail, mapOrderSummary } from './order-mapper';
import { DeliveryService } from '../delivery/delivery.service';

const ORDER_DETAIL_INCLUDE = {
  seller: {
    select: {
      id: true,
      businessName: true,
      storeDisplayName: true,
      slug: true,
      ownerUserId: true,
      businessEmail: true,
    },
  },
  customer: { select: { id: true, name: true, email: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  complaints: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly reservationService: InventoryReservationService,
    private readonly notifications: OrderNotificationsService,
    @Optional()
    @Inject(forwardRef(() => DeliveryService))
    private readonly deliveryService?: DeliveryService,
  ) {}

  private generateOrderNumber(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `MB-${datePart}-${randPart}`;
  }

  /**
   * Creates a single-store order atomically from an active CheckoutSession:
   * - Enforces idempotency (idempotencyKey & checkoutSessionId)
   * - Validates active reservation, store hours, and payment method boundary
   * - Persists immutable OrderItem and address snapshots
   * - Commits StockReservation inside the same ACID transaction
   * - Clears customer's Cart and records CouponUsage if applicable
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderDetailResponse> {
    const paymentMethod = dto.paymentMethod || PaymentMethod.COD;

    // 1. Idempotency check by idempotencyKey or checkoutSessionId
    if (dto.idempotencyKey?.trim()) {
      const existingByKey = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: ORDER_DETAIL_INCLUDE,
      });
      if (existingByKey) {
        if (existingByKey.customerId !== userId) {
          throw new NotFoundException('Order not found');
        }
        return mapOrderDetail(existingByKey);
      }
    }

    const existingBySession = await this.prisma.order.findUnique({
      where: { checkoutSessionId: dto.checkoutSessionId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (existingBySession) {
      if (existingBySession.customerId !== userId) {
        throw new NotFoundException('Order not found');
      }
      return mapOrderDetail(existingBySession);
    }

    // 2. Payment gateway boundary: Razorpay orders must be initiated via POST /payments/initiate
    if (paymentMethod === PaymentMethod.RAZORPAY) {
      throw new BadRequestException({
        code: 'USE_PAYMENT_INITIATE_ENDPOINT',
        message:
          'Online Razorpay payments must be initiated via POST /api/v1/payments/initiate and verified server-side.',
      });
    }

    // 3. Load and validate CheckoutSession ownership & expiration
    const session = await this.prisma.checkoutSession.findFirst({
      where: { id: dto.checkoutSessionId, userId },
      include: {
        seller: {
          include: {
            profile: true,
            businessHours: { orderBy: { dayOfWeek: 'asc' } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'CHECKOUT_SESSION_NOT_FOUND',
        message: 'Checkout session not found.',
      });
    }

    const now = new Date();
    if (session.status !== CheckoutSessionStatus.RESERVATION_ACTIVE || session.expiresAt <= now) {
      if (session.status === CheckoutSessionStatus.RESERVATION_ACTIVE && session.expiresAt <= now) {
        await this.reservationService.expireSessionReservation(session.id);
      }
      throw new BadRequestException({
        code: 'CHECKOUT_SESSION_EXPIRED',
        message: 'Your 15-minute checkout reservation has expired. Please prepare checkout again.',
      });
    }

    // 4. Validate Store operational status
    const seller = await this.prisma.seller.findUnique({
      where: { id: session.sellerId },
      include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!seller) {
      throw new NotFoundException('Store not found');
    }
    const op = this.storesService.evaluateStoreOperationalStatus(seller);
    if (!op.isApproved || !op.isOpen || !op.isAcceptingOrders) {
      throw new BadRequestException({
        code: 'STORE_CLOSED',
        message: `${seller.storeDisplayName || seller.businessName} is currently ${op.operationalStatusLabel.toLowerCase()} and not accepting orders.`,
      });
    }

    // 5. Validate active StockReservations exist for this session
    const reservations = await this.prisma.stockReservation.findMany({
      where: {
        checkoutSessionId: session.id,
        status: StockReservationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
      include: { inventory: { include: { sellerProduct: true } } },
      orderBy: { inventoryId: 'asc' },
    });

    const snapshotItems = (session.itemsSnapshot || []) as unknown as CheckoutSnapshotItem[];
    if (snapshotItems.length === 0 || reservations.length === 0) {
      throw new BadRequestException({
        code: 'RESERVATION_MISSING',
        message: 'Active inventory reservations were not found for this checkout session.',
      });
    }

    // Verify all items belong to the same store
    const sellerProductIds = snapshotItems.map((i) => i.sellerProductId);
    const listings = await this.prisma.sellerProduct.findMany({
      where: { id: { in: sellerProductIds }, sellerId: session.sellerId },
      include: {
        product: { select: { id: true, name: true, brand: true } },
        variant: { select: { id: true, sku: true, name: true, packSize: true } },
      },
    });
    if (listings.length !== sellerProductIds.length) {
      throw new BadRequestException({
        code: 'MIXED_OR_INVALID_LISTINGS',
        message: 'One or more checkout items do not belong to the selected store.',
      });
    }
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const storeName = seller.storeDisplayName || seller.businessName;
    const totalDiscountPaise =
      Math.round(Number(session.productDiscount) * 100) +
      Math.round(Number(session.couponDiscount) * 100);
    const totalDiscount = new Decimal(Math.round(totalDiscountPaise) / 100);

    // 6. Execute ACID Order Creation + Stock Commitment + Cart Clearing
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          checkoutSessionId: session.id,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
          customerId: userId,
          sellerId: session.sellerId,
          storeNameSnapshot: storeName,
          addressSnapshot: session.addressSnapshot as Prisma.InputJsonValue,
          couponId: session.couponId,
          couponCode: session.couponCode,
          subtotal: session.itemSubtotal,
          deliveryFee: session.deliveryFee,
          discountAmount: totalDiscount,
          taxAmount: session.taxAmount,
          totalAmount: session.grandTotal,
          status: OrderStatus.PENDING,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          deliveryStatus: DeliveryStatus.PENDING,
          notes: dto.notes?.trim() || null,
          items: {
            create: snapshotItems.map((item) => {
              const listing = listingMap.get(item.sellerProductId);
              const perUnitDiscount = Math.max(0, (item.mrp || item.unitPrice) - item.unitPrice);
              return {
                sellerProductId: item.sellerProductId,
                productIdSnapshot: item.productId || listing?.productId || null,
                variantIdSnapshot: item.variantId || listing?.variantId || null,
                productNameSnapshot: item.productName,
                brandSnapshot: listing?.product.brand || null,
                variantNameSnapshot:
                  item.packSize || listing?.variant?.packSize || listing?.variant?.name || null,
                skuSnapshot: listing?.variant?.sku || listing?.sellerSku || null,
                imageUrlSnapshot: item.imageUrl || null,
                unitPrice: new Decimal(item.unitPrice),
                mrp: new Decimal(item.mrp),
                discountAmount: new Decimal(
                  Math.round(perUnitDiscount * item.quantity * 100) / 100,
                ),
                taxAmount: new Decimal(item.taxAmount || 0),
                quantity: item.quantity,
                totalAmount: new Decimal(item.lineTotal),
              };
            }),
          },
          statusHistory: {
            create: {
              previousStatus: OrderStatus.PENDING,
              newStatus: OrderStatus.PENDING,
              note: `Order placed via ${paymentMethod}`,
              changedBy: userId,
              actorRole: 'CUSTOMER',
            },
          },
        },
        include: ORDER_DETAIL_INCLUDE,
      });

      // Commit stock reservations atomically inside the same transaction
      await this.reservationService.commitReservationInTx(tx, {
        checkoutSessionId: session.id,
        orderId: order.id,
        idempotencyKey: dto.idempotencyKey?.trim() || `order:${order.id}`,
        reservations,
      });

      // Record coupon usage atomically if coupon was applied
      if (session.couponId && Number(session.couponDiscount) > 0) {
        const updatedCoupons = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE coupons
          SET current_usage_count = current_usage_count + 1,
              updated_at = NOW()
          WHERE id = ${session.couponId}::uuid
            AND is_active = true
            AND starts_at <= ${now}
            AND expires_at > ${now}
            AND (usage_limit IS NULL OR current_usage_count < usage_limit)
          RETURNING id
        `;
        if (updatedCoupons.length === 0) {
          throw new ConflictException({
            code: 'COUPON_USAGE_LIMIT_REACHED',
            message: 'Applied coupon is no longer available or has reached its redemption limit.',
          });
        }
        await tx.couponUsage.create({
          data: {
            couponId: session.couponId,
            userId,
            orderId: order.id,
            discountAmount: session.couponDiscount,
          },
        });
      }

      // Clear customer cart
      await tx.cartItem.deleteMany({ where: { cartId: session.cartId } });
      await tx.cart.updateMany({
        where: { id: session.cartId },
        data: { sellerId: null, appliedCouponCode: null },
      });

      return order;
    });

    // 7. Best-effort notifications outside transaction
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    void this.notifications.notifyOrderPlaced({
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      customerId: userId,
      customerEmail: customer?.email,
      sellerOwnerUserId: seller.ownerUserId,
      sellerEmail: seller.businessEmail,
      storeName,
      totalAmount: Number(createdOrder.totalAmount),
    });

    return mapOrderDetail(createdOrder);
  }

  async listCustomerOrders(
    userId: string,
    query: QueryOrdersDto,
  ): Promise<PaginatedOrdersResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      customerId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              { storeNameSnapshot: { contains: query.search.trim(), mode: 'insensitive' } },
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

  async getCustomerOrderDetail(userId: string, orderId: string): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
    }

    return mapOrderDetail(order);
  }

  async getOrderTracking(userId: string, orderId: string): Promise<OrderTrackingResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        seller: { select: { storeDisplayName: true, businessName: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const stepOrder: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PACKED,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];
    const currentIdx = stepOrder.indexOf(order.status);

    const milestones: OrderTrackingMilestone[] = [
      {
        status: 'PENDING',
        label: 'Order Placed',
        completed:
          currentIdx >= 0 ||
          order.status === OrderStatus.CANCELLED ||
          order.status === OrderStatus.REJECTED,
        timestamp: order.createdAt.toISOString(),
      },
      {
        status: 'CONFIRMED',
        label: 'Order Confirmed',
        completed: currentIdx >= 1,
        timestamp: order.confirmedAt ? order.confirmedAt.toISOString() : null,
      },
      {
        status: 'PACKED',
        label: 'Order Packed',
        completed: currentIdx >= 2,
        timestamp: order.packedAt ? order.packedAt.toISOString() : null,
      },
      {
        status: 'OUT_FOR_DELIVERY',
        label: 'Out for Delivery',
        completed: currentIdx >= 3,
        timestamp: order.dispatchedAt ? order.dispatchedAt.toISOString() : null,
      },
      {
        status: 'DELIVERED',
        label: 'Delivered',
        completed: currentIdx >= 4,
        timestamp: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      },
    ];

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      storeName:
        order.storeNameSnapshot || order.seller.storeDisplayName || order.seller.businessName,
      milestones,
      history: order.statusHistory.map((h) => ({
        id: h.id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        note: h.note || null,
        changedBy: h.changedBy || null,
        actorRole: h.actorRole || null,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Customer pre-pack cancellation (free before PACKED).
   * Idempotent on repeated calls and restores committed stock exactly once.
   */
  async cancelCustomerOrder(
    userId: string,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      return mapOrderDetail(order); // Idempotent
    }

    if (!CUSTOMER_CANCELLABLE_STATUSES.has(order.status)) {
      throw new ConflictException({
        code: 'CANCELLATION_NOT_ALLOWED',
        message: `Orders in ${order.status} status cannot be cancelled directly. Please contact support.`,
      });
    }

    assertValidOrderTransition(order.status, OrderStatus.CANCELLED);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: OrderStatus.CANCELLED,
          deliveryStatus: DeliveryStatus.CANCELLED,
          paymentStatus:
            order.paymentStatus === PaymentStatus.SUCCESS
              ? PaymentStatus.REFUND_PENDING
              : order.paymentStatus,
          cancellationReason: dto.reason.trim(),
          cancelledBy: userId,
          cancelledAt: now,
        },
      });

      if (transitioned.count > 0) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: OrderStatus.CANCELLED,
            note: dto.reason.trim(),
            changedBy: userId,
            actorRole: 'CUSTOMER',
          },
        });

        await this.reservationService.restoreOrderStockInTx(tx, {
          orderId: order.id,
          reason: `Customer cancelled order ${order.orderNumber}: ${dto.reason.trim()}`,
          actorId: userId,
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
          userId,
          'CUSTOMER',
        );
      }

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    void this.notifications.notifyOrderStatusChanged({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerId: updated.customerId,
      customerEmail: updated.customer?.email,
      sellerOwnerUserId: updated.seller?.ownerUserId,
      storeName: updated.storeNameSnapshot || updated.seller?.businessName || 'Store',
      newStatus: OrderStatus.CANCELLED,
      reason: dto.reason.trim(),
    });

    this.logger.log(`Order ${updated.orderNumber} cancelled by customer ${userId}`);
    return mapOrderDetail(updated);
  }
}
