import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AdjustStockDto, QueryInventoryHistoryDto, StockAdjustmentOperation } from '../dto';
import { InventoryTransactionType, SellerProductStatus, SellerStatus } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify store ownership and approved operational status.
   */
  private async verifyStoreOwnership(userId: string, storeId: string) {
    const store = await this.prisma.seller.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    if (store.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to manage inventory for this store');
    }

    if (store.status !== SellerStatus.APPROVED_ACTIVE && (store.status as any) !== 'APPROVED') {
      throw new ForbiddenException(
        `Store is currently ${store.status}. Only APPROVED_ACTIVE stores can manage inventory.`,
      );
    }

    return store;
  }

  /**
   * Retrieve high-level operational inventory overview metrics for the store.
   */
  async getInventoryOverview(userId: string, storeId: string) {
    await this.verifyStoreOwnership(userId, storeId);

    const listings = await this.prisma.sellerProduct.findMany({
      where: { sellerId: storeId, deletedAt: null },
      include: { inventory: true },
    });

    let totalStockOnHand = 0;
    let totalReservedStock = 0;
    let totalAvailableStock = 0;
    let activeListings = 0;
    let pausedListings = 0;
    let outOfStockListings = 0;
    let lowStockListings = 0;

    for (const listing of listings) {
      const inv = listing.inventory;
      const stockOnHand = inv?.stockOnHand ?? 0;
      const reserved = inv?.reservedQuantity ?? 0;
      const available = inv?.availableQuantity ?? 0;
      const threshold = inv?.lowStockThreshold ?? 5;

      totalStockOnHand += stockOnHand;
      totalReservedStock += reserved;
      totalAvailableStock += available;

      if (listing.status === SellerProductStatus.ACTIVE) {
        activeListings++;
      } else if (listing.status === SellerProductStatus.PAUSED) {
        pausedListings++;
      }

      if (available <= 0 || listing.status === SellerProductStatus.OUT_OF_STOCK) {
        outOfStockListings++;
      } else if (available <= threshold) {
        lowStockListings++;
      }
    }

    return {
      totalListedProducts: listings.length,
      activeListings,
      pausedListings,
      outOfStockListings,
      lowStockListings,
      totalStockOnHand,
      totalReservedStock,
      totalAvailableStock,
    };
  }

  /**
   * Retrieve stock details and recent adjustment ledger for a specific listing.
   */
  async getListingInventory(userId: string, storeId: string, listingId: string) {
    await this.verifyStoreOwnership(userId, storeId);

    const listing = await this.prisma.sellerProduct.findFirst({
      where: { id: listingId, sellerId: storeId, deletedAt: null },
      include: {
        product: { select: { name: true, slug: true } },
        variant: { select: { name: true, packSize: true, sku: true } },
        inventory: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!listing || !listing.inventory) {
      throw new NotFoundException(`Inventory record not found for listing ${listingId}`);
    }

    const inv = listing.inventory;

    return {
      listingId: listing.id,
      productId: listing.productId,
      productName: listing.product.name,
      variantId: listing.variantId,
      variantName: listing.variant?.name || 'Default Variant',
      packSize: listing.variant?.packSize,
      sku: listing.variant?.sku || listing.sellerSku,
      status: listing.status,
      stockOnHand: inv.stockOnHand,
      reservedStock: inv.reservedQuantity,
      availableStock: inv.availableQuantity,
      lowStockThreshold: inv.lowStockThreshold,
      isLowStock: inv.availableQuantity > 0 && inv.availableQuantity <= inv.lowStockThreshold,
      isOutOfStock: inv.availableQuantity <= 0,
      recentTransactions: inv.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        quantity: tx.quantity,
        stockBefore: tx.stockBefore,
        stockAfter: tx.stockAfter,
        note: tx.note,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Apply an auditable stock adjustment to a store listing.
   * Enforces all stock invariants and checks idempotency.
   */
  async adjustStock(userId: string, storeId: string, listingId: string, dto: AdjustStockDto) {
    await this.verifyStoreOwnership(userId, storeId);

    // 1. Idempotency Check
    if (dto.idempotencyKey?.trim()) {
      const existingTx = await this.prisma.inventoryTransaction.findFirst({
        where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: { inventory: true },
      });
      if (existingTx) {
        this.logger.log(`Idempotent stock adjustment ignored for key: ${dto.idempotencyKey}`);
        return {
          id: existingTx.id,
          operation: existingTx.type,
          stockOnHand: existingTx.inventory.stockOnHand,
          availableStock: existingTx.inventory.availableQuantity,
          reservedStock: existingTx.inventory.reservedQuantity,
          message: 'Operation previously completed (idempotent)',
        };
      }
    }

    // 2. Fetch current inventory and listing state
    const listing = await this.prisma.sellerProduct.findFirst({
      where: { id: listingId, sellerId: storeId, deletedAt: null },
      include: { inventory: true },
    });

    if (!listing || !listing.inventory) {
      throw new NotFoundException(`Inventory record not found for listing ${listingId}`);
    }

    const inv = listing.inventory;
    const currentStockOnHand = inv.stockOnHand;
    const currentReserved = inv.reservedQuantity;

    let newStockOnHand = currentStockOnHand;
    let delta = 0;
    let txType: InventoryTransactionType;

    switch (dto.operation) {
      case StockAdjustmentOperation.RESTOCK:
      case StockAdjustmentOperation.MANUAL_INCREASE:
        if (dto.quantity <= 0) {
          throw new BadRequestException('Restock quantity must be a positive integer');
        }
        delta = dto.quantity;
        newStockOnHand = currentStockOnHand + delta;
        txType =
          dto.operation === StockAdjustmentOperation.RESTOCK
            ? InventoryTransactionType.RESTOCK
            : InventoryTransactionType.MANUAL_INCREASE;
        break;

      case StockAdjustmentOperation.MANUAL_DECREASE:
        if (dto.quantity <= 0) {
          throw new BadRequestException('Reduction quantity must be a positive integer');
        }
        delta = -dto.quantity;
        newStockOnHand = currentStockOnHand - dto.quantity;

        // INVARIANT ENFORCEMENT (Section 12): Normal stock reduction cannot violate active reservations
        if (newStockOnHand < currentReserved) {
          throw new BadRequestException(
            `Cannot reduce stock on hand to ${newStockOnHand}. The store currently has ${currentReserved} unit(s) reserved for pending customer checkouts. Normal stock reduction cannot violate active customer reservations. Use emergency write-off if physical goods are damaged or missing.`,
          );
        }
        txType = InventoryTransactionType.MANUAL_DECREASE;
        break;

      case StockAdjustmentOperation.DAMAGED_STOCK_WRITEOFF:
      case StockAdjustmentOperation.EXPIRED_STOCK_WRITEOFF:
        if (dto.quantity <= 0) {
          throw new BadRequestException('Write-off quantity must be a positive integer');
        }
        delta = -dto.quantity;
        newStockOnHand = Math.max(0, currentStockOnHand - dto.quantity);

        if (currentStockOnHand - dto.quantity < 0) {
          throw new BadRequestException(
            `Write-off quantity (${dto.quantity}) exceeds physical stock on hand (${currentStockOnHand}).`,
          );
        }

        if (newStockOnHand < currentReserved) {
          this.logger.warn(
            `[EMERGENCY WRITEOFF] Store ${storeId} Listing ${listingId}: Physical stock (${newStockOnHand}) reduced below active reservations (${currentReserved}). Reason: ${dto.note}`,
          );
        }

        txType =
          dto.operation === StockAdjustmentOperation.DAMAGED_STOCK_WRITEOFF
            ? InventoryTransactionType.DAMAGED_STOCK_WRITEOFF
            : InventoryTransactionType.EXPIRED_STOCK_WRITEOFF;
        break;

      case StockAdjustmentOperation.PICKER_SHORTAGE_WRITEOFF:
        if (dto.quantity <= 0) {
          throw new BadRequestException('Shortage quantity must be a positive integer');
        }
        delta = -dto.quantity;
        newStockOnHand = Math.max(0, currentStockOnHand - dto.quantity);
        txType = InventoryTransactionType.PICKER_SHORTAGE_WRITEOFF;
        break;

      case StockAdjustmentOperation.INVENTORY_CORRECTION:
        if (dto.quantity < 0) {
          throw new BadRequestException('Corrected stock on hand cannot be negative');
        }
        newStockOnHand = dto.quantity;
        delta = newStockOnHand - currentStockOnHand;

        if (newStockOnHand < currentReserved) {
          throw new BadRequestException(
            `Target stock (${newStockOnHand}) cannot be lower than currently reserved stock (${currentReserved}).`,
          );
        }
        txType = InventoryTransactionType.INVENTORY_CORRECTION;
        break;

      default:
        throw new BadRequestException(`Unsupported stock adjustment operation: ${dto.operation}`);
    }

    const newAvailable = Math.max(0, newStockOnHand - currentReserved);

    // 3. Execute atomic update and append to audit ledger
    return this.prisma.$transaction(async (tx) => {
      // Update inventory row
      const updatedInv = await tx.inventory.update({
        where: { id: inv.id },
        data: {
          stockOnHand: newStockOnHand,
          availableQuantity: newAvailable,
        },
      });

      // Update listing status if stock became zero or restored from zero
      if (newAvailable === 0 && listing.status === SellerProductStatus.ACTIVE) {
        await tx.sellerProduct.update({
          where: { id: listing.id },
          data: { status: SellerProductStatus.OUT_OF_STOCK },
        });
      } else if (newAvailable > 0 && listing.status === SellerProductStatus.OUT_OF_STOCK) {
        await tx.sellerProduct.update({
          where: { id: listing.id },
          data: { status: SellerProductStatus.ACTIVE },
        });
      }

      // Append immutable ledger entry
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: txType,
          quantity: delta,
          stockBefore: currentStockOnHand,
          stockAfter: newStockOnHand,
          note: dto.note,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey?.trim(),
          createdBy: userId,
        },
      });

      return {
        id: transaction.id,
        operation: transaction.type,
        delta,
        stockBefore: currentStockOnHand,
        stockOnHand: updatedInv.stockOnHand,
        reservedStock: updatedInv.reservedQuantity,
        availableStock: updatedInv.availableQuantity,
        note: transaction.note,
        message: 'Stock adjusted successfully',
        createdAt: transaction.createdAt.toISOString(),
      };
    });
  }

  /**
   * Retrieve audit adjustment ledger history for a specific store listing.
   */
  async getInventoryHistory(
    userId: string,
    storeId: string,
    listingId: string,
    query: QueryInventoryHistoryDto,
  ) {
    await this.verifyStoreOwnership(userId, storeId);

    const listing = await this.prisma.sellerProduct.findFirst({
      where: { id: listingId, sellerId: storeId, deletedAt: null },
      include: { inventory: true },
    });

    if (!listing || !listing.inventory) {
      throw new NotFoundException(`Inventory record not found for listing ${listingId}`);
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      inventoryId: listing.inventory.id,
    };

    if (query.type) {
      where.type = query.type;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      items: transactions.map((t) => ({
        id: t.id,
        inventoryId: t.inventoryId,
        type: t.type,
        quantity: t.quantity,
        stockBefore: t.stockBefore,
        stockAfter: t.stockAfter,
        note: t.note,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        performedBy: t.createdBy,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Reconcile store inventory against the immutable ledger.
   * Compares stock on hand with cumulative stock-affecting deltas.
   */
  async reconcileInventory(userId: string, storeId: string, listingId?: string) {
    await this.verifyStoreOwnership(userId, storeId);

    const where: any = {
      sellerId: storeId,
      deletedAt: null,
    };

    if (listingId) {
      where.id = listingId;
    }

    const listings = await this.prisma.sellerProduct.findMany({
      where,
      include: {
        product: { select: { name: true } },
        variant: { select: { name: true, packSize: true } },
        inventory: {
          include: {
            transactions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    const results = listings.map((l) => {
      const inv = l.inventory;
      const currentStockOnHand = inv?.stockOnHand ?? 0;

      // Sum all physical stock-affecting ledger entries
      // Note: RESERVATION_HOLD and RESERVATION_RELEASE change reservedQuantity, not physical stockOnHand
      let calculatedStock = 0;
      let totalStockIn = 0;
      let totalStockOut = 0;
      let totalWriteOffs = 0;

      for (const tx of inv?.transactions || []) {
        if (
          tx.type === InventoryTransactionType.INITIAL_STOCK ||
          tx.type === InventoryTransactionType.RESTOCK ||
          tx.type === InventoryTransactionType.MANUAL_INCREASE ||
          tx.type === InventoryTransactionType.STOCK_IN
        ) {
          totalStockIn += tx.quantity;
          calculatedStock += tx.quantity;
        } else if (
          tx.type === InventoryTransactionType.MANUAL_DECREASE ||
          tx.type === InventoryTransactionType.STOCK_OUT ||
          tx.type === InventoryTransactionType.ORDER_COMMITTED ||
          tx.type === InventoryTransactionType.ORDER_FULFILLMENT
        ) {
          totalStockOut += Math.abs(tx.quantity);
          calculatedStock += tx.quantity; // tx.quantity is negative
        } else if (
          tx.type === InventoryTransactionType.DAMAGED_STOCK_WRITEOFF ||
          tx.type === InventoryTransactionType.EXPIRED_STOCK_WRITEOFF ||
          tx.type === InventoryTransactionType.PICKER_SHORTAGE_WRITEOFF
        ) {
          totalWriteOffs += Math.abs(tx.quantity);
          calculatedStock += tx.quantity; // tx.quantity is negative
        } else if (tx.type === InventoryTransactionType.INVENTORY_CORRECTION) {
          calculatedStock = tx.stockAfter;
        }
      }

      // If no transactions have occurred yet, calculated is opening stock
      if ((inv?.transactions || []).length === 0) {
        calculatedStock = currentStockOnHand;
      }

      const discrepancy = currentStockOnHand - calculatedStock;

      return {
        inventoryId: inv?.id || '',
        sellerProductId: l.id,
        productName: l.product.name,
        variantName: l.variant?.name || 'Default Variant',
        currentStockOnHand,
        calculatedStockFromLedger: calculatedStock,
        discrepancy,
        isReconciled: discrepancy === 0,
        totalStockIn,
        totalStockOut,
        totalWriteOffs,
      };
    });

    const totalDiscrepancies = results.filter((r) => !r.isReconciled).length;

    return {
      storeId,
      totalAudited: results.length,
      totalDiscrepancies,
      isFullyReconciled: totalDiscrepancies === 0,
      results,
    };
  }
}
