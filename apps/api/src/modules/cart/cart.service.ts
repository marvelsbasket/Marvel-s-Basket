import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CheckoutSessionStatus, ProductStatus, SellerProductStatus } from '@prisma/client';
import {
  BasketItem,
  BasketStateResponse,
  BasketStoreInfo,
  StoreSwitchComparison,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { InventoryReservationService } from '../inventory/services/inventory-reservation.service';
import { PricingService } from './pricing.service';
import { resolveEffectiveListingPrice } from '../promotions/discount-calculator';
import {
  AddCartItemDto,
  ApplyStoreSwitchDto,
  CompareStoreSwitchDto,
  SwitchStoreDto,
  SyncCartDto,
  UpdateCartItemDto,
} from './dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
    @Optional() private readonly pricingService?: PricingService,
    @Optional() private readonly reservationService?: InventoryReservationService,
  ) {}

  private toPaise(amount: number | string | { toString(): string } | null | undefined): number {
    if (amount === null || amount === undefined) return 0;
    const num = typeof amount === 'number' ? amount : Number(amount.toString());
    return Number.isFinite(num) ? Math.round(num * 100) : 0;
  }

  private fromPaise(paise: number): number {
    return Math.round(paise) / 100;
  }

  private async releaseActiveCheckoutReservations(userId: string): Promise<void> {
    if (!this.reservationService || !this.prisma.checkoutSession) return;
    try {
      const activeSessions = await this.prisma.checkoutSession.findMany({
        where: {
          userId,
          status: CheckoutSessionStatus.RESERVATION_ACTIVE,
        },
        select: { id: true },
      });
      for (const s of activeSessions) {
        await this.reservationService.releaseReservation({
          checkoutSessionId: s.id,
          reason: 'Basket modified or store switched',
        });
      }
    } catch {
      // Non-fatal if no active session exists
    }
  }

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  /**
   * Retrieves the authenticated customer's basket with live store status, prices, and stock.
   */
  async getCart(userId: string): Promise<BasketStateResponse> {
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
                product: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
                variant: true,
                inventory: true,
                discounts: {
                  where: { status: { in: ['ACTIVE', 'SCHEDULED'] } },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      if (cart && (cart.sellerId || cart.appliedCouponCode)) {
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { sellerId: null, appliedCouponCode: null },
        });
      }
      return {
        cartId: cart?.id || null,
        sellerId: null,
        store: null,
        items: [],
        itemCount: 0,
        totalUnits: 0,
        subtotal: 0,
        totalMrp: 0,
        totalSavings: 0,
        hasUnavailableItems: false,
        appliedCouponCode: null,
        couponDiscount: 0,
        couponMessage: null,
        minimumOrderValue: null,
        movRemaining: 0,
        belowMov: false,
        deliveryFee: 0,
        freeDeliveryThreshold: null,
        estimatedTotal: 0,
      };
    }

    let storeInfo: BasketStoreInfo | null = null;
    if (cart.seller) {
      const op = this.storesService.evaluateStoreOperationalStatus(cart.seller);
      const eta = this.storesService.computeDeliveryEstimate(
        cart.seller.profile?.preparationTime,
        null,
        op.isOpen,
        op.isAcceptingOrders,
      );
      storeInfo = {
        id: cart.seller.id,
        name: cart.seller.storeDisplayName || cart.seller.businessName,
        slug: cart.seller.slug,
        deliveryTimeMinutes: eta.deliveryTimeMinutes,
        isOpen: op.isOpen,
        isAcceptingOrders: op.isAcceptingOrders,
        operationalStatusLabel: op.operationalStatusLabel,
      };
    }

    let subtotalPaise = 0;
    let totalMrpPaise = 0;
    let totalUnits = 0;
    let hasUnavailableItems = false;

    const mappedItems: BasketItem[] = cart.items.map((ci) => {
      const sp = ci.sellerProduct;
      const product = sp.product;
      const variant = sp.variant;
      const availableQuantity = sp.inventory?.availableQuantity ?? 0;

      const resolvedPrice = resolveEffectiveListingPrice({
        baseSellingPrice: sp.sellingPrice,
        mrp: variant?.mrp ?? sp.mrp ?? sp.sellingPrice,
        discounts: sp.discounts,
      });
      const unitPricePaise = this.toPaise(resolvedPrice.effectiveSellingPrice);
      const mrpPaise = this.toPaise(resolvedPrice.mrp);
      const unitPrice = this.fromPaise(unitPricePaise);
      const mrp = this.fromPaise(mrpPaise);
      const priceExceedsMrp = mrpPaise > 0 && unitPricePaise > mrpPaise;

      const isActive =
        !sp.deletedAt &&
        sp.status === SellerProductStatus.ACTIVE &&
        !product.deletedAt &&
        product.status === ProductStatus.ACTIVE &&
        (variant ? variant.isActive : true) &&
        !priceExceedsMrp &&
        Boolean(storeInfo?.isOpen && storeInfo?.isAcceptingOrders);

      const isAvailable = isActive && availableQuantity >= ci.quantity && availableQuantity > 0;
      if (!isAvailable) {
        hasUnavailableItems = true;
      }

      const discountPercent =
        mrpPaise > unitPricePaise && mrpPaise > 0
          ? Math.round(((mrpPaise - unitPricePaise) / mrpPaise) * 100)
          : 0;

      let statusMessage: string | undefined;
      if (!storeInfo?.isAcceptingOrders || !storeInfo?.isOpen) {
        statusMessage = `${storeInfo?.name || 'Store'} is currently ${
          storeInfo?.operationalStatusLabel?.toLowerCase() || 'unavailable'
        }`;
      } else if (priceExceedsMrp) {
        statusMessage = 'Listing price exceeds MRP and is temporarily unavailable';
      } else if (!isActive) {
        statusMessage = 'No longer available from this store';
      } else if (availableQuantity <= 0) {
        statusMessage = 'Out of stock';
      } else if (availableQuantity < ci.quantity) {
        statusMessage = `Only ${availableQuantity} available in stock`;
      }

      const effectiveQty = isActive ? Math.min(ci.quantity, Math.max(0, availableQuantity)) : 0;
      subtotalPaise += unitPricePaise * effectiveQty;
      totalMrpPaise += mrpPaise * effectiveQty;
      totalUnits += ci.quantity;

      return {
        id: ci.id,
        sellerProductId: sp.id,
        productId: sp.productId,
        variantId: sp.variantId || '',
        productName: product.name,
        productSlug: product.slug,
        brand: product.brand || null,
        packSize: variant?.packSize || variant?.name || null,
        imageUrl: variant?.primaryImageUrl || product.images[0]?.imageUrl || null,
        quantity: ci.quantity,
        unitPrice,
        mrp,
        discountPercent,
        availableQuantity,
        isAvailable,
        statusMessage,
      };
    });

    const subtotal = this.fromPaise(subtotalPaise);
    const totalMrp = this.fromPaise(totalMrpPaise);
    const totalSavings = this.fromPaise(Math.max(0, totalMrpPaise - subtotalPaise));

    let minimumOrderValue: number | null = null;
    let movRemaining = 0;
    let belowMov = false;
    let deliveryFee = 0;
    let freeDeliveryThreshold: number | null = null;
    let couponDiscountPaise = 0;
    let couponMessage: string | null = null;
    let appliedCouponCode = cart.appliedCouponCode || null;

    if (this.pricingService) {
      const config = await this.pricingService.getPlatformPricingConfig();
      if (config.minimumOrderValuePaise !== null) {
        minimumOrderValue = this.fromPaise(config.minimumOrderValuePaise);
        if (subtotalPaise < config.minimumOrderValuePaise) {
          belowMov = true;
          movRemaining = this.fromPaise(config.minimumOrderValuePaise - subtotalPaise);
        }
      }
      if (config.freeDeliveryThresholdPaise !== null) {
        freeDeliveryThreshold = this.fromPaise(config.freeDeliveryThresholdPaise);
      }
      const deliveryFeePaise =
        config.freeDeliveryThresholdPaise !== null &&
        subtotalPaise >= config.freeDeliveryThresholdPaise
          ? 0
          : config.defaultDeliveryFeePaise;
      deliveryFee = this.fromPaise(deliveryFeePaise);

      if (appliedCouponCode) {
        try {
          const couponEval = await this.pricingService.validateCoupon({
            code: appliedCouponCode,
            userId,
            itemSubtotalPaise: subtotalPaise,
          });
          couponDiscountPaise = couponEval.discountPaise;
          couponMessage = couponEval.description || `Coupon ${couponEval.code} applied`;
        } catch (err) {
          couponMessage =
            err instanceof BadRequestException
              ? (err.getResponse() as { message?: string })?.message || err.message
              : 'Coupon is no longer valid for this basket';
          appliedCouponCode = null;
        }
      }
    }

    const deliveryFeePaise = this.toPaise(deliveryFee);
    const estimatedTotalPaise = Math.max(0, subtotalPaise - couponDiscountPaise + deliveryFeePaise);

    return {
      cartId: cart.id,
      sellerId: cart.sellerId,
      store: {
        ...storeInfo!,
        minimumOrderValue,
      },
      items: mappedItems,
      itemCount: mappedItems.length,
      totalUnits,
      subtotal,
      totalMrp,
      totalSavings,
      hasUnavailableItems,
      appliedCouponCode,
      couponDiscount: this.fromPaise(couponDiscountPaise),
      couponMessage,
      minimumOrderValue,
      movRemaining,
      belowMov,
      deliveryFee,
      freeDeliveryThreshold,
      estimatedTotal: this.fromPaise(estimatedTotalPaise),
    };
  }

  /**
   * Adds or increments an item in the customer's basket.
   * Does NOT reserve inventory. Enforces single-store rule.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<BasketStateResponse> {
    const listing = await this.prisma.sellerProduct.findUnique({
      where: { id: dto.sellerProductId },
      include: {
        seller: {
          include: {
            profile: true,
            businessHours: { orderBy: { dayOfWeek: 'asc' } },
          },
        },
        product: true,
        variant: true,
        inventory: true,
      },
    });

    if (
      !listing ||
      listing.deletedAt ||
      listing.status !== SellerProductStatus.ACTIVE ||
      listing.product.deletedAt ||
      listing.product.status !== ProductStatus.ACTIVE ||
      (listing.variant && !listing.variant.isActive)
    ) {
      throw new NotFoundException({
        code: 'LISTING_UNAVAILABLE',
        message: 'This product listing is no longer active.',
      });
    }

    const listingMrpPaise = this.toPaise(
      listing.variant?.mrp ?? listing.mrp ?? listing.sellingPrice,
    );
    const listingPricePaise = this.toPaise(listing.sellingPrice);
    if (listingMrpPaise > 0 && listingPricePaise > listingMrpPaise) {
      throw new ConflictException({
        code: 'PRICE_EXCEEDS_MRP',
        message: `"${listing.product.name}" cannot be added because its listing price exceeds MRP.`,
      });
    }

    const op = this.storesService.evaluateStoreOperationalStatus(listing.seller);
    if (!op.isApproved || !op.isOpen || !op.isAcceptingOrders) {
      throw new BadRequestException({
        code: 'STORE_NOT_ACCEPTING_ORDERS',
        message: `${
          listing.seller.storeDisplayName || listing.seller.businessName
        } is currently ${op.operationalStatusLabel.toLowerCase()} and not accepting orders.`,
      });
    }

    if (this.pricingService) {
      const config = await this.pricingService.getPlatformPricingConfig();
      if (dto.quantity > config.maxCartItemQuantity) {
        throw new BadRequestException({
          code: 'MAX_QUANTITY_EXCEEDED',
          message: `Maximum ${config.maxCartItemQuantity} units allowed per item.`,
        });
      }
    }

    const availableQty = listing.inventory?.availableQuantity ?? 0;
    if (availableQty <= 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        availableQuantity: 0,
        message: `"${listing.product.name}" is currently out of stock.`,
      });
    }

    const cart = await this.getOrCreateCart(userId);

    // Check single-store cart boundary
    if (cart.sellerId && cart.sellerId !== listing.sellerId) {
      const existingItemsCount = await this.prisma.cartItem.count({
        where: { cartId: cart.id },
      });

      if (existingItemsCount > 0 && !dto.confirmStoreSwitch) {
        const currentSeller = await this.prisma.seller.findUnique({
          where: { id: cart.sellerId },
          include: { profile: true },
        });
        throw new ConflictException({
          code: 'STORE_SWITCH_REQUIRED',
          message: `Your basket contains items from ${
            currentSeller?.storeDisplayName || currentSeller?.businessName || 'another store'
          }. Confirm to replace your basket with items from ${
            listing.seller.storeDisplayName || listing.seller.businessName
          }.`,
          data: {
            currentStore: {
              id: cart.sellerId,
              name: currentSeller?.storeDisplayName || currentSeller?.businessName || 'Store',
              slug: currentSeller?.slug || '',
            },
            targetStore: {
              id: listing.seller.id,
              name: listing.seller.storeDisplayName || listing.seller.businessName,
              slug: listing.seller.slug,
            },
          },
        });
      }

      // Confirmed store switch: clear old cart items and switch sellerId
      if (dto.quantity > availableQty) {
        throw new ConflictException({
          code: 'INSUFFICIENT_STOCK',
          availableQuantity: availableQty,
          message: `Only ${availableQty} units available in stock.`,
        });
      }

      await this.releaseActiveCheckoutReservations(userId);

      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { sellerId: listing.sellerId, appliedCouponCode: null },
        });
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            sellerProductId: listing.id,
            quantity: dto.quantity,
          },
        });
      });

      return this.getCart(userId);
    }

    // Same store or empty cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_sellerProductId: {
          cartId: cart.id,
          sellerProductId: listing.id,
        },
      },
    });

    const targetQty = (existingItem?.quantity ?? 0) + dto.quantity;
    if (targetQty > availableQty) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        availableQuantity: availableQty,
        message: `Only ${availableQty} units of "${listing.product.name}" are available.`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (!cart.sellerId) {
        await tx.cart.update({
          where: { id: cart.id },
          data: { sellerId: listing.sellerId },
        });
      }

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: targetQty },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            sellerProductId: listing.id,
            quantity: targetQty,
          },
        });
      }
    });

    return this.getCart(userId);
  }

  /**
   * Updates quantity for a cart item (by sellerProductId or CartItem.id).
   * Setting quantity = 0 deletes the item and resets cart.sellerId if empty.
   */
  async updateItemQuantity(
    userId: string,
    itemIdentifier: string,
    dto: UpdateCartItemDto,
  ): Promise<BasketStateResponse> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundException('Basket not found');
    }

    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ sellerProductId: itemIdentifier }, { id: itemIdentifier }],
      },
      include: {
        sellerProduct: {
          include: { inventory: true, product: true },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in basket');
    }

    if (dto.quantity <= 0) {
      return this.removeItem(userId, itemIdentifier);
    }

    const availableQty = cartItem.sellerProduct.inventory?.availableQuantity ?? 0;
    if (dto.quantity > availableQty) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        availableQuantity: availableQty,
        message:
          availableQty > 0
            ? `Only ${availableQty} units available for "${cartItem.sellerProduct.product.name}".`
            : `"${cartItem.sellerProduct.product.name}" is currently out of stock.`,
      });
    }

    await this.releaseActiveCheckoutReservations(userId);
    await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemIdentifier: string): Promise<BasketStateResponse> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      return this.getCart(userId);
    }

    await this.releaseActiveCheckoutReservations(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          OR: [{ sellerProductId: itemIdentifier }, { id: itemIdentifier }],
        },
      });
      const remaining = await tx.cartItem.count({ where: { cartId: cart.id } });
      if (remaining === 0) {
        await tx.cart.update({
          where: { id: cart.id },
          data: { sellerId: null, appliedCouponCode: null },
        });
      }
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<BasketStateResponse> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.releaseActiveCheckoutReservations(userId);
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({
          where: { id: cart.id },
          data: { sellerId: null, appliedCouponCode: null },
        });
      });
    }
    return this.getCart(userId);
  }

  /**
   * Public comparison endpoint: compares a basket's items against a candidate location/store
   * so customers see exact price deltas and unavailable items BEFORE confirming a location/store switch.
   */
  async compareStoreSwitch(dto: CompareStoreSwitchDto): Promise<StoreSwitchComparison> {
    let targetStore = null;

    if (dto.targetStoreId) {
      try {
        targetStore = await this.storesService.getPublicStoreBySlug(dto.targetStoreId, {
          latitude: dto.latitude,
          longitude: dto.longitude,
        });
      } catch {
        targetStore = null;
      }
    } else if (dto.postalCode || (dto.latitude !== undefined && dto.longitude !== undefined)) {
      const nearby = await this.storesService.findNearbyStores({
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
      });
      targetStore = nearby[0] || null;
    }

    let currentStoreInfo: BasketStoreInfo = {
      id: dto.currentStoreId || '',
      name: 'Current Store',
      slug: '',
    };
    if (dto.currentStoreId) {
      const existingSeller = await this.prisma.seller.findUnique({
        where: { id: dto.currentStoreId },
      });
      if (existingSeller) {
        currentStoreInfo = {
          id: existingSeller.id,
          name: existingSeller.storeDisplayName || existingSeller.businessName,
          slug: existingSeller.slug,
        };
      }
    }

    if (!targetStore || !targetStore.isAcceptingOrders || !targetStore.isOpen) {
      return {
        newStore: targetStore,
        currentStore: currentStoreInfo,
        isServiceable: false,
        compatibleItems: [],
        unavailableItems: dto.items.map((item) => ({
          item: {
            sellerProductId: item.sellerProductId || '',
            productId: item.productId || '',
            variantId: item.variantId,
            productName: item.productName || 'Product',
            productSlug: '',
            brand: null,
            packSize: item.packSize || null,
            imageUrl: null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            mrp: item.unitPrice,
            discountPercent: 0,
            availableQuantity: 0,
            isAvailable: false,
          },
          reason: !targetStore
            ? 'No serviceable store available at the new location'
            : `${targetStore.name} is currently ${targetStore.operationalStatusLabel.toLowerCase()}`,
        })),
        priceChangesCount: 0,
        unavailableCount: dto.items.length,
      };
    }

    const compatibleItems: StoreSwitchComparison['compatibleItems'] = [];
    const unavailableItems: StoreSwitchComparison['unavailableItems'] = [];
    let priceChangesCount = 0;

    for (const item of dto.items) {
      const targetListing = await this.prisma.sellerProduct.findFirst({
        where: {
          sellerId: targetStore.id,
          variantId: item.variantId,
          status: SellerProductStatus.ACTIVE,
          deletedAt: null,
          product: { status: ProductStatus.ACTIVE, deletedAt: null },
          variant: { isActive: true },
        },
        include: {
          product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
          variant: true,
          inventory: true,
        },
      });

      const baseItem: BasketItem = {
        sellerProductId: item.sellerProductId || '',
        productId: item.productId || targetListing?.productId || '',
        variantId: item.variantId,
        productName: item.productName || targetListing?.product.name || 'Product',
        productSlug: targetListing?.product.slug || '',
        brand: targetListing?.product.brand || null,
        packSize: item.packSize || targetListing?.variant?.packSize || null,
        imageUrl:
          targetListing?.variant?.primaryImageUrl ||
          targetListing?.product.images[0]?.imageUrl ||
          null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp: Number(targetListing?.variant?.mrp ?? item.unitPrice),
        discountPercent: 0,
        availableQuantity: targetListing?.inventory?.availableQuantity ?? 0,
        isAvailable: false,
      };

      const avail = targetListing?.inventory?.availableQuantity ?? 0;
      if (!targetListing || avail <= 0) {
        unavailableItems.push({
          item: baseItem,
          reason: !targetListing
            ? `Not carried by ${targetStore.name}`
            : `Out of stock at ${targetStore.name}`,
        });
        continue;
      }

      const newUnitPrice = Number(targetListing.sellingPrice);
      const newMrp = Number(targetListing.variant?.mrp ?? newUnitPrice);
      const priceChanged = Math.abs(newUnitPrice - item.unitPrice) >= 0.01;
      const quantityAdjusted = Math.min(item.quantity, avail);

      if (priceChanged) priceChangesCount++;

      compatibleItems.push({
        item: baseItem,
        newSellerProductId: targetListing.id,
        newUnitPrice,
        newMrp,
        newAvailableQuantity: avail,
        priceChanged,
        quantityAdjusted,
      });
    }

    return {
      newStore: targetStore,
      currentStore: currentStoreInfo,
      isServiceable: true,
      compatibleItems,
      unavailableItems,
      priceChangesCount,
      unavailableCount: unavailableItems.length,
    };
  }

  /**
   * Executes a confirmed location/store switch on an authenticated customer's basket.
   * Retains only items listed and in-stock at the target store; drops unavailable items.
   */
  async applyStoreSwitch(userId: string, dto: ApplyStoreSwitchDto): Promise<BasketStateResponse> {
    if (!dto.targetStoreId) {
      return this.clearCart(userId);
    }

    const currentCart = await this.getCart(userId);
    if (!currentCart.cartId || currentCart.items.length === 0) {
      return currentCart;
    }

    const comparison = await this.compareStoreSwitch({
      targetStoreId: dto.targetStoreId,
      currentStoreId: currentCart.sellerId || undefined,
      items: currentCart.items.map((i) => ({
        sellerProductId: i.sellerProductId,
        variantId: i.variantId,
        productId: i.productId,
        productName: i.productName,
        packSize: i.packSize || undefined,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId: currentCart.cartId! } });

      if (
        !comparison.isServiceable ||
        !comparison.newStore ||
        comparison.compatibleItems.length === 0
      ) {
        await tx.cart.update({
          where: { id: currentCart.cartId! },
          data: { sellerId: null },
        });
        return;
      }

      await tx.cart.update({
        where: { id: currentCart.cartId! },
        data: { sellerId: comparison.newStore.id },
      });

      for (const comp of comparison.compatibleItems) {
        if (comp.quantityAdjusted > 0) {
          await tx.cartItem.create({
            data: {
              cartId: currentCart.cartId!,
              sellerProductId: comp.newSellerProductId,
              quantity: comp.quantityAdjusted,
            },
          });
        }
      }
    });

    return this.getCart(userId);
  }

  /**
   * Merges guest localStorage basket items into authenticated customer's DB cart.
   */
  async syncGuestCart(userId: string, dto: SyncCartDto): Promise<BasketStateResponse> {
    if (!dto.items || dto.items.length === 0) {
      return this.getCart(userId);
    }

    const current = await this.getCart(userId);
    // Only auto-merge if DB cart is currently empty (to avoid silently overriding an existing store cart)
    if (current.items.length > 0) {
      return current;
    }

    for (const item of dto.items) {
      try {
        await this.addItem(userId, {
          sellerProductId: item.sellerProductId,
          quantity: item.quantity,
          confirmStoreSwitch: false,
        });
      } catch {
        // Skip invalid, out-of-stock, or conflicting items during guest sync
      }
    }

    return this.getCart(userId);
  }

  /**
   * Confirms switching the cart to a new store by clearing the old cart,
   * releasing any active checkout reservations, binding to the new store, and adding the item.
   */
  async switchStore(userId: string, dto: SwitchStoreDto): Promise<BasketStateResponse> {
    return this.addItem(userId, {
      sellerProductId: dto.sellerProductId,
      quantity: dto.quantity,
      confirmStoreSwitch: true,
    });
  }

  /**
   * Revalidates the authenticated customer's active cart against live store status,
   * listing availability, MRP, and stock.
   */
  async validateCart(userId: string) {
    const cart = await this.getCart(userId);
    if (!cart.sellerId || cart.items.length === 0) {
      return {
        isOrderable: false,
        hasPriceChanges: false,
        hasQuantityAdjustments: false,
        items: [],
        cart,
      };
    }

    if (!this.reservationService) {
      return {
        isOrderable: !cart.hasUnavailableItems,
        hasPriceChanges: false,
        hasQuantityAdjustments: Boolean(cart.hasUnavailableItems),
        items: cart.items,
        cart,
      };
    }

    const revalidation = await this.reservationService.revalidateCart({
      storeId: cart.sellerId,
      items: cart.items.map((item) => ({
        listingId: item.sellerProductId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    return {
      ...revalidation,
      cart,
    };
  }

  /**
   * Validates and applies a platform coupon to the authenticated customer's cart.
   */
  async applyCoupon(userId: string, code: string): Promise<BasketStateResponse> {
    if (!this.pricingService) {
      throw new BadRequestException('Pricing service unavailable');
    }

    const cart = await this.getCart(userId);
    if (!cart.cartId || cart.items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_BASKET',
        message: 'Add items to your basket before applying a coupon.',
      });
    }

    const subtotalPaise = this.toPaise(cart.subtotal);
    const evaluation = await this.pricingService.validateCoupon({
      code,
      userId,
      itemSubtotalPaise: subtotalPaise,
    });

    await this.prisma.cart.update({
      where: { id: cart.cartId },
      data: { appliedCouponCode: evaluation.code },
    });

    return this.getCart(userId);
  }

  /**
   * Removes any applied coupon from the authenticated customer's cart.
   */
  async removeCoupon(userId: string): Promise<BasketStateResponse> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart && cart.appliedCouponCode) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { appliedCouponCode: null },
      });
    }
    return this.getCart(userId);
  }
}
