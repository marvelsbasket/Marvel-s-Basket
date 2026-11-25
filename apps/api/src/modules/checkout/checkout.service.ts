import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CheckoutSessionStatus, ProductStatus, SellerProductStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CheckoutAddressSnapshot,
  CheckoutSessionStatusType,
  CheckoutSnapshotItem,
  CheckoutSummaryResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { PricingService } from '../cart/pricing.service';
import {
  DEFAULT_RESERVATION_TTL_MINUTES,
  InventoryReservationService,
} from '../inventory/services/inventory-reservation.service';
import { CancelCheckoutDto, PrepareCheckoutDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    private readonly pricingService: PricingService,
    private readonly reservationService: InventoryReservationService,
  ) {}

  private formatCheckoutResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seller: any,
  ): CheckoutSummaryResponse {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const isExpired =
      session.status === CheckoutSessionStatus.EXPIRED ||
      (session.status === CheckoutSessionStatus.RESERVATION_ACTIVE && remainingSeconds <= 0);

    const op = this.storesService.evaluateStoreOperationalStatus(seller);
    const distanceKm = session.distanceKm !== null ? Number(session.distanceKm) : null;
    const eta = this.storesService.computeDeliveryEstimate(
      seller.profile?.preparationTime,
      distanceKm,
      op.isOpen,
      op.isAcceptingOrders,
    );

    const items = (session.itemsSnapshot || []) as CheckoutSnapshotItem[];
    const address = session.addressSnapshot as CheckoutAddressSnapshot;
    const itemSubtotal = Number(session.itemSubtotal);
    const productDiscount = Number(session.productDiscount);
    const couponDiscount = Number(session.couponDiscount);
    const deliveryFee = Number(session.deliveryFee);
    const taxAmount = Number(session.taxAmount);
    const grandTotal = Number(session.grandTotal);
    const totalMrp = this.pricingService.fromPaise(
      this.pricingService.toPaise(itemSubtotal) + this.pricingService.toPaise(productDiscount),
    );
    const totalSavings = this.pricingService.fromPaise(
      this.pricingService.toPaise(productDiscount) + this.pricingService.toPaise(couponDiscount),
    );

    return {
      checkoutSessionId: session.id,
      cartId: session.cartId,
      status: (isExpired ? 'EXPIRED' : session.status) as CheckoutSessionStatusType,
      store: {
        id: seller.id,
        name: seller.storeDisplayName || seller.businessName,
        slug: seller.slug,
        deliveryTimeMinutes: eta.deliveryTimeMinutes,
        deliveryEtaLabel: eta.deliveryEtaLabel,
        isOpen: op.isOpen,
        isAcceptingOrders: op.isAcceptingOrders,
        operationalStatusLabel: op.operationalStatusLabel,
      },
      address,
      distanceKm,
      items,
      couponCode: session.couponCode || null,
      priceBreakdown: {
        itemSubtotal,
        productDiscount,
        couponDiscount,
        deliveryFee,
        taxAmount,
        grandTotal,
        totalMrp,
        totalSavings,
      },
      expiresAt: expiresAt.toISOString(),
      serverTime: now.toISOString(),
      remainingSeconds,
      isExpired,
    };
  }

  /**
   * Validates cart, store hours, address serviceability, pricing, MOV, delivery fee,
   * and coupons, then atomically reserves inventory for 15 minutes.
   */
  async prepareCheckout(userId: string, dto: PrepareCheckoutDto): Promise<CheckoutSummaryResponse> {
    // 1. Idempotency check
    if (dto.idempotencyKey?.trim()) {
      const existing = await this.prisma.checkoutSession.findFirst({
        where: {
          userId,
          idempotencyKey: dto.idempotencyKey.trim(),
          status: CheckoutSessionStatus.RESERVATION_ACTIVE,
          expiresAt: { gt: new Date() },
        },
        include: {
          seller: { include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } } },
        },
      });
      if (existing) {
        return this.formatCheckoutResponse(existing, existing.seller);
      }
    }

    // 2. Validate customer address ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'Selected delivery address was not found.',
      });
    }

    // 3. Load customer cart with store & listings
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        seller: {
          include: {
            profile: true,
            businessHours: { orderBy: { dayOfWeek: 'asc' } },
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            sellerProduct: {
              include: {
                product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
                variant: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || !cart.sellerId || !cart.seller || cart.items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_BASKET',
        message: 'Your basket is empty. Add items before preparing checkout.',
      });
    }

    // 4. Validate store operational status & hours
    const seller = cart.seller;
    const storeName = seller.storeDisplayName || seller.businessName;
    const op = this.storesService.evaluateStoreOperationalStatus(seller);
    if (!op.isApproved || !op.isOpen || !op.isAcceptingOrders) {
      const nextOpenHint = op.openingTime ? ` Next opening time: ${op.openingTime} IST.` : '';
      throw new BadRequestException({
        code: 'STORE_CLOSED',
        message: `${storeName} is currently ${op.operationalStatusLabel.toLowerCase()} and not accepting orders.${nextOpenHint}`,
        data: {
          operationalStatusLabel: op.operationalStatusLabel,
          openingTime: op.openingTime,
          closingTime: op.closingTime,
        },
      });
    }

    // 5. Validate item statuses, MRP ceiling, and price changes
    const config = await this.pricingService.getPlatformPricingConfig();
    const expectedPriceMap = new Map<string, number>(
      (dto.expectedItemPrices || []).map((p) => [
        p.sellerProductId,
        this.pricingService.toPaise(p.unitPrice),
      ]),
    );

    const changedItems: Array<{
      sellerProductId: string;
      productName: string;
      oldUnitPrice: number;
      newUnitPrice: number;
    }> = [];

    const snapshotItems: CheckoutSnapshotItem[] = [];
    let itemSubtotalPaise = 0;
    let totalMrpPaise = 0;

    for (const ci of cart.items) {
      const sp = ci.sellerProduct;
      const product = sp.product;
      const variant = sp.variant;

      if (
        sp.deletedAt ||
        sp.status === SellerProductStatus.PAUSED ||
        sp.status === SellerProductStatus.DISABLED ||
        sp.status === SellerProductStatus.INACTIVE ||
        sp.status === SellerProductStatus.REJECTED ||
        product.deletedAt ||
        product.status !== ProductStatus.ACTIVE ||
        (variant && !variant.isActive)
      ) {
        throw new BadRequestException({
          code: 'ITEM_UNAVAILABLE',
          message: `"${product.name}" is no longer available from ${storeName}.`,
        });
      }

      if (ci.quantity <= 0 || ci.quantity > config.maxCartItemQuantity) {
        throw new BadRequestException({
          code: 'INVALID_QUANTITY',
          message: `Invalid quantity (${ci.quantity}) for "${product.name}".`,
        });
      }

      const unitPricePaise = this.pricingService.toPaise(sp.sellingPrice);
      const mrpPaise = this.pricingService.toPaise(variant?.mrp ?? sp.mrp ?? sp.sellingPrice);
      if (mrpPaise > 0 && unitPricePaise > mrpPaise) {
        throw new ConflictException({
          code: 'PRICE_EXCEEDS_MRP',
          message: `Listing price for "${product.name}" exceeds MRP and cannot be checked out.`,
        });
      }

      const expectedPaise = expectedPriceMap.get(sp.id);
      if (expectedPaise !== undefined && Math.abs(unitPricePaise - expectedPaise) >= 1) {
        changedItems.push({
          sellerProductId: sp.id,
          productName: product.name,
          oldUnitPrice: this.pricingService.fromPaise(expectedPaise),
          newUnitPrice: this.pricingService.fromPaise(unitPricePaise),
        });
      }

      const effectiveMrpPaise = Math.max(mrpPaise, unitPricePaise);
      const lineTotalPaise = unitPricePaise * ci.quantity;
      const discountPercent =
        effectiveMrpPaise > unitPricePaise && effectiveMrpPaise > 0
          ? Math.round(((effectiveMrpPaise - unitPricePaise) / effectiveMrpPaise) * 100)
          : 0;

      itemSubtotalPaise += lineTotalPaise;
      totalMrpPaise += effectiveMrpPaise * ci.quantity;

      snapshotItems.push({
        sellerProductId: sp.id,
        productId: sp.productId,
        variantId: sp.variantId || '',
        productName: product.name,
        productSlug: product.slug,
        packSize: variant?.packSize || variant?.name || null,
        imageUrl: variant?.primaryImageUrl || product.images[0]?.imageUrl || null,
        quantity: ci.quantity,
        unitPrice: this.pricingService.fromPaise(unitPricePaise),
        mrp: this.pricingService.fromPaise(effectiveMrpPaise),
        discountPercent,
        lineTotal: this.pricingService.fromPaise(lineTotalPaise),
        taxAmount: 0,
      });
    }

    if (changedItems.length > 0) {
      throw new ConflictException({
        code: 'PRICE_CHANGE_DETECTED',
        message:
          'Prices for one or more items in your basket have changed. Please review and accept the updated prices.',
        data: { changedItems },
      });
    }

    // 6. Validate MOV
    if (
      config.minimumOrderValuePaise !== null &&
      itemSubtotalPaise < config.minimumOrderValuePaise
    ) {
      const remaining = this.pricingService.fromPaise(
        config.minimumOrderValuePaise - itemSubtotalPaise,
      );
      throw new BadRequestException({
        code: 'BELOW_MINIMUM_ORDER_VALUE',
        message: `Add ₹${remaining.toFixed(2).replace(/\.00$/, '')} more to unlock delivery.`,
        data: {
          minimumOrderValue: this.pricingService.fromPaise(config.minimumOrderValuePaise),
          remainingAmount: remaining,
        },
      });
    }

    // 7. Validate delivery address serviceability & distance-tiered delivery fee
    const deliveryEval = this.pricingService.evaluateDeliveryFee({
      storeName,
      storeLat: seller.profile?.latitude ? Number(seller.profile.latitude) : null,
      storeLon: seller.profile?.longitude ? Number(seller.profile.longitude) : null,
      serviceRadiusKm: seller.profile?.serviceRadiusKm
        ? Number(seller.profile.serviceRadiusKm)
        : null,
      addressLat: address.latitude ? Number(address.latitude) : null,
      addressLon: address.longitude ? Number(address.longitude) : null,
      itemSubtotalPaise,
      config,
    });

    if (!deliveryEval.isServiceable) {
      throw new BadRequestException({
        code: 'ADDRESS_UNSERVICEABLE',
        message: deliveryEval.reason || 'Delivery address is not serviceable by this store.',
      });
    }

    // 8. Validate platform coupon if provided or applied on cart
    const effectiveCouponCode =
      dto.couponCode !== undefined ? dto.couponCode : cart.appliedCouponCode;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let couponDiscountPaise = 0;

    if (effectiveCouponCode && effectiveCouponCode.trim() !== '') {
      const couponEval = await this.pricingService.validateCoupon({
        code: effectiveCouponCode,
        userId,
        itemSubtotalPaise,
      });
      couponId = couponEval.couponId;
      couponCode = couponEval.code;
      couponDiscountPaise = couponEval.discountPaise;
    }

    const productDiscountPaise = Math.max(0, totalMrpPaise - itemSubtotalPaise);
    const taxableBasePaise = Math.max(0, itemSubtotalPaise - couponDiscountPaise);
    const taxAmountPaise =
      config.taxRatePercent > 0 ? Math.round((taxableBasePaise * config.taxRatePercent) / 100) : 0;
    const grandTotalPaise = Math.max(
      0,
      taxableBasePaise + deliveryEval.deliveryFeePaise + taxAmountPaise,
    );

    // 9. Reuse existing valid active CheckoutSession if items, address, and coupon match
    const activeSessions = await this.prisma.checkoutSession.findMany({
      where: {
        userId,
        status: CheckoutSessionStatus.RESERVATION_ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    for (const active of activeSessions) {
      if (active.expiresAt <= now) {
        await this.reservationService.expireSessionReservation(active.id);
        continue;
      }

      const activeSnapshot = (active.itemsSnapshot || []) as unknown as CheckoutSnapshotItem[];
      const sameItems =
        activeSnapshot.length === snapshotItems.length &&
        activeSnapshot.every(
          (item, idx) =>
            item.sellerProductId === snapshotItems[idx].sellerProductId &&
            item.quantity === snapshotItems[idx].quantity &&
            item.unitPrice === snapshotItems[idx].unitPrice,
        );

      if (
        active.sellerId === cart.sellerId &&
        active.addressId === address.id &&
        (active.couponCode || null) === couponCode &&
        sameItems
      ) {
        return this.formatCheckoutResponse(active, seller);
      }

      // Otherwise release the superseded active reservation before creating a new one
      await this.reservationService.releaseReservation({
        checkoutSessionId: active.id,
        reason: 'Superseded by updated checkout preparation',
      });
    }

    // 10. Create CheckoutSession & Atomically Reserve Inventory (15-minute TTL)
    const expiresAt = new Date(Date.now() + DEFAULT_RESERVATION_TTL_MINUTES * 60 * 1000);
    const addressSnapshot: CheckoutAddressSnapshot = {
      id: address.id,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      locality: address.locality,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
    };

    const session = await this.prisma.checkoutSession.create({
      data: {
        userId,
        cartId: cart.id,
        sellerId: cart.sellerId,
        addressId: address.id,
        addressSnapshot: addressSnapshot as object,
        couponId,
        couponCode,
        status: CheckoutSessionStatus.RESERVATION_ACTIVE,
        itemSubtotal: new Decimal(this.pricingService.fromPaise(itemSubtotalPaise)),
        productDiscount: new Decimal(this.pricingService.fromPaise(productDiscountPaise)),
        couponDiscount: new Decimal(this.pricingService.fromPaise(couponDiscountPaise)),
        deliveryFee: new Decimal(this.pricingService.fromPaise(deliveryEval.deliveryFeePaise)),
        taxAmount: new Decimal(this.pricingService.fromPaise(taxAmountPaise)),
        grandTotal: new Decimal(this.pricingService.fromPaise(grandTotalPaise)),
        distanceKm: deliveryEval.distanceKm !== null ? new Decimal(deliveryEval.distanceKm) : null,
        itemsSnapshot: snapshotItems as unknown as object[],
        idempotencyKey: dto.idempotencyKey?.trim() || null,
        expiresAt,
      },
    });

    try {
      const reservationResult = await this.reservationService.createReservation({
        storeId: cart.sellerId,
        checkoutSessionId: session.id,
        cartId: cart.id,
        ttlMinutes: DEFAULT_RESERVATION_TTL_MINUTES,
        idempotencyKey: dto.idempotencyKey?.trim() || `checkout:${session.id}`,
        items: snapshotItems.map((i) => ({
          listingId: i.sellerProductId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });

      // Sync session expiresAt with exact reservation expiresAt
      const syncedExpiresAt = new Date(reservationResult.expiresAt);
      const updatedSession = await this.prisma.checkoutSession.update({
        where: { id: session.id },
        data: { expiresAt: syncedExpiresAt },
      });

      return this.formatCheckoutResponse(updatedSession, seller);
    } catch (err) {
      // Clean up failed session so no orphaned RESERVATION_ACTIVE record remains
      await this.prisma.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: CheckoutSessionStatus.CANCELLED,
          releasedAt: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Retrieves the customer's active (or most recent) checkout summary.
   */
  async getCheckoutSummary(
    userId: string,
    checkoutSessionId?: string,
  ): Promise<CheckoutSummaryResponse> {
    const session = await this.prisma.checkoutSession.findFirst({
      where: {
        userId,
        ...(checkoutSessionId ? { id: checkoutSessionId } : {}),
        status: {
          in: [CheckoutSessionStatus.RESERVATION_ACTIVE, CheckoutSessionStatus.EXPIRED],
        },
      },
      orderBy: { createdAt: 'desc' },
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
        code: 'NO_ACTIVE_CHECKOUT',
        message: 'No active checkout session found.',
      });
    }

    if (
      session.status === CheckoutSessionStatus.RESERVATION_ACTIVE &&
      session.expiresAt <= new Date()
    ) {
      await this.reservationService.expireSessionReservation(session.id);
      session.status = CheckoutSessionStatus.EXPIRED;
    }

    return this.formatCheckoutResponse(session, session.seller);
  }

  /**
   * Immediately cancels the customer's active checkout session and releases reserved inventory.
   */
  async cancelCheckout(userId: string, dto: CancelCheckoutDto) {
    const activeSessions = await this.prisma.checkoutSession.findMany({
      where: {
        userId,
        ...(dto.checkoutSessionId ? { id: dto.checkoutSessionId } : {}),
        status: CheckoutSessionStatus.RESERVATION_ACTIVE,
      },
    });

    if (activeSessions.length === 0) {
      return {
        cancelled: false,
        releasedCount: 0,
        message: 'No active checkout reservation to cancel.',
      };
    }

    let releasedCount = 0;
    for (const s of activeSessions) {
      await this.reservationService.releaseReservation({
        checkoutSessionId: s.id,
        reason: 'Cancelled by customer',
      });
      await this.prisma.checkoutSession.updateMany({
        where: { id: s.id },
        data: { status: CheckoutSessionStatus.CANCELLED, releasedAt: new Date() },
      });
      releasedCount++;
    }

    this.logger.log(`Cancelled ${releasedCount} checkout session(s) for user ${userId}`);

    return {
      cancelled: true,
      releasedCount,
      message: 'Checkout cancelled and reserved inventory released.',
    };
  }
}
