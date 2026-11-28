import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  DeliveryAssignmentStatus,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SellerStatus,
  VerificationStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Queue } from 'bullmq';
import {
  CustomerDeliveryTrackingResponse,
  DeliveryDetailResponse,
  DeliveryPartnerSummary,
  DeliveryStatusHistoryItem,
  PaginatedDeliveriesResponse,
  PaginatedDeliveryPartnersResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { OrderNotificationsService } from '../orders/order-notifications.service';
import {
  DELIVERY_PROVIDER_TOKEN,
  IDeliveryProvider,
} from './providers/delivery-provider.interface';
import {
  assertValidDeliveryTransition,
  generateDeliveryOtp,
  hashDeliveryOtp,
  TERMINAL_DELIVERY_STATUSES,
  verifyDeliveryOtpHash,
} from './delivery-state-machine';
import {
  AssignDeliveryDto,
  CancelDeliveryDto,
  CompleteDeliveryDto,
  FailDeliveryDto,
  QueryDeliveriesDto,
  ReassignDeliveryDto,
  RegisterDeliveryPartnerDto,
  RejectAssignmentDto,
  ReportHandoverIssueDto,
  UpdatePartnerAvailabilityDto,
} from './dto/delivery.dto';
import {
  mapCustomerDeliveryTracking,
  mapDeliveryDetail,
  mapDeliveryHistoryItem,
  mapDeliveryPartner,
  mapDeliverySummary,
} from './delivery.mapper';

export const DELIVERY_OPERATIONS_QUEUE = 'delivery-operations';
const ASSIGNMENT_OFFER_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const DELIVERY_DETAIL_INCLUDE = {
  order: {
    include: {
      customer: { select: { id: true, name: true, email: true } },
      seller: {
        select: {
          id: true,
          businessName: true,
          storeDisplayName: true,
          ownerUserId: true,
          status: true,
        },
      },
    },
  },
  deliveryPartner: {
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  },
  assignments: {
    orderBy: { assignedAt: 'desc' as const },
    include: {
      deliveryPartner: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: OrderNotificationsService,
    @Inject(DELIVERY_PROVIDER_TOKEN)
    private readonly deliveryProvider: IDeliveryProvider,
    @Optional()
    @InjectQueue(DELIVERY_OPERATIONS_QUEUE)
    private readonly deliveryQueue?: Queue,
  ) {}

  private async scheduleAssignmentTimeout(
    assignmentId: string,
    deliveryId: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.deliveryQueue) return;
    try {
      const delay = Math.max(1000, expiresAt.getTime() - Date.now());
      await this.deliveryQueue.add(
        'assignment-timeout',
        { assignmentId, deliveryId },
        {
          jobId: `assign-timeout-${assignmentId}`,
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch (err) {
      this.logger.warn(`Failed to schedule assignment timeout: ${(err as Error).message}`);
    }
  }

  /**
   * Idempotently creates a Delivery record for an Order (enforcing @unique orderId).
   * Never creates a delivery for cancelled/rejected/refunded orders.
   */
  async ensureDeliveryForOrderInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    actorId?: string,
    actorRole = 'SYSTEM',
  ) {
    const existing = await tx.delivery.findUnique({
      where: { orderId },
      include: DELIVERY_DETAIL_INCLUDE,
    });
    if (existing) return existing;

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        seller: { include: { profile: true } },
      },
    });

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new ConflictException({
        code: 'ORDER_CANCELLED',
        message: `Cannot create delivery for an order in ${order.status} status.`,
      });
    }

    const pickupAddressSnapshot = {
      storeName: order.storeNameSnapshot || order.seller.storeDisplayName || order.seller.businessName,
      addressLine1: order.seller.profile?.addressLine1 || '',
      city: order.seller.profile?.city || '',
      state: order.seller.profile?.state || '',
      postalCode: order.seller.profile?.postalCode || '',
      latitude: order.seller.profile?.latitude ? Number(order.seller.profile.latitude) : null,
      longitude: order.seller.profile?.longitude ? Number(order.seller.profile.longitude) : null,
      phone: order.seller.businessPhone,
    };

    const initialStatus =
      order.status === OrderStatus.PACKED
        ? DeliveryStatus.READY_FOR_PICKUP
        : DeliveryStatus.PENDING;

    const now = new Date();
    try {
      const created = await tx.delivery.create({
        data: {
          orderId: order.id,
          status: initialStatus,
          pickupAddressSnapshot: pickupAddressSnapshot as Prisma.InputJsonValue,
          deliveryAddressSnapshot: order.addressSnapshot as Prisma.InputJsonValue,
          deliveryInstructions: order.notes,
          readyForPickupAt: initialStatus === DeliveryStatus.READY_FOR_PICKUP ? now : null,
          estimatedDeliveryAt: new Date(now.getTime() + 30 * 60 * 1000),
          statusHistory: {
            create: {
              previousStatus: DeliveryStatus.PENDING,
              newStatus: initialStatus,
              actorRole,
              updatedBy: actorId || null,
              note:
                initialStatus === DeliveryStatus.READY_FOR_PICKUP
                  ? 'Delivery created and marked ready for pickup'
                  : 'Delivery record initialized',
            },
          },
        },
        include: DELIVERY_DETAIL_INCLUDE,
      });
      return created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return tx.delivery.findUniqueOrThrow({
          where: { orderId },
          include: DELIVERY_DETAIL_INCLUDE,
        });
      }
      throw err;
    }
  }

  /**
   * Synchronizes Delivery -> READY_FOR_PICKUP when Seller packs the order,
   * generating a secure 4-digit handover OTP (stored hashed) for customer verification.
   */
  async markOrderReadyForPickupInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    actorId: string,
    actorRole: string,
  ): Promise<{ plainOtp: string | null; deliveryId: string }> {
    const delivery = await this.ensureDeliveryForOrderInTx(tx, orderId, actorId, actorRole);

    if (delivery.status === DeliveryStatus.READY_FOR_PICKUP && delivery.otpHash) {
      return { plainOtp: null, deliveryId: delivery.id };
    }

    if (
      delivery.status !== DeliveryStatus.PENDING &&
      delivery.status !== DeliveryStatus.READY_FOR_PICKUP
    ) {
      return { plainOtp: null, deliveryId: delivery.id };
    }

    const now = new Date();
    const plainOtp = generateDeliveryOtp();
    const otpHash = hashDeliveryOtp(plainOtp, delivery.id);
    const otpExpiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4h window

    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.READY_FOR_PICKUP,
        readyForPickupAt: delivery.readyForPickupAt || now,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    if (delivery.status !== DeliveryStatus.READY_FOR_PICKUP) {
      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.READY_FOR_PICKUP,
          actorRole,
          updatedBy: actorId,
          note: 'Order packed and ready for rider pickup',
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { deliveryStatus: DeliveryStatus.READY_FOR_PICKUP },
    });

    return { plainOtp, deliveryId: delivery.id };
  }

  async cancelDeliveryForOrderInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
    actorId?: string,
    actorRole = 'SYSTEM',
  ): Promise<void> {
    const delivery = await tx.delivery.findUnique({ where: { orderId } });
    if (!delivery || TERMINAL_DELIVERY_STATUSES.has(delivery.status)) {
      return;
    }

    const now = new Date();
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: now,
      },
    });

    await tx.deliveryAssignment.updateMany({
      where: {
        deliveryId: delivery.id,
        status: { in: [DeliveryAssignmentStatus.OFFERED, DeliveryAssignmentStatus.ACCEPTED] },
      },
      data: { status: DeliveryAssignmentStatus.CANCELLED, respondedAt: now },
    });

    await tx.deliveryStatusHistory.create({
      data: {
        deliveryId: delivery.id,
        previousStatus: delivery.status,
        newStatus: DeliveryStatus.CANCELLED,
        actorRole,
        updatedBy: actorId || null,
        note: `Delivery cancelled: ${reason}`,
      },
    });
  }

  // ===========================================================================
  // ADMIN OPERATIONS
  // ===========================================================================

  async listAdminDeliveries(query: QueryDeliveriesDto): Promise<PaginatedDeliveriesResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            order: {
              OR: [
                { orderNumber: { contains: query.search.trim(), mode: 'insensitive' } },
                { storeNameSnapshot: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: DELIVERY_DETAIL_INCLUDE,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      items: items.map(mapDeliverySummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAdminDeliveryDetail(deliveryId: string): Promise<DeliveryDetailResponse> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: DELIVERY_DETAIL_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('Delivery not found.');
    return mapDeliveryDetail(delivery);
  }

  async getAdminDeliveryHistory(deliveryId: string): Promise<DeliveryStatusHistoryItem[]> {
    const exists = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Delivery not found.');

    const history = await this.prisma.deliveryStatusHistory.findMany({
      where: { deliveryId },
      orderBy: { createdAt: 'asc' },
    });
    return history.map(mapDeliveryHistoryItem);
  }

  async listDeliveryPartners(page = 1, limit = 20): Promise<PaginatedDeliveryPartnersResponse> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.deliveryPartner.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.deliveryPartner.count(),
    ]);

    return {
      items: items.map(mapDeliveryPartner),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async registerOrUpdatePartner(
    dto: RegisterDeliveryPartnerDto,
  ): Promise<DeliveryPartnerSummary> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found.');

    const partner = await this.prisma.deliveryPartner.upsert({
      where: { userId: dto.userId },
      update: {
        vehicleType: dto.vehicleType.trim(),
        vehicleNumber: dto.vehicleNumber?.trim() || null,
        verificationStatus: dto.verificationStatus || VerificationStatus.VERIFIED,
      },
      create: {
        userId: dto.userId,
        vehicleType: dto.vehicleType.trim(),
        vehicleNumber: dto.vehicleNumber?.trim() || null,
        verificationStatus: dto.verificationStatus || VerificationStatus.VERIFIED,
        availabilityStatus: 'AVAILABLE',
      },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    return mapDeliveryPartner(partner);
  }

  async assignDelivery(
    adminUserId: string,
    deliveryId: string,
    dto: AssignDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ASSIGNMENT_OFFER_TIMEOUT_MS);

    const { updated, assignmentId, customerInfo } = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          order: {
            include: {
              customer: { select: { id: true, email: true } },
              seller: { select: { status: true, storeDisplayName: true, businessName: true } },
            },
          },
        },
      });
      if (!delivery) throw new NotFoundException('Delivery not found.');

      if (TERMINAL_DELIVERY_STATUSES.has(delivery.status)) {
        throw new ConflictException({
          code: 'DELIVERY_TERMINAL',
          message: `Cannot assign a delivery in ${delivery.status} status.`,
        });
      }

      if (delivery.status === DeliveryStatus.FAILED && delivery.attemptCount >= delivery.maxAttempts) {
        throw new ConflictException({
          code: 'MAX_DELIVERY_ATTEMPTS_REACHED',
          message: `Maximum delivery attempts (${delivery.maxAttempts}) reached. Escalate or cancel.`,
        });
      }

      if (
        delivery.status !== DeliveryStatus.READY_FOR_PICKUP &&
        delivery.status !== DeliveryStatus.PENDING &&
        delivery.status !== DeliveryStatus.FAILED
      ) {
        throw new ConflictException({
          code: 'DELIVERY_ALREADY_ASSIGNED',
          message: `Delivery is currently ${delivery.status}. Use reassign instead.`,
        });
      }

      if (
        delivery.order.status === OrderStatus.CANCELLED ||
        delivery.order.status === OrderStatus.REJECTED
      ) {
        throw new ConflictException('Cannot assign delivery for a cancelled or rejected order.');
      }

      const partner = await tx.deliveryPartner.findUnique({
        where: { id: dto.deliveryPartnerId },
        include: { user: { select: { id: true, name: true, status: true } } },
      });
      if (!partner) throw new NotFoundException('Delivery partner not found.');

      if (partner.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new ForbiddenException({
          code: 'PARTNER_NOT_VERIFIED',
          message: `Delivery partner is ${partner.verificationStatus} and cannot be assigned.`,
        });
      }

      if (partner.availabilityStatus === 'OFFLINE') {
        throw new ConflictException({
          code: 'PARTNER_OFFLINE',
          message: 'Delivery partner is currently OFFLINE.',
        });
      }

      // Concurrency-safe conditional update
      const count = await tx.delivery.updateMany({
        where: { id: delivery.id, status: delivery.status },
        data: {
          deliveryPartnerId: partner.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: now,
        },
      });
      if (count.count === 0) {
        throw new ConflictException('Delivery was concurrently modified. Please refresh.');
      }

      const assignment = await tx.deliveryAssignment.create({
        data: {
          deliveryId: delivery.id,
          deliveryPartnerId: partner.id,
          status: DeliveryAssignmentStatus.OFFERED,
          assignedBy: adminUserId,
          expiresAt,
        },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.ASSIGNED,
          actorRole: 'ADMIN',
          updatedBy: adminUserId,
          note: dto.note?.trim() || `Assigned to partner ${partner.user?.name || partner.id}`,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.ASSIGNED },
      });

      const refreshed = await tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });

      return {
        updated: refreshed,
        assignmentId: assignment.id,
        customerInfo: {
          orderId: delivery.orderId,
          orderNumber: delivery.order.orderNumber,
          customerId: delivery.order.customerId,
          customerEmail: delivery.order.customer?.email,
          storeName:
            delivery.order.storeNameSnapshot ||
            delivery.order.seller?.storeDisplayName ||
            delivery.order.seller?.businessName ||
            'Store',
          partnerName: partner.user?.name || 'Delivery Partner',
        },
      };
    });

    await this.deliveryProvider.requestDispatch({
      deliveryId: updated.id,
      orderId: updated.orderId,
      orderNumber: updated.order.orderNumber,
      pickupAddress: updated.pickupAddressSnapshot as Record<string, unknown>,
      deliveryAddress: updated.deliveryAddressSnapshot as Record<string, unknown>,
    });

    await this.scheduleAssignmentTimeout(assignmentId, updated.id, expiresAt);

    void this.notifications.notifyDeliveryEvent({
      ...customerInfo,
      eventTitle: `Delivery partner assigned for ${customerInfo.orderNumber}`,
      message: `${customerInfo.partnerName} has been assigned to deliver your order ${customerInfo.orderNumber} from ${customerInfo.storeName}.`,
    });

    return mapDeliveryDetail(updated);
  }

  async reassignDelivery(
    adminUserId: string,
    deliveryId: string,
    dto: ReassignDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ASSIGNMENT_OFFER_TIMEOUT_MS);

    const { updated, assignmentId } = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
      if (!delivery) throw new NotFoundException('Delivery not found.');

      if (
        delivery.status === DeliveryStatus.PICKED_UP ||
        delivery.status === DeliveryStatus.IN_TRANSIT ||
        delivery.status === DeliveryStatus.DELIVERED ||
        delivery.status === DeliveryStatus.CANCELLED
      ) {
        throw new ConflictException({
          code: 'REASSIGNMENT_NOT_ALLOWED',
          message: `Cannot reassign delivery in ${delivery.status} status.`,
        });
      }

      const partner = await tx.deliveryPartner.findUnique({
        where: { id: dto.deliveryPartnerId },
        include: { user: { select: { name: true } } },
      });
      if (!partner) throw new NotFoundException('Delivery partner not found.');
      if (partner.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new ForbiddenException('Target delivery partner is not verified.');
      }

      await tx.deliveryAssignment.updateMany({
        where: {
          deliveryId: delivery.id,
          status: { in: [DeliveryAssignmentStatus.OFFERED, DeliveryAssignmentStatus.ACCEPTED] },
        },
        data: { status: DeliveryAssignmentStatus.CANCELLED, respondedAt: now },
      });

      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          deliveryPartnerId: partner.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: now,
        },
      });

      const assignment = await tx.deliveryAssignment.create({
        data: {
          deliveryId: delivery.id,
          deliveryPartnerId: partner.id,
          status: DeliveryAssignmentStatus.OFFERED,
          assignedBy: adminUserId,
          expiresAt,
        },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.ASSIGNED,
          actorRole: 'ADMIN',
          updatedBy: adminUserId,
          note: `Reassigned to ${partner.user?.name || partner.id}: ${dto.reason.trim()}`,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.ASSIGNED },
      });

      const refreshed = await tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });

      return { updated: refreshed, assignmentId: assignment.id };
    });

    await this.scheduleAssignmentTimeout(assignmentId, updated.id, expiresAt);
    return mapDeliveryDetail(updated);
  }

  async cancelDeliveryByAdmin(
    adminUserId: string,
    deliveryId: string,
    dto: CancelDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
      if (!delivery) throw new NotFoundException('Delivery not found.');

      if (delivery.status === DeliveryStatus.CANCELLED) {
        return tx.delivery.findUniqueOrThrow({
          where: { id: delivery.id },
          include: DELIVERY_DETAIL_INCLUDE,
        });
      }

      assertValidDeliveryTransition(delivery.status, DeliveryStatus.CANCELLED);
      await this.cancelDeliveryForOrderInTx(
        tx,
        delivery.orderId,
        dto.reason.trim(),
        adminUserId,
        'ADMIN',
      );
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.CANCELLED },
      });

      return tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    });

    return mapDeliveryDetail(updated);
  }

  // ===========================================================================
  // SELLER FULFILLMENT OPERATIONS
  // ===========================================================================

  private async resolveOwnedSeller(sellerUserId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: sellerUserId },
    });
    if (!seller) throw new NotFoundException('Seller store not found.');
    return seller;
  }

  async listSellerDeliveries(
    sellerUserId: string,
    query: QueryDeliveriesDto,
  ): Promise<PaginatedDeliveriesResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryWhereInput = {
      order: { sellerId: seller.id },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            order: {
              sellerId: seller.id,
              orderNumber: { contains: query.search.trim(), mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: DELIVERY_DETAIL_INCLUDE,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      items: items.map(mapDeliverySummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getSellerDeliveryDetail(
    sellerUserId: string,
    deliveryId: string,
  ): Promise<DeliveryDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, order: { sellerId: seller.id } },
      include: DELIVERY_DETAIL_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('Delivery not found for your store.');
    return mapDeliveryDetail(delivery);
  }

  async markSellerReadyForPickup(
    sellerUserId: string,
    deliveryId: string,
  ): Promise<DeliveryDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    if (seller.status === SellerStatus.SUSPENDED) {
      throw new ForbiddenException('Suspended stores cannot mark orders ready for pickup.');
    }

    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, order: { sellerId: seller.id } },
      include: { order: { include: { customer: { select: { id: true, email: true } } } } },
    });
    if (!delivery) throw new NotFoundException('Delivery not found for your store.');

    if (delivery.order.status !== OrderStatus.PACKED) {
      throw new ConflictException({
        code: 'ORDER_NOT_PACKED',
        message: `Order must be PACKED before marking ready for pickup (current: ${delivery.order.status}).`,
      });
    }

    const { plainOtp } = await this.prisma.$transaction(async (tx) =>
      this.markOrderReadyForPickupInTx(tx, delivery.orderId, sellerUserId, 'SELLER'),
    );

    if (plainOtp) {
      void this.notifications.notifyDeliveryEvent({
        orderId: delivery.orderId,
        orderNumber: delivery.order.orderNumber,
        customerId: delivery.order.customerId,
        customerEmail: delivery.order.customer?.email,
        storeName: delivery.order.storeNameSnapshot || seller.businessName,
        eventTitle: `Order ${delivery.order.orderNumber} is packed & ready`,
        message: `Your order ${delivery.order.orderNumber} is packed and ready for pickup. Share Delivery OTP ${plainOtp} with your delivery partner upon arrival.`,
      });
    }

    return this.getSellerDeliveryDetail(sellerUserId, deliveryId);
  }

  async confirmSellerHandover(
    sellerUserId: string,
    deliveryId: string,
  ): Promise<DeliveryDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, order: { sellerId: seller.id } },
    });
    if (!delivery) throw new NotFoundException('Delivery not found for your store.');

    if (
      delivery.status !== DeliveryStatus.ASSIGNED &&
      delivery.status !== DeliveryStatus.ACCEPTED &&
      delivery.status !== DeliveryStatus.PICKED_UP
    ) {
      throw new ConflictException({
        code: 'HANDOVER_NOT_ELIGIBLE',
        message: `Cannot confirm handover when delivery is ${delivery.status}.`,
      });
    }

    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      await this.prisma.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: delivery.status,
          actorRole: 'SELLER',
          updatedBy: sellerUserId,
          note: 'Seller confirmed physical package handover readiness',
        },
      });
    }

    return this.getSellerDeliveryDetail(sellerUserId, deliveryId);
  }

  async reportSellerIssue(
    sellerUserId: string,
    deliveryId: string,
    dto: ReportHandoverIssueDto,
  ): Promise<DeliveryDetailResponse> {
    const seller = await this.resolveOwnedSeller(sellerUserId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, order: { sellerId: seller.id } },
    });
    if (!delivery) throw new NotFoundException('Delivery not found for your store.');

    await this.prisma.deliveryStatusHistory.create({
      data: {
        deliveryId: delivery.id,
        previousStatus: delivery.status,
        newStatus: delivery.status,
        actorRole: 'SELLER',
        updatedBy: sellerUserId,
        note: `Seller reported issue (${dto.reason.trim()}): ${dto.note?.trim() || 'No extra notes'}`,
      },
    });

    return this.getSellerDeliveryDetail(sellerUserId, deliveryId);
  }

  // ===========================================================================
  // DELIVERY PARTNER (RIDER) OPERATIONS
  // ===========================================================================

  private async resolveDeliveryPartner(userId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    if (!partner) {
      throw new ForbiddenException({
        code: 'NOT_A_DELIVERY_PARTNER',
        message: 'No delivery partner profile found for this account.',
      });
    }
    return partner;
  }

  async getRiderProfile(userId: string): Promise<DeliveryPartnerSummary> {
    const partner = await this.resolveDeliveryPartner(userId);
    return mapDeliveryPartner(partner);
  }

  async updateRiderAvailability(
    userId: string,
    dto: UpdatePartnerAvailabilityDto,
  ): Promise<DeliveryPartnerSummary> {
    const partner = await this.resolveDeliveryPartner(userId);
    const updated = await this.prisma.deliveryPartner.update({
      where: { id: partner.id },
      data: { availabilityStatus: dto.availabilityStatus },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    return mapDeliveryPartner(updated);
  }

  async listRiderAssignments(
    userId: string,
    query: QueryDeliveriesDto,
  ): Promise<PaginatedDeliveriesResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryWhereInput = {
      deliveryPartnerId: partner.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: DELIVERY_DETAIL_INCLUDE,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      items: items.map(mapDeliverySummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getRiderAssignmentDetail(
    userId: string,
    deliveryId: string,
  ): Promise<DeliveryDetailResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, deliveryPartnerId: partner.id },
      include: DELIVERY_DETAIL_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('Delivery assignment not found.');
    return mapDeliveryDetail(delivery);
  }

  async acceptAssignment(userId: string, deliveryId: string): Promise<DeliveryDetailResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    if (partner.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Only verified delivery partners can accept assignments.');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, deliveryPartnerId: partner.id },
      });
      if (!delivery) throw new NotFoundException('Delivery assignment not found.');

      if (delivery.status === DeliveryStatus.ACCEPTED) {
        return tx.delivery.findUniqueOrThrow({
          where: { id: delivery.id },
          include: DELIVERY_DETAIL_INCLUDE,
        });
      }

      assertValidDeliveryTransition(delivery.status, DeliveryStatus.ACCEPTED);

      await tx.delivery.update({
        where: { id: delivery.id },
        data: { status: DeliveryStatus.ACCEPTED, acceptedAt: now },
      });

      await tx.deliveryAssignment.updateMany({
        where: {
          deliveryId: delivery.id,
          deliveryPartnerId: partner.id,
          status: DeliveryAssignmentStatus.OFFERED,
        },
        data: { status: DeliveryAssignmentStatus.ACCEPTED, respondedAt: now },
      });

      await tx.deliveryPartner.update({
        where: { id: partner.id },
        data: { availabilityStatus: 'ON_DELIVERY' },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.ACCEPTED,
          actorRole: 'DELIVERY_PARTNER',
          updatedBy: userId,
          note: `Accepted by ${partner.user?.name || 'partner'}`,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.ACCEPTED },
      });

      return tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    });

    return mapDeliveryDetail(updated);
  }

  async rejectAssignment(
    userId: string,
    deliveryId: string,
    dto: RejectAssignmentDto,
  ): Promise<DeliveryDetailResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, deliveryPartnerId: partner.id },
      });
      if (!delivery) throw new NotFoundException('Delivery assignment not found.');

      if (
        delivery.status !== DeliveryStatus.ASSIGNED &&
        delivery.status !== DeliveryStatus.ACCEPTED
      ) {
        throw new ConflictException(`Cannot reject delivery in ${delivery.status} status.`);
      }

      await tx.deliveryAssignment.updateMany({
        where: {
          deliveryId: delivery.id,
          deliveryPartnerId: partner.id,
          status: { in: [DeliveryAssignmentStatus.OFFERED, DeliveryAssignmentStatus.ACCEPTED] },
        },
        data: {
          status: DeliveryAssignmentStatus.REJECTED,
          rejectionReason: dto.reason.trim(),
          respondedAt: now,
        },
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
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.READY_FOR_PICKUP,
          actorRole: 'DELIVERY_PARTNER',
          updatedBy: userId,
          note: `Assignment rejected by ${partner.user?.name || 'partner'}: ${dto.reason.trim()}`,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.READY_FOR_PICKUP },
      });

      return tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    });

    return mapDeliveryDetail(updated);
  }

  async pickupDelivery(userId: string, deliveryId: string): Promise<DeliveryDetailResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    const now = new Date();

    const { updated, notifyPayload } = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, deliveryPartnerId: partner.id },
        include: {
          order: { include: { customer: { select: { id: true, email: true } } } },
        },
      });
      if (!delivery) throw new NotFoundException('Delivery assignment not found.');

      if (
        delivery.status === DeliveryStatus.PICKED_UP ||
        delivery.status === DeliveryStatus.IN_TRANSIT
      ) {
        return {
          updated: await tx.delivery.findUniqueOrThrow({
            where: { id: delivery.id },
            include: DELIVERY_DETAIL_INCLUDE,
          }),
          notifyPayload: null,
        };
      }

      if (delivery.order.status !== OrderStatus.PACKED) {
        throw new ConflictException({
          code: 'ORDER_NOT_PACKED',
          message: `Cannot pick up order before seller completes packing (order status: ${delivery.order.status}).`,
        });
      }

      assertValidDeliveryTransition(delivery.status, DeliveryStatus.PICKED_UP);

      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.IN_TRANSIT,
          pickedUpAt: now,
        },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.PICKED_UP,
          actorRole: 'DELIVERY_PARTNER',
          updatedBy: userId,
          note: 'Package picked up from store',
        },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: DeliveryStatus.PICKED_UP,
          newStatus: DeliveryStatus.IN_TRANSIT,
          actorRole: 'DELIVERY_PARTNER',
          updatedBy: userId,
          note: 'Rider is in transit to customer',
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: OrderStatus.OUT_FOR_DELIVERY,
          deliveryStatus: DeliveryStatus.IN_TRANSIT,
          dispatchedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          previousStatus: delivery.order.status,
          newStatus: OrderStatus.OUT_FOR_DELIVERY,
          note: `Picked up by delivery partner ${partner.user?.name || ''}`.trim(),
          changedBy: userId,
          actorRole: 'DELIVERY_PARTNER',
        },
      });

      const refreshed = await tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });

      return {
        updated: refreshed,
        notifyPayload: {
          orderId: delivery.orderId,
          orderNumber: delivery.order.orderNumber,
          customerId: delivery.order.customerId,
          customerEmail: delivery.order.customer?.email,
          storeName: delivery.order.storeNameSnapshot || 'Store',
          newStatus: OrderStatus.OUT_FOR_DELIVERY,
        },
      };
    });

    if (notifyPayload) {
      void this.notifications.notifyOrderStatusChanged(notifyPayload);
    }

    return mapDeliveryDetail(updated);
  }

  async completeDelivery(
    userId: string,
    deliveryId: string,
    dto: CompleteDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    const now = new Date();

    const { updated, notifyPayload } = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, deliveryPartnerId: partner.id },
        include: {
          order: {
            include: {
              customer: { select: { id: true, email: true } },
              seller: { select: { ownerUserId: true } },
            },
          },
        },
      });
      if (!delivery) throw new NotFoundException('Delivery assignment not found.');

      if (delivery.status === DeliveryStatus.DELIVERED) {
        return {
          updated: await tx.delivery.findUniqueOrThrow({
            where: { id: delivery.id },
            include: DELIVERY_DETAIL_INCLUDE,
          }),
          notifyPayload: null,
        };
      }

      if (
        delivery.status !== DeliveryStatus.PICKED_UP &&
        delivery.status !== DeliveryStatus.IN_TRANSIT
      ) {
        throw new ConflictException({
          code: 'DELIVERY_NOT_PICKED_UP',
          message: `Delivery must be PICKED_UP or IN_TRANSIT before completion (current: ${delivery.status}).`,
        });
      }

      // Verify Delivery OTP if present on record
      if (delivery.otpHash) {
        if (!dto.otp?.trim()) {
          throw new BadRequestException({
            code: 'DELIVERY_OTP_REQUIRED',
            message: 'Customer delivery OTP is required to complete delivery.',
          });
        }
        if (delivery.otpAttempts >= MAX_OTP_ATTEMPTS) {
          throw new ForbiddenException({
            code: 'DELIVERY_OTP_LOCKED',
            message: 'Maximum OTP verification attempts exceeded. Contact support.',
          });
        }
        if (delivery.otpExpiresAt && delivery.otpExpiresAt <= now) {
          throw new BadRequestException({
            code: 'DELIVERY_OTP_EXPIRED',
            message: 'Delivery OTP has expired. Request support intervention.',
          });
        }
        if (!verifyDeliveryOtpHash(dto.otp, delivery.id, delivery.otpHash)) {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: { otpAttempts: { increment: 1 } },
          });
          throw new BadRequestException({
            code: 'INVALID_DELIVERY_OTP',
            message: 'Incorrect delivery OTP.',
          });
        }
      }

      // Verify COD collection if COD order
      const isCod = delivery.order.paymentMethod === PaymentMethod.COD;
      const expectedTotal = Number(delivery.order.totalAmount);
      if (isCod) {
        if (!dto.codCollected) {
          throw new BadRequestException({
            code: 'COD_COLLECTION_REQUIRED',
            message: 'Please confirm COD cash/UPI collection before completing delivery.',
          });
        }
        const collected =
          dto.codCollectedAmount !== undefined ? dto.codCollectedAmount : expectedTotal;
        if (Math.round(collected * 100) < Math.round(expectedTotal * 100)) {
          throw new BadRequestException({
            code: 'COD_AMOUNT_MISMATCH',
            message: `Collected COD amount (₹${collected}) is less than order total (₹${expectedTotal}).`,
          });
        }
      }

      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: now,
          recipientName: dto.recipientName?.trim() || null,
          deliveryNotes: dto.note?.trim() || null,
          codCollected: isCod ? true : false,
          codCollectedAmount: isCod ? new Decimal(expectedTotal) : null,
          otpHash: null, // One-time use
        },
      });

      await tx.deliveryPartner.update({
        where: { id: partner.id },
        data: { availabilityStatus: 'AVAILABLE' },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.DELIVERED,
          actorRole: 'DELIVERY_PARTNER',
          updatedBy: userId,
          note: dto.note?.trim() || 'Delivered to customer',
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveryStatus: DeliveryStatus.DELIVERED,
          paymentStatus: isCod ? PaymentStatus.SUCCESS : delivery.order.paymentStatus,
          deliveredAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          previousStatus: delivery.order.status,
          newStatus: OrderStatus.DELIVERED,
          note: 'Order delivered successfully',
          changedBy: userId,
          actorRole: 'DELIVERY_PARTNER',
        },
      });

      const refreshed = await tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });

      return {
        updated: refreshed,
        notifyPayload: {
          orderId: delivery.orderId,
          orderNumber: delivery.order.orderNumber,
          customerId: delivery.order.customerId,
          customerEmail: delivery.order.customer?.email,
          sellerOwnerUserId: delivery.order.seller?.ownerUserId,
          storeName: delivery.order.storeNameSnapshot || 'Store',
          newStatus: OrderStatus.DELIVERED,
        },
      };
    });

    if (notifyPayload) {
      void this.notifications.notifyOrderStatusChanged(notifyPayload);
    }

    return mapDeliveryDetail(updated);
  }

  async failDelivery(
    userId: string,
    deliveryId: string,
    dto: FailDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    const partner = await this.resolveDeliveryPartner(userId);
    const now = new Date();

    const { updated, notifyPayload } = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: deliveryId, deliveryPartnerId: partner.id },
        include: {
          order: { include: { customer: { select: { id: true, email: true } } } },
        },
      });
      if (!delivery) throw new NotFoundException('Delivery assignment not found.');

      assertValidDeliveryTransition(delivery.status, DeliveryStatus.FAILED);

      const nextAttempts = delivery.attemptCount + 1;
      const exhausted = nextAttempts >= delivery.maxAttempts;
      const fullReason = dto.note?.trim() ? `${dto.reason}: ${dto.note.trim()}` : dto.reason;

      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.FAILED,
          attemptCount: nextAttempts,
          failureReason: fullReason,
          failedAt: now,
        },
      });

      await tx.deliveryPartner.update({
        where: { id: partner.id },
        data: { availabilityStatus: 'AVAILABLE' },
      });

      await tx.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          previousStatus: delivery.status,
          newStatus: DeliveryStatus.FAILED,
          actorRole: 'DELIVERY_PARTNER',
          updatedBy: userId,
          note: `Attempt #${nextAttempts} failed: ${fullReason}`,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          deliveryStatus: DeliveryStatus.FAILED,
          ...(exhausted && delivery.order.status === OrderStatus.OUT_FOR_DELIVERY
            ? { status: OrderStatus.FAILED }
            : {}),
        },
      });

      if (exhausted && delivery.order.status === OrderStatus.OUT_FOR_DELIVERY) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: delivery.orderId,
            previousStatus: delivery.order.status,
            newStatus: OrderStatus.FAILED,
            note: `Delivery failed after ${nextAttempts} attempts: ${fullReason}`,
            changedBy: userId,
            actorRole: 'DELIVERY_PARTNER',
          },
        });
      }

      const refreshed = await tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        include: DELIVERY_DETAIL_INCLUDE,
      });

      return {
        updated: refreshed,
        notifyPayload: {
          orderId: delivery.orderId,
          orderNumber: delivery.order.orderNumber,
          customerId: delivery.order.customerId,
          customerEmail: delivery.order.customer?.email,
          storeName: delivery.order.storeNameSnapshot || 'Store',
          newStatus: OrderStatus.FAILED,
          reason: fullReason,
        },
      };
    });

    if (notifyPayload) {
      void this.notifications.notifyOrderStatusChanged(notifyPayload);
    }

    return mapDeliveryDetail(updated);
  }

  // ===========================================================================
  // CUSTOMER TRACKING OPERATIONS
  // ===========================================================================

  async getCustomerDelivery(userId: string, orderId: string): Promise<DeliveryDetailResponse> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId, order: { customerId: userId } },
      include: DELIVERY_DETAIL_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('Delivery record not found for this order.');
    return mapDeliveryDetail(delivery);
  }

  async getCustomerDeliveryTracking(
    userId: string,
    orderId: string,
  ): Promise<CustomerDeliveryTrackingResponse> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId, order: { customerId: userId } },
      include: DELIVERY_DETAIL_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('Delivery tracking not found for this order.');
    return mapCustomerDeliveryTracking(delivery);
  }

  async getCustomerDeliveryHistory(
    userId: string,
    orderId: string,
  ): Promise<DeliveryStatusHistoryItem[]> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId, order: { customerId: userId } },
      select: { id: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found for this order.');

    const history = await this.prisma.deliveryStatusHistory.findMany({
      where: { deliveryId: delivery.id },
      orderBy: { createdAt: 'asc' },
    });
    return history.map(mapDeliveryHistoryItem);
  }
}
