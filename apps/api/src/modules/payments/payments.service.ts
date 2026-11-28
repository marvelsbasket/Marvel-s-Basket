import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckoutSessionStatus,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RefundStatus,
  StockReservationStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AdminPaymentDetailResponse,
  CheckoutSnapshotItem,
  InitiatePaymentResponse,
  PaginatedPaymentsResponse,
  PaymentStatusHistoryItem,
  PaymentStatusResponse,
} from '@marvels-basket/shared';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { OrderNotificationsService } from '../orders/order-notifications.service';
import { RazorpayService } from './gateways/razorpay/razorpay.service';
import { verifyCheckoutSignature } from './gateways/razorpay/razorpay.signature';
import {
  CAPTURED_PAYMENT_STATUSES,
  PAYMENT_PROGRESS_RANK,
  paiseToRupees,
  rupeesToPaise,
} from './payment-state-machine';
import {
  InitiatePaymentDto,
  QueryPaymentsDto,
  VerifyPaymentDto,
} from './dto/payments.dto';
import {
  mapAdminPaymentDetail,
  mapPaymentHistoryItem,
  mapPaymentStatus,
} from './payments.mapper';

const ACTIVE_PRE_CAPTURE_STATUSES: PaymentStatus[] = [
  PaymentStatus.CREATED,
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.AUTHORIZED,
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly razorpayService: RazorpayService,
    private readonly storesService: StoresService,
    private readonly reservationService: InventoryReservationService,
    private readonly notifications: OrderNotificationsService,
  ) {}

  private generateOrderNumber(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `MB-${datePart}-${randPart}`;
  }

  private generateRefundNumber(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `RF-${datePart}-${randPart}`;
  }

  private buildCheckoutConfig(params: {
    providerOrderId: string;
    amountPaise: number;
    currency: string;
    orderNumber: string;
    internalOrderId: string;
    paymentId: string;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
  }) {
    return {
      keyId: this.razorpayService.getPublicKeyId(),
      orderId: params.providerOrderId,
      amountPaise: params.amountPaise,
      currency: params.currency,
      name: "Marvel's Basket",
      description: `Order ${params.orderNumber}`,
      prefill: {
        name: params.customerName || undefined,
        email: params.customerEmail || undefined,
        contact: params.customerPhone || undefined,
      },
      notes: {
        internalOrderId: params.internalOrderId,
        orderNumber: params.orderNumber,
        paymentId: params.paymentId,
      },
    };
  }

  /**
   * Initiates a Razorpay payment for either:
   * - An active CheckoutSession (creates internal Order in PENDING state without committing stock yet)
   * - An existing unpaid RAZORPAY Order (safe retry / recovery)
   * Never trusts client-supplied amounts; calculates integer paise from DB order total.
   */
  async initiatePayment(userId: string, dto: InitiatePaymentDto): Promise<InitiatePaymentResponse> {
    if (!dto.checkoutSessionId && !dto.orderId) {
      throw new BadRequestException({
        code: 'PAYMENT_TARGET_REQUIRED',
        message: 'Either checkoutSessionId or orderId is required to initiate payment.',
      });
    }

    // 1. Idempotency check by idempotencyKey
    if (dto.idempotencyKey?.trim()) {
      const existingByKey = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: { order: { include: { customer: true } } },
      });
      if (existingByKey) {
        if (existingByKey.order.customerId !== userId) {
          throw new NotFoundException('Payment not found.');
        }
        if (existingByKey.providerOrderId) {
          const amountPaise = rupeesToPaise(Number(existingByKey.amount));
          return {
            paymentId: existingByKey.id,
            orderId: existingByKey.orderId,
            orderNumber: existingByKey.order.orderNumber,
            paymentMethod: existingByKey.paymentMethod,
            status: existingByKey.status,
            amount: Number(existingByKey.amount),
            amountPaise,
            currency: existingByKey.currency,
            attemptNumber: existingByKey.attemptNumber,
            checkout: this.buildCheckoutConfig({
              providerOrderId: existingByKey.providerOrderId,
              amountPaise,
              currency: existingByKey.currency,
              orderNumber: existingByKey.order.orderNumber,
              internalOrderId: existingByKey.orderId,
              paymentId: existingByKey.id,
              customerName: existingByKey.order.customer?.name,
              customerEmail: existingByKey.order.customer?.email,
              customerPhone: existingByKey.order.customer?.phone,
            }),
          };
        }
      }
    }

    // 2. Resolve or create the internal Order
    let order = dto.orderId
      ? await this.prisma.order.findFirst({
          where: { id: dto.orderId, customerId: userId },
          include: { customer: true, seller: { include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } } } },
        })
      : await this.prisma.order.findFirst({
          where: { checkoutSessionId: dto.checkoutSessionId, customerId: userId },
          include: { customer: true, seller: { include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } } } },
        });

    if (dto.orderId && !order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
    }

    if (!order && dto.checkoutSessionId) {
      order = await this.createPendingRazorpayOrderFromSession(
        userId,
        dto.checkoutSessionId,
        dto.notes,
      );
    }

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    // 3. Validate order eligibility for payment
    if (order.paymentMethod !== PaymentMethod.RAZORPAY) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_METHOD',
        message: 'This order is configured for Cash on Delivery, not online Razorpay payment.',
      });
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new ConflictException({
        code: 'ORDER_NOT_PAYABLE',
        message: `Cannot initiate payment for an order in ${order.status} status.`,
      });
    }

    if (order.paymentStatus === PaymentStatus.SUCCESS) {
      throw new ConflictException({
        code: 'ORDER_ALREADY_PAID',
        message: 'This order has already been paid.',
      });
    }

    // Check existing captured payment on this order
    const existingCaptured = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: { in: Array.from(CAPTURED_PAYMENT_STATUSES) },
      },
    });
    if (existingCaptured) {
      throw new ConflictException({
        code: 'PAYMENT_ALREADY_CAPTURED',
        message: 'Payment for this order has already been captured.',
      });
    }

    // 4. Check for an existing active pre-capture attempt to prevent duplicate Razorpay orders
    const existingActive = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: { in: ACTIVE_PRE_CAPTURE_STATUSES },
      },
      orderBy: { attemptNumber: 'desc' },
    });

    if (existingActive && existingActive.providerOrderId) {
      // If gateway is configured, check if it was already captured on Razorpay before returning
      if (this.razorpayService.isConfigured()) {
        try {
          const rpPayments = await this.razorpayService.fetchOrderPayments(
            existingActive.providerOrderId,
          );
          const captured = rpPayments.find((p) => p.status === 'captured');
          if (captured) {
            await this.confirmCapturedPayment({
              paymentId: existingActive.id,
              providerPaymentId: captured.id,
              amountPaise: captured.amount,
              currency: captured.currency,
              method: captured.method || 'razorpay',
              gatewayStatus: captured.status,
              source: 'INITIATE_RECONCILIATION',
              rawPayload: captured as unknown as Record<string, unknown>,
            });
            throw new ConflictException({
              code: 'PAYMENT_ALREADY_CAPTURED',
              message: 'Your previous payment attempt succeeded and has been confirmed.',
            });
          }
        } catch (err) {
          if (err instanceof ConflictException) throw err;
          // Non-fatal: continue returning existing active attempt if gateway check failed transiently
        }
      }

      const amountPaise = rupeesToPaise(Number(existingActive.amount));
      return {
        paymentId: existingActive.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: existingActive.paymentMethod,
        status: existingActive.status,
        amount: Number(existingActive.amount),
        amountPaise,
        currency: existingActive.currency,
        attemptNumber: existingActive.attemptNumber,
        checkout: this.buildCheckoutConfig({
          providerOrderId: existingActive.providerOrderId,
          amountPaise,
          currency: existingActive.currency,
          orderNumber: order.orderNumber,
          internalOrderId: order.id,
          paymentId: existingActive.id,
          customerName: order.customer?.name,
          customerEmail: order.customer?.email,
          customerPhone: order.customer?.phone,
        }),
      };
    }

    // 5. Compute server-side integer paise and create Razorpay Order outside DB transaction
    const amountPaise = rupeesToPaise(Number(order.totalAmount));
    const lastAttempt = await this.prisma.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true },
    });
    const nextAttemptNumber = (lastAttempt?.attemptNumber || 0) + 1;

    const receipt = `${order.orderNumber}-A${nextAttemptNumber}`.slice(0, 40);
    const rpOrder = await this.razorpayService.createOrder({
      amountPaise,
      receipt,
      notes: {
        internalOrderId: order.id,
        orderNumber: order.orderNumber,
        attemptNumber: String(nextAttemptNumber),
      },
    });

    // 6. Persist Payment attempt + StatusHistory + PaymentTransaction
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          orderId: order.id,
          checkoutSessionId: order.checkoutSessionId,
          attemptNumber: nextAttemptNumber,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
          provider: 'RAZORPAY',
          paymentMethod: PaymentMethod.RAZORPAY,
          method: 'razorpay',
          providerOrderId: rpOrder.id,
          receipt,
          amount: order.totalAmount,
          currency: 'INR',
          status: PaymentStatus.CREATED,
          gatewayStatus: rpOrder.status,
        },
      });

      await tx.paymentStatusHistory.create({
        data: {
          paymentId: created.id,
          previousStatus: PaymentStatus.CREATED,
          newStatus: PaymentStatus.CREATED,
          source: 'API_INITIATION',
          note: `Razorpay order ${rpOrder.id} created (attempt #${nextAttemptNumber})`,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: created.id,
          providerTransactionId: rpOrder.id,
          eventType: 'ORDER_CREATED',
          amount: order.totalAmount,
          status: rpOrder.status,
          providerPayload: rpOrder as unknown as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      amount: Number(payment.amount),
      amountPaise,
      currency: payment.currency,
      attemptNumber: payment.attemptNumber,
      checkout: this.buildCheckoutConfig({
        providerOrderId: rpOrder.id,
        amountPaise,
        currency: payment.currency,
        orderNumber: order.orderNumber,
        internalOrderId: order.id,
        paymentId: payment.id,
        customerName: order.customer?.name,
        customerEmail: order.customer?.email,
        customerPhone: order.customer?.phone,
      }),
    };
  }

  /**
   * Creates an internal Order in PENDING state from an active CheckoutSession
   * without committing the StockReservation yet (committed upon payment capture).
   */
  private async createPendingRazorpayOrderFromSession(
    userId: string,
    checkoutSessionId: string,
    notes?: string,
  ) {
    const session = await this.prisma.checkoutSession.findFirst({
      where: { id: checkoutSessionId, userId },
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

    const seller = session.seller;
    const op = this.storesService.evaluateStoreOperationalStatus(seller);
    if (!op.isApproved || !op.isOpen || !op.isAcceptingOrders) {
      throw new BadRequestException({
        code: 'STORE_CLOSED',
        message: `${seller.storeDisplayName || seller.businessName} is currently ${op.operationalStatusLabel.toLowerCase()} and not accepting orders.`,
      });
    }

    const reservations = await this.prisma.stockReservation.findMany({
      where: {
        checkoutSessionId: session.id,
        status: StockReservationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });

    const snapshotItems = (session.itemsSnapshot || []) as unknown as CheckoutSnapshotItem[];
    if (snapshotItems.length === 0 || reservations.length === 0) {
      throw new BadRequestException({
        code: 'RESERVATION_MISSING',
        message: 'Active inventory reservations were not found for this checkout session.',
      });
    }

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

    try {
      return await this.prisma.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          checkoutSessionId: session.id,
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
          paymentMethod: PaymentMethod.RAZORPAY,
          paymentStatus: PaymentStatus.PENDING,
          deliveryStatus: DeliveryStatus.PENDING,
          notes: notes?.trim() || null,
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
              note: 'Order initialized for Razorpay online payment',
              changedBy: userId,
              actorRole: 'CUSTOMER',
            },
          },
        },
        include: {
          customer: true,
          seller: { include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } } },
        },
      });
    } catch (err) {
      // Handle concurrent duplicate request creating the order for the same checkoutSessionId
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.order.findFirst({
          where: { checkoutSessionId, customerId: userId },
          include: {
            customer: true,
            seller: { include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } } },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Verifies Razorpay Checkout callback signature on the server using the
   * stored providerOrderId from the database, then verifies actual gateway payment state.
   */
  async verifyCheckoutPayment(
    userId: string,
    dto: VerifyPaymentDto,
  ): Promise<PaymentStatusResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customerId: userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        providerOrderId: dto.razorpayOrderId,
      },
      include: { order: true },
    });

    if (!payment || !payment.providerOrderId) {
      throw new NotFoundException({
        code: 'PAYMENT_ATTEMPT_NOT_FOUND',
        message: 'No matching payment attempt found for this order.',
      });
    }

    // If already captured, return idempotently
    if (CAPTURED_PAYMENT_STATUSES.has(payment.status)) {
      return mapPaymentStatus(payment);
    }

    const keySecret = this.configService.get<string>('razorpay.keySecret', '');
    const isValidSig = verifyCheckoutSignature({
      orderId: payment.providerOrderId,
      paymentId: dto.razorpayPaymentId,
      signature: dto.razorpaySignature,
      keySecret,
    });

    if (!isValidSig) {
      await this.prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerTransactionId: dto.razorpayPaymentId,
          eventType: 'SIGNATURE_VERIFICATION_FAILED',
          amount: payment.amount,
          status: 'INVALID_SIGNATURE',
        },
      });
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_SIGNATURE',
        message: 'Payment signature verification failed.',
      });
    }

    // Signature is authentic; now verify actual payment state from Razorpay API
    const rpPayment = await this.razorpayService.fetchPayment(dto.razorpayPaymentId);
    if (rpPayment.order_id && rpPayment.order_id !== payment.providerOrderId) {
      throw new BadRequestException({
        code: 'PAYMENT_ORDER_MISMATCH',
        message: 'Gateway payment does not belong to the expected order.',
      });
    }

    const expectedPaise = rupeesToPaise(Number(payment.amount));
    if (rpPayment.amount !== expectedPaise || rpPayment.currency !== payment.currency) {
      throw new BadRequestException({
        code: 'PAYMENT_AMOUNT_MISMATCH',
        message: 'Gateway payment amount or currency does not match the order total.',
      });
    }

    if (rpPayment.status === 'captured') {
      return this.confirmCapturedPayment({
        paymentId: payment.id,
        providerPaymentId: rpPayment.id,
        amountPaise: rpPayment.amount,
        currency: rpPayment.currency,
        method: rpPayment.method || 'razorpay',
        gatewayStatus: rpPayment.status,
        source: 'API_VERIFICATION',
        rawPayload: rpPayment as unknown as Record<string, unknown>,
      });
    }

    if (rpPayment.status === 'authorized') {
      const updated = await this.markPaymentAuthorized({
        paymentId: payment.id,
        providerPaymentId: rpPayment.id,
        method: rpPayment.method || 'razorpay',
        gatewayStatus: rpPayment.status,
        source: 'API_VERIFICATION',
        rawPayload: rpPayment as unknown as Record<string, unknown>,
      });
      return mapPaymentStatus(updated);
    }

    if (rpPayment.status === 'failed') {
      const updated = await this.markPaymentFailed({
        paymentId: payment.id,
        providerPaymentId: rpPayment.id,
        gatewayStatus: rpPayment.status,
        failureCode: rpPayment.error_code || 'GATEWAY_FAILED',
        failureReason: rpPayment.error_description || rpPayment.error_reason || 'Payment failed',
        source: 'API_VERIFICATION',
        rawPayload: rpPayment as unknown as Record<string, unknown>,
      });
      return mapPaymentStatus(updated);
    }

    return mapPaymentStatus(payment);
  }

  /**
   * Atomically transitions a Payment to CAPTURED, commits StockReservation (or handles
   * late-payment-after-expiry safely without negative stock), updates Order.paymentStatus,
   * clears Cart, and records CouponUsage & notifications exactly once.
   */
  async confirmCapturedPayment(params: {
    paymentId: string;
    providerPaymentId: string;
    amountPaise: number;
    currency: string;
    method: string;
    gatewayStatus: string;
    source: string;
    providerEventId?: string;
    rawPayload?: Record<string, unknown>;
  }): Promise<PaymentStatusResponse> {
    const now = new Date();
    const capturedRupees = paiseToRupees(params.amountPaise);

    const txResult = await this.prisma.$transaction(async (tx) => {
      // Lock payment row for update
      const payment = await tx.payment.findUnique({
        where: { id: params.paymentId },
        include: {
          order: {
            include: {
              items: true,
              customer: { select: { id: true, email: true, name: true } },
              seller: { select: { id: true, ownerUserId: true, businessEmail: true, storeDisplayName: true, businessName: true } },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found.');
      }

      if (CAPTURED_PAYMENT_STATUSES.has(payment.status)) {
        return { payment, newlyConfirmed: false, lateOutOfStock: false };
      }

      const expectedPaise = rupeesToPaise(Number(payment.amount));
      if (params.amountPaise !== expectedPaise || params.currency !== payment.currency) {
        await tx.paymentReconciliationLog.create({
          data: {
            paymentId: payment.id,
            orderId: payment.orderId,
            source: params.source,
            previousStatus: payment.status,
            newStatus: payment.status,
            gatewayStatus: params.gatewayStatus,
            expectedAmount: payment.amount,
            gatewayAmount: new Decimal(capturedRupees),
            discrepancyDetected: true,
            discrepancyReason: `Amount/currency mismatch: expected ${expectedPaise} ${payment.currency}, got ${params.amountPaise} ${params.currency}`,
          },
        });
        throw new BadRequestException({
          code: 'PAYMENT_AMOUNT_MISMATCH',
          message: 'Captured amount does not match expected order total.',
        });
      }

      // Check for duplicate captured payment on the same order
      const otherCaptured = await tx.payment.findFirst({
        where: {
          orderId: payment.orderId,
          id: { not: payment.id },
          status: { in: Array.from(CAPTURED_PAYMENT_STATUSES) },
        },
      });

      const order = payment.order;

      // Conditional update prevents concurrent race between verify endpoint & webhook
      const updatedCount = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { notIn: Array.from(CAPTURED_PAYMENT_STATUSES) },
        },
        data: {
          status: PaymentStatus.CAPTURED,
          providerPaymentId: params.providerPaymentId,
          method: params.method || payment.method,
          capturedAmount: new Decimal(capturedRupees),
          gatewayStatus: params.gatewayStatus,
          capturedAt: now,
          paidAt: now,
        },
      });

      if (updatedCount.count === 0) {
        const latest = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
          include: { order: true },
        });
        return { payment: latest, newlyConfirmed: false, lateOutOfStock: false };
      }

      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          previousStatus: payment.status,
          newStatus: PaymentStatus.CAPTURED,
          source: params.source,
          providerEventId: params.providerEventId || null,
          providerPaymentId: params.providerPaymentId,
          note: otherCaptured
            ? 'DUPLICATE_CAPTURED_PAYMENT_DETECTED: Order already has a captured payment'
            : `Payment captured (${params.gatewayStatus})`,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerTransactionId: params.providerPaymentId,
          eventType: 'PAYMENT_CAPTURED',
          amount: new Decimal(capturedRupees),
          status: params.gatewayStatus,
          providerPayload: (params.rawPayload || {}) as Prisma.InputJsonValue,
        },
      });

      if (otherCaptured) {
        await tx.paymentReconciliationLog.create({
          data: {
            paymentId: payment.id,
            orderId: order.id,
            source: params.source,
            previousStatus: payment.status,
            newStatus: PaymentStatus.CAPTURED,
            gatewayStatus: params.gatewayStatus,
            expectedAmount: payment.amount,
            gatewayAmount: new Decimal(capturedRupees),
            discrepancyDetected: true,
            discrepancyReason: `Duplicate captured payment detected on order ${order.orderNumber} (existing payment ${otherCaptured.id})`,
            resolutionAction: 'FLAGGED_FOR_REFUND_REVIEW',
          },
        });

        const refreshed = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
          include: { order: true },
        });
        return { payment: refreshed, newlyConfirmed: false, lateOutOfStock: false };
      }

      // Commit inventory reservation or handle late payment after expiry
      let stockCommitted = false;
      let lateOutOfStock = false;
      let unavailableItems: string[] = [];

      if (order.checkoutSessionId) {
        const reservations = await tx.stockReservation.findMany({
          where: { checkoutSessionId: order.checkoutSessionId },
          include: { inventory: { include: { sellerProduct: true } } },
          orderBy: { inventoryId: 'asc' },
        });

        const allCommitted =
          reservations.length > 0 &&
          reservations.every((r) => r.status === StockReservationStatus.COMMITTED);
        const allActiveValid =
          reservations.length > 0 &&
          reservations.every(
            (r) => r.status === StockReservationStatus.ACTIVE && r.expiresAt > now,
          );

        if (allCommitted) {
          stockCommitted = true;
        } else if (allActiveValid) {
          await this.reservationService.commitReservationInTx(tx, {
            checkoutSessionId: order.checkoutSessionId,
            orderId: order.id,
            idempotencyKey: `payment:${payment.id}`,
            reservations,
          });
          stockCommitted = true;
        } else {
          // Reservation expired/released before capture -> try atomic re-acquire
          const reacquire = await this.reservationService.tryAcquireAndCommitForOrderInTx(tx, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            items: order.items.map((i) => ({
              sellerProductId: i.sellerProductId,
              productNameSnapshot: i.productNameSnapshot,
              quantity: i.quantity,
            })),
          });
          if (reacquire.acquired) {
            stockCommitted = true;
          } else {
            lateOutOfStock = true;
            unavailableItems = reacquire.unavailableItems;
          }
        }
      } else {
        stockCommitted = true;
      }

      if (lateOutOfStock) {
        // Never confirm an unfulfillable order or create negative stock
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            deliveryStatus: DeliveryStatus.CANCELLED,
            paymentStatus: PaymentStatus.REFUND_PENDING,
            cancellationReason: `Inventory reservation expired before payment capture; unavailable items: ${unavailableItems.join(', ')}`,
            cancelledAt: now,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: OrderStatus.CANCELLED,
            note: `Late payment captured after reservation expiry; stock unavailable (${unavailableItems.join(', ')}). Marked for refund.`,
            actorRole: 'SYSTEM',
          },
        });

        await tx.refund.create({
          data: {
            orderId: order.id,
            paymentId: payment.id,
            refundNumber: this.generateRefundNumber(),
            idempotencyKey: `late-oos-${payment.id}`,
            amount: payment.amount,
            reason: 'Automatic refund request: inventory expired and sold out before late payment capture',
            status: RefundStatus.PENDING,
            requestedBy: order.customerId,
          },
        });

        await tx.paymentReconciliationLog.create({
          data: {
            paymentId: payment.id,
            orderId: order.id,
            source: params.source,
            previousStatus: payment.status,
            newStatus: PaymentStatus.CAPTURED,
            gatewayStatus: params.gatewayStatus,
            expectedAmount: payment.amount,
            gatewayAmount: new Decimal(capturedRupees),
            discrepancyDetected: true,
            discrepancyReason: `Late payment captured after reservation expiry; out of stock: ${unavailableItems.join(', ')}`,
            resolutionAction: 'ORDER_CANCELLED_REFUND_PENDING',
          },
        });
      } else if (stockCommitted) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.SUCCESS,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: order.status,
            note: `Razorpay payment ${params.providerPaymentId} captured and verified`,
            actorRole: 'SYSTEM',
          },
        });

        // Record coupon usage if applicable (idempotent check)
        if (order.couponId && Number(order.discountAmount) > 0) {
          const existingUsage = await tx.couponUsage.findFirst({
            where: { orderId: order.id },
          });
          if (!existingUsage) {
            await tx.couponUsage.create({
              data: {
                couponId: order.couponId,
                userId: order.customerId,
                orderId: order.id,
                discountAmount: order.discountAmount,
              },
            });
          }
        }

        // Clear customer cart if checkoutSessionId exists
        if (order.checkoutSessionId) {
          const session = await tx.checkoutSession.findUnique({
            where: { id: order.checkoutSessionId },
            select: { cartId: true },
          });
          if (session?.cartId) {
            await tx.cartItem.deleteMany({ where: { cartId: session.cartId } });
            await tx.cart.updateMany({
              where: { id: session.cartId },
              data: { sellerId: null, appliedCouponCode: null },
            });
          }
        }
      }

      const refreshed = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: {
          order: {
            include: {
              customer: { select: { id: true, email: true, name: true } },
              seller: { select: { id: true, ownerUserId: true, businessEmail: true, storeDisplayName: true, businessName: true } },
            },
          },
        },
      });

      return {
        payment: refreshed,
        newlyConfirmed: stockCommitted && !lateOutOfStock,
        lateOutOfStock,
      };
    });

    // Best-effort notifications outside transaction
    if (txResult.newlyConfirmed) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ord = (txResult.payment as any).order;
      void this.notifications.notifyOrderPlaced({
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        customerId: ord.customerId,
        customerEmail: ord.customer?.email,
        sellerOwnerUserId: ord.seller?.ownerUserId,
        sellerEmail: ord.seller?.businessEmail,
        storeName: ord.storeNameSnapshot || ord.seller?.storeDisplayName || ord.seller?.businessName || 'Store',
        totalAmount: Number(ord.totalAmount),
      });
    }

    return mapPaymentStatus(txResult.payment);
  }

  async markPaymentAuthorized(params: {
    paymentId: string;
    providerPaymentId: string;
    method: string;
    gatewayStatus: string;
    source: string;
    providerEventId?: string;
    rawPayload?: Record<string, unknown>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: params.paymentId },
        include: { order: true },
      });

      const currentRank = PAYMENT_PROGRESS_RANK[payment.status] || 0;
      const authRank = PAYMENT_PROGRESS_RANK[PaymentStatus.AUTHORIZED] || 4;

      // Never downgrade a payment that is already AUTHORIZED, CAPTURED, or REFUNDED
      if (currentRank >= authRank) {
        return payment;
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.AUTHORIZED,
          providerPaymentId: params.providerPaymentId,
          method: params.method || payment.method,
          gatewayStatus: params.gatewayStatus,
          authorizedAt: new Date(),
        },
        include: { order: true },
      });

      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          previousStatus: payment.status,
          newStatus: PaymentStatus.AUTHORIZED,
          source: params.source,
          providerEventId: params.providerEventId || null,
          providerPaymentId: params.providerPaymentId,
          note: 'Payment authorized on Razorpay (awaiting capture)',
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerTransactionId: params.providerPaymentId,
          eventType: 'PAYMENT_AUTHORIZED',
          amount: payment.amount,
          status: params.gatewayStatus,
          providerPayload: (params.rawPayload || {}) as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async markPaymentFailed(params: {
    paymentId: string;
    providerPaymentId?: string | null;
    gatewayStatus: string;
    failureCode?: string | null;
    failureReason?: string | null;
    source: string;
    providerEventId?: string;
    rawPayload?: Record<string, unknown>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: params.paymentId },
        include: { order: true },
      });

      // Never mark an already captured/refunded payment as failed (out-of-order guard)
      if (CAPTURED_PAYMENT_STATUSES.has(payment.status) || payment.status === PaymentStatus.FAILED) {
        return payment;
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPaymentId: params.providerPaymentId || payment.providerPaymentId,
          gatewayStatus: params.gatewayStatus,
          failureCode: params.failureCode || null,
          failureReason: params.failureReason || null,
          failedAt: new Date(),
        },
        include: { order: true },
      });

      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          previousStatus: payment.status,
          newStatus: PaymentStatus.FAILED,
          source: params.source,
          providerEventId: params.providerEventId || null,
          providerPaymentId: params.providerPaymentId || null,
          note: params.failureReason || 'Payment failed',
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          providerTransactionId: params.providerPaymentId || payment.providerOrderId,
          eventType: 'PAYMENT_FAILED',
          amount: payment.amount,
          status: params.gatewayStatus,
          providerPayload: (params.rawPayload || {}) as Prisma.InputJsonValue,
        },
      });

      // Update Order.paymentStatus to FAILED only if no other captured payment exists
      await tx.order.updateMany({
        where: {
          id: payment.orderId,
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
        data: { paymentStatus: PaymentStatus.FAILED },
      });

      return updated;
    });
  }

  async getCustomerPaymentStatus(
    userId: string,
    paymentId: string,
  ): Promise<PaymentStatusResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { customerId: userId } },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return mapPaymentStatus(payment);
  }

  async getCustomerOrderPayment(userId: string, orderId: string): Promise<PaymentStatusResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: order.id },
      orderBy: [{ attemptNumber: 'desc' }, { createdAt: 'desc' }],
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('No payment record found for this order.');
    }

    return mapPaymentStatus(payment);
  }

  async listAdminPayments(query: QueryPaymentsDto): Promise<PaginatedPaymentsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { providerOrderId: { contains: query.search.trim(), mode: 'insensitive' } },
              { providerPaymentId: { contains: query.search.trim(), mode: 'insensitive' } },
              { order: { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              customer: { select: { name: true } },
              seller: { select: { storeDisplayName: true, businessName: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...mapPaymentStatus(p),
        customerName: p.order?.customer?.name ?? null,
        storeName:
          p.order?.storeNameSnapshot ||
          p.order?.seller?.storeDisplayName ||
          p.order?.seller?.businessName ||
          null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAdminPaymentDetail(paymentId: string): Promise<AdminPaymentDetailResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            seller: { select: { id: true, storeDisplayName: true, businessName: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        refunds: { orderBy: { createdAt: 'desc' }, include: { order: { select: { orderNumber: true } } } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return mapAdminPaymentDetail(payment);
  }

  async getAdminPaymentHistory(paymentId: string): Promise<PaymentStatusHistoryItem[]> {
    const exists = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Payment not found.');
    }

    const history = await this.prisma.paymentStatusHistory.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'asc' },
    });

    return history.map(mapPaymentHistoryItem);
  }
}
