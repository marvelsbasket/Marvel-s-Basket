import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CommitReservationDto,
  CreateStockReservationDto,
  PickerShortageWriteOffDto,
  ReleaseReservationDto,
  RevalidateCartDto,
} from '../dto';
import {
  InventoryTransactionType,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
  StockReservationStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Revalidates customer basket items against current store prices and available stock.
   * Does NOT lock or reserve stock. Returns detailed availability and price delta flags.
   */
  async revalidateCart(dto: RevalidateCartDto) {
    const store = await this.prisma.seller.findUnique({
      where: { id: dto.storeId },
      include: { profile: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${dto.storeId} not found`);
    }

    const isStoreApproved =
      store.status === SellerStatus.APPROVED_ACTIVE || (store.status as any) === 'APPROVED';
    const isStoreAcceptingOrders = isStoreApproved; // Can extend with business hours check

    const results = [];
    let hasPriceChanges = false;
    let hasQuantityAdjustments = false;
    let isOrderable = isStoreApproved && isStoreAcceptingOrders;

    for (const item of dto.items) {
      // Find listing by variantId or listingId
      const listing = await this.prisma.sellerProduct.findFirst({
        where: {
          sellerId: dto.storeId,
          ...(item.listingId ? { id: item.listingId } : { variantId: item.variantId }),
          deletedAt: null,
        },
        include: {
          product: { select: { name: true, status: true } },
          variant: { select: { name: true, packSize: true, isActive: true, mrp: true } },
          inventory: true,
        },
      });

      if (!listing || !listing.inventory) {
        results.push({
          variantId: item.variantId,
          listingId: item.listingId || '',
          productName: 'Unavailable Item',
          packSize: null,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          adjustedQuantity: 0,
          originalUnitPrice: item.unitPrice,
          currentUnitPrice: 0,
          priceChanged: false,
          isAvailable: false,
          status: 'UNAVAILABLE',
          message: 'Product is no longer listed in this store',
        });
        hasQuantityAdjustments = true;
        isOrderable = false;
        continue;
      }

      // Eagerly expire any outdated reservations for this inventory before checking stock
      await this.expireOutdatedReservationsForItem(listing.inventory.id);

      // Re-fetch fresh inventory after lazy expiration
      const freshInv = await this.prisma.inventory.findUnique({
        where: { id: listing.inventory.id },
      });

      const currentAvailable = freshInv?.availableQuantity ?? 0;
      const currentUnitPrice = Number(listing.sellingPrice);
      const isPriceDifferent = Math.abs(currentUnitPrice - item.unitPrice) >= 0.01;
      const isProductActive =
        listing.product.status === ProductStatus.ACTIVE &&
        listing.variant?.isActive === true &&
        listing.status === SellerProductStatus.ACTIVE;

      const isStockSufficient = currentAvailable >= item.quantity;
      const adjustedQuantity = isProductActive
        ? Math.min(item.quantity, Math.max(0, currentAvailable))
        : 0;
      const itemAvailable = isProductActive && isStockSufficient && adjustedQuantity > 0;

      if (isPriceDifferent) hasPriceChanges = true;
      if (adjustedQuantity !== item.quantity) hasQuantityAdjustments = true;
      if (!itemAvailable) isOrderable = false;

      let message: string | undefined;
      if (!isProductActive) {
        message = 'Product is currently inactive or discontinued';
      } else if (!isStockSufficient) {
        message =
          currentAvailable > 0
            ? `Only ${currentAvailable} left in stock — your basket has been updated.`
            : 'Item is currently out of stock';
      }

      results.push({
        variantId: item.variantId,
        listingId: listing.id,
        productName: listing.product.name,
        packSize: listing.variant?.packSize,
        requestedQuantity: item.quantity,
        availableQuantity: currentAvailable,
        adjustedQuantity,
        originalUnitPrice: item.unitPrice,
        currentUnitPrice,
        priceChanged: isPriceDifferent,
        isAvailable: itemAvailable,
        status: listing.status,
        message,
      });
    }

    return {
      storeId: dto.storeId,
      storeName: store.businessName || store.storeDisplayName || 'Store',
      isStoreAcceptingOrders,
      isStoreServiceable: isStoreApproved,
      items: results,
      hasPriceChanges,
      hasQuantityAdjustments,
      isOrderable,
      revalidationTimestamp: new Date().toISOString(),
    };
  }

  /**
   * ATOMIC STOCK RESERVATION ENGINE (Section 8 & 10)
   *
   * Features:
   * 1. Idempotency Check: Returns existing reservation if previously executed with same key.
   * 2. Deadlock Elimination: Sorts all target inventory IDs in ascending order.
   * 3. Concurrency Protection: Uses parameterized conditional UPDATE with row count check:
   *    UPDATE inventories SET reserved_quantity = reserved_quantity + $1, available_quantity = available_quantity - $1
   *    WHERE id = $2 AND (stock_on_hand - reserved_quantity) >= $1
   * 4. Multi-item Atomic Transaction: Succeeds completely or rolls back entirely without partial deductions.
   */
  async createReservation(dto: CreateStockReservationDto) {
    const ttlMinutes = dto.ttlMinutes || 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // 1. Check Idempotency Key
    if (dto.idempotencyKey?.trim()) {
      const existingReservations = await this.prisma.stockReservation.findMany({
        where: {
          idempotencyKey: dto.idempotencyKey.trim(),
          status: StockReservationStatus.ACTIVE,
        },
        include: { inventory: { include: { sellerProduct: true } } },
      });

      if (existingReservations.length > 0) {
        this.logger.log(`Idempotent reservation retrieved for key: ${dto.idempotencyKey}`);
        return {
          reservationId: existingReservations[0].id,
          checkoutSessionId: dto.checkoutSessionId,
          status: StockReservationStatus.ACTIVE,
          expiresAt: existingReservations[0].expiresAt.toISOString(),
          items: existingReservations.map((r) => ({
            inventoryId: r.inventoryId,
            listingId: r.inventory.sellerProductId,
            variantId: r.inventory.sellerProduct.variantId || '',
            quantity: r.quantity,
            unitPrice: Number(r.unitPrice || r.inventory.sellerProduct.sellingPrice),
          })),
        };
      }
    }

    // 2. Validate Store Status
    const store = await this.prisma.seller.findUnique({
      where: { id: dto.storeId },
    });

    if (
      !store ||
      (store.status !== SellerStatus.APPROVED_ACTIVE && (store.status as any) !== 'APPROVED')
    ) {
      throw new BadRequestException('Selected store is not currently eligible to accept orders');
    }

    // 3. Resolve all listings and their inventory IDs
    const resolvedItems: Array<{
      listingId: string;
      inventoryId: string;
      variantId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of dto.items) {
      const listing = await this.prisma.sellerProduct.findFirst({
        where: {
          sellerId: dto.storeId,
          ...(item.listingId ? { id: item.listingId } : { variantId: item.variantId }),
          deletedAt: null,
        },
        include: {
          product: { select: { name: true, status: true } },
          variant: { select: { name: true, isActive: true } },
          inventory: true,
        },
      });

      if (!listing || !listing.inventory) {
        throw new NotFoundException(
          `Listing not found in store for variant ${item.variantId || item.listingId}`,
        );
      }

      if (
        listing.product.status !== ProductStatus.ACTIVE ||
        listing.variant?.isActive === false ||
        listing.status === SellerProductStatus.PAUSED ||
        listing.status === SellerProductStatus.DISABLED
      ) {
        throw new BadRequestException(
          `Product "${listing.product.name}" is not currently available for purchase`,
        );
      }

      if (listing.status === SellerProductStatus.OUT_OF_STOCK) {
        throw new ConflictException({
          message: `Insufficient stock for product "${listing.product.name}". Requested: ${item.quantity}. The item is currently out of stock.`,
          code: 'INSUFFICIENT_STOCK',
          productName: listing.product.name,
          inventoryId: listing.inventory.id,
        });
      }

      resolvedItems.push({
        listingId: listing.id,
        inventoryId: listing.inventory.id,
        variantId: listing.variantId || '',
        productName: listing.product.name,
        quantity: item.quantity,
        unitPrice: Number(listing.sellingPrice),
      });
    }

    // 4. DEADLOCK PREVENTION (Section 8.B): Sort inventory IDs in consistent ascending alphabetical order
    resolvedItems.sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));

    // 5. Execute Atomic Database Transaction with Parameterized Conditional Update
    return this.prisma.$transaction(async (tx) => {
      const createdReservations = [];

      for (const item of resolvedItems) {
        // Eagerly expire any existing outdated reservations on this item
        await tx.$executeRaw`
          UPDATE "stock_reservations"
          SET "status" = 'EXPIRED'
          WHERE "inventory_id" = ${item.inventoryId}::uuid
            AND "status" = 'ACTIVE'
            AND "expires_at" <= NOW()
        `;

        // ATOMIC CONDITIONAL UPDATE (Section 8.A)
        // Only increments reserved_quantity if (stock_on_hand - reserved_quantity) >= quantity
        const updateResult: Array<{
          id: string;
          stock_on_hand: number;
          reserved_quantity: number;
          available_quantity: number;
        }> = await tx.$queryRaw`
          UPDATE "inventories"
          SET "reserved_quantity" = "reserved_quantity" + ${item.quantity},
              "available_quantity" = "available_quantity" - ${item.quantity},
              "updated_at" = NOW()
          WHERE "id" = ${item.inventoryId}::uuid
            AND ("stock_on_hand" - "reserved_quantity") >= ${item.quantity}
          RETURNING "id", "stock_on_hand", "reserved_quantity", "available_quantity"
        `;

        // If zero rows updated, another concurrent customer took the remaining stock
        if (!updateResult || updateResult.length === 0) {
          throw new ConflictException({
            message: `Insufficient stock for product "${item.productName}". Requested: ${item.quantity}. Another customer may have just reserved this item.`,
            code: 'INSUFFICIENT_STOCK',
            productName: item.productName,
            inventoryId: item.inventoryId,
          });
        }

        const invState = updateResult[0];

        // Create reservation record
        const reservation = await tx.stockReservation.create({
          data: {
            inventoryId: item.inventoryId,
            checkoutSessionId: dto.checkoutSessionId,
            cartId: dto.cartId,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            status: StockReservationStatus.ACTIVE,
            expiresAt,
            idempotencyKey: dto.idempotencyKey?.trim(),
          },
        });

        // If available quantity reached 0, mark listing OUT_OF_STOCK
        if (invState.available_quantity === 0) {
          await tx.sellerProduct.update({
            where: { id: item.listingId },
            data: { status: SellerProductStatus.OUT_OF_STOCK },
          });
        }

        createdReservations.push(reservation);
      }

      return {
        reservationId: createdReservations[0]?.id,
        checkoutSessionId: dto.checkoutSessionId,
        status: StockReservationStatus.ACTIVE,
        expiresAt: expiresAt.toISOString(),
        items: resolvedItems.map((item) => ({
          inventoryId: item.inventoryId,
          listingId: item.listingId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
    });
  }

  /**
   * COMMIT RESERVATION (Payment Successful)
   * Decreases stock on hand and reserved stock atomically, transitions reservation to COMMITTED,
   * and creates ORDER_COMMITTED audit ledger entries.
   */
  async commitReservation(dto: CommitReservationDto) {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { checkoutSessionId: dto.checkoutSessionId },
      include: { inventory: { include: { sellerProduct: true } } },
    });

    if (reservations.length === 0) {
      throw new NotFoundException(
        `No reservations found for checkout session ${dto.checkoutSessionId}`,
      );
    }

    // Idempotency: If already committed, return success immediately
    const allCommitted = reservations.every((r) => r.status === StockReservationStatus.COMMITTED);
    if (allCommitted) {
      this.logger.log(`Idempotent commit for checkout session ${dto.checkoutSessionId}`);
      return {
        checkoutSessionId: dto.checkoutSessionId,
        status: StockReservationStatus.COMMITTED,
        message: 'Reservation already committed (idempotent)',
      };
    }

    // Verify all reservations are currently ACTIVE
    for (const r of reservations) {
      if (r.status === StockReservationStatus.EXPIRED) {
        throw new BadRequestException(
          `Reservation for checkout session ${dto.checkoutSessionId} has expired. Cannot commit an expired reservation. Please check stock and initiate refund if paid.`,
        );
      }
      if (r.status === StockReservationStatus.RELEASED) {
        throw new BadRequestException(
          `Reservation for checkout session ${dto.checkoutSessionId} has already been released.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const r of reservations) {
        const inv = r.inventory;
        const currentStockOnHand = inv.stockOnHand;
        const newStockOnHand = Math.max(0, currentStockOnHand - r.quantity);
        const newReserved = Math.max(0, inv.reservedQuantity - r.quantity);

        // Update inventory: decrease stock on hand and reserved quantity
        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            stockOnHand: newStockOnHand,
            reservedQuantity: newReserved,
            availableQuantity: newStockOnHand - newReserved,
          },
        });

        // Mark reservation as COMMITTED
        await tx.stockReservation.update({
          where: { id: r.id },
          data: {
            status: StockReservationStatus.COMMITTED,
            committedAt: new Date(),
            orderItemId: dto.orderId,
          },
        });

        // Append ORDER_COMMITTED to audit ledger
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            type: InventoryTransactionType.ORDER_COMMITTED,
            quantity: -r.quantity,
            stockBefore: currentStockOnHand,
            stockAfter: newStockOnHand,
            referenceType: 'ORDER',
            referenceId: dto.orderId || dto.checkoutSessionId,
            note: `Stock committed for order checkout session ${dto.checkoutSessionId}`,
            idempotencyKey: dto.idempotencyKey ? `${dto.idempotencyKey}:${r.id}` : undefined,
          },
        });
      }

      return {
        checkoutSessionId: dto.checkoutSessionId,
        status: StockReservationStatus.COMMITTED,
        committedCount: reservations.length,
      };
    });
  }

  /**
   * RELEASE RESERVATION (Payment Failed, Cancelled, or Abandoned)
   * Decreases reserved stock and restores available stock.
   */
  async releaseReservation(dto: ReleaseReservationDto) {
    const reservations = await this.prisma.stockReservation.findMany({
      where: {
        checkoutSessionId: dto.checkoutSessionId,
        status: StockReservationStatus.ACTIVE,
      },
      include: { inventory: { include: { sellerProduct: true } } },
    });

    if (reservations.length === 0) {
      // Check if already released
      const releasedCount = await this.prisma.stockReservation.count({
        where: {
          checkoutSessionId: dto.checkoutSessionId,
          status: StockReservationStatus.RELEASED,
        },
      });
      if (releasedCount > 0) {
        return {
          checkoutSessionId: dto.checkoutSessionId,
          status: StockReservationStatus.RELEASED,
          message: 'Reservation already released (idempotent)',
        };
      }
      return {
        checkoutSessionId: dto.checkoutSessionId,
        status: 'NONE',
        message: 'No active reservations found to release',
      };
    }

    return this.prisma.$transaction(async (tx) => {
      for (const r of reservations) {
        const inv = r.inventory;
        const newReserved = Math.max(0, inv.reservedQuantity - r.quantity);
        const newAvailable = inv.stockOnHand - newReserved;

        // Restore available quantity and decrement reserved
        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
          },
        });

        // If listing was OUT_OF_STOCK and stock is now available, restore ACTIVE status
        if (
          newAvailable > 0 &&
          r.inventory.sellerProduct.status === SellerProductStatus.OUT_OF_STOCK
        ) {
          await tx.sellerProduct.update({
            where: { id: r.inventory.sellerProduct.id },
            data: { status: SellerProductStatus.ACTIVE },
          });
        }

        // Mark reservation as RELEASED
        await tx.stockReservation.update({
          where: { id: r.id },
          data: {
            status: StockReservationStatus.RELEASED,
            releasedAt: new Date(),
          },
        });

        // Append RESERVATION_RELEASE to ledger
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            type: InventoryTransactionType.RESERVATION_RELEASE,
            quantity: r.quantity,
            stockBefore: inv.stockOnHand,
            stockAfter: inv.stockOnHand,
            referenceType: 'CHECKOUT_SESSION',
            referenceId: dto.checkoutSessionId,
            note: dto.reason || 'Reservation released due to cancellation or timeout',
            idempotencyKey: dto.idempotencyKey ? `${dto.idempotencyKey}:${r.id}` : undefined,
          },
        });
      }

      return {
        checkoutSessionId: dto.checkoutSessionId,
        status: StockReservationStatus.RELEASED,
        releasedCount: reservations.length,
      };
    });
  }

  /**
   * EXPIRE OUTDATED RESERVATIONS (Background Cron & Lazy Trigger)
   * Finds all ACTIVE reservations past their expiration timestamp and releases them in bounded batches.
   */
  async expireReservations(batchSize: number = 50) {
    const now = new Date();
    const expiredReservations = await this.prisma.stockReservation.findMany({
      where: {
        status: StockReservationStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      include: { inventory: { include: { sellerProduct: true } } },
      take: batchSize,
    });

    if (expiredReservations.length === 0) {
      return { releasedCount: 0 };
    }

    let releasedCount = 0;

    for (const r of expiredReservations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const inv = await tx.inventory.findUnique({
            where: { id: r.inventoryId },
            include: { sellerProduct: true },
          });

          if (!inv) return;

          const newReserved = Math.max(0, inv.reservedQuantity - r.quantity);
          const newAvailable = inv.stockOnHand - newReserved;

          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              reservedQuantity: newReserved,
              availableQuantity: newAvailable,
            },
          });

          if (newAvailable > 0 && inv.sellerProduct.status === SellerProductStatus.OUT_OF_STOCK) {
            await tx.sellerProduct.update({
              where: { id: inv.sellerProduct.id },
              data: { status: SellerProductStatus.ACTIVE },
            });
          }

          await tx.stockReservation.update({
            where: { id: r.id },
            data: {
              status: StockReservationStatus.EXPIRED,
              releasedAt: new Date(),
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inv.id,
              type: InventoryTransactionType.RESERVATION_RELEASE,
              quantity: r.quantity,
              stockBefore: inv.stockOnHand,
              stockAfter: inv.stockOnHand,
              referenceType: 'EXPIRED_RESERVATION',
              referenceId: r.checkoutSessionId || r.id,
              note: 'Reservation automatically expired by background engine',
            },
          });

          releasedCount++;
        });
      } catch (err) {
        this.logger.error(`Failed to release expired reservation ${r.id}:`, err);
      }
    }

    this.logger.log(`Released ${releasedCount} expired stock reservation(s)`);
    return { releasedCount };
  }

  /**
   * Lazy expiration helper for a specific inventory row.
   */
  private async expireOutdatedReservationsForItem(inventoryId: string) {
    const now = new Date();
    const expiredReservations = await this.prisma.stockReservation.findMany({
      where: {
        inventoryId,
        status: StockReservationStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    for (const r of expiredReservations) {
      await this.prisma.$transaction(async (tx) => {
        const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
        if (!inv) return;

        const newReserved = Math.max(0, inv.reservedQuantity - r.quantity);
        const newAvailable = inv.stockOnHand - newReserved;

        await tx.inventory.update({
          where: { id: inventoryId },
          data: {
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
          },
        });

        await tx.stockReservation.update({
          where: { id: r.id },
          data: {
            status: StockReservationStatus.EXPIRED,
            releasedAt: new Date(),
          },
        });
      });
    }
  }

  /**
   * PICKER SHORTAGE WRITE-OFF CONTRACT (Section 13)
   * Invoked by fulfillment / picking workflows when a picker finds shelves depleted or items damaged.
   */
  async recordPickerShortage(dto: PickerShortageWriteOffDto) {
    // 1. Idempotency Check
    if (dto.idempotencyKey?.trim()) {
      const existing = await this.prisma.inventoryTransaction.findFirst({
        where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: { inventory: true },
      });
      if (existing) {
        return {
          id: existing.id,
          operation: existing.type,
          stockOnHand: existing.inventory.stockOnHand,
          availableStock: existing.inventory.availableQuantity,
          message: 'Picker shortage previously recorded (idempotent)',
        };
      }
    }

    const listing = await this.prisma.sellerProduct.findFirst({
      where: { id: dto.listingId, sellerId: dto.storeId, deletedAt: null },
      include: { inventory: true, product: { select: { name: true } } },
    });

    if (!listing || !listing.inventory) {
      throw new NotFoundException(`Listing ${dto.listingId} not found in store`);
    }

    const inv = listing.inventory;
    const currentStockOnHand = inv.stockOnHand;
    const newStockOnHand = Math.max(0, currentStockOnHand - dto.shortageQuantity);
    const newAvailable = Math.max(0, newStockOnHand - inv.reservedQuantity);

    return this.prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          stockOnHand: newStockOnHand,
          availableQuantity: newAvailable,
        },
      });

      if (newAvailable === 0 && listing.status === SellerProductStatus.ACTIVE) {
        await tx.sellerProduct.update({
          where: { id: listing.id },
          data: { status: SellerProductStatus.OUT_OF_STOCK },
        });
      }

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTransactionType.PICKER_SHORTAGE_WRITEOFF,
          quantity: -dto.shortageQuantity,
          stockBefore: currentStockOnHand,
          stockAfter: newStockOnHand,
          note: `Picker ${dto.pickerId} shortage report: ${dto.reason}`,
          referenceType: 'PICKER_SHORTAGE',
          referenceId: dto.orderId || dto.pickerId,
          idempotencyKey: dto.idempotencyKey?.trim(),
          createdBy: dto.pickerId,
        },
      });

      this.logger.warn(
        `[PICKER SHORTAGE] Store ${dto.storeId} Listing ${dto.listingId}: ${dto.shortageQuantity} unit(s) short. Reason: ${dto.reason}. Order: ${dto.orderId || 'None'}`,
      );

      return {
        id: transaction.id,
        operation: transaction.type,
        shortageQuantity: dto.shortageQuantity,
        stockOnHand: newStockOnHand,
        availableStock: newAvailable,
        productName: listing.product.name,
        requiresOrderException: Boolean(dto.orderId),
        orderId: dto.orderId,
      };
    });
  }
}
