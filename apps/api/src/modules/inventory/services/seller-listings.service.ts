import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateSellerListingDto,
  QuerySellerListingsDto,
  UpdateListingPriceDto,
  UpdateListingStatusDto,
  UpdateSellerListingDto,
} from '../dto';
import {
  InventoryTransactionType,
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SellerListingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify that the requesting user owns the specified store and the store is in an approved state.
   */
  async verifyStoreOwnership(userId: string, storeId: string) {
    const store = await this.prisma.seller.findUnique({
      where: { id: storeId },
      include: { profile: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    if (store.ownerUserId !== userId) {
      throw new ForbiddenException('You do not have permission to manage listings for this store');
    }

    if (store.status !== SellerStatus.APPROVED_ACTIVE && (store.status as any) !== 'APPROVED') {
      throw new ForbiddenException(
        `Store is currently ${store.status}. Only APPROVED_ACTIVE stores can manage commercial listings and inventory.`,
      );
    }

    return store;
  }

  /**
   * Browse platform-approved master catalog products & variants available for adding to store.
   */
  async browseMasterCatalog(
    userId: string,
    query: { search?: string; categoryId?: string; brandId?: string; storeId?: string },
  ) {
    const where: any = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { sku: { contains: query.search.trim(), mode: 'insensitive' } },
        { brand: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brandRel: true,
        images: { where: { isPrimary: true }, take: 1 },
        variants: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    // If storeId is provided, identify which variants are already listed in this store
    let listedVariantIds = new Set<string>();
    if (query.storeId) {
      const existingListings = await this.prisma.sellerProduct.findMany({
        where: {
          sellerId: query.storeId,
          deletedAt: null,
        },
        select: { variantId: true },
      });
      listedVariantIds = new Set(
        existingListings.map((l) => l.variantId).filter(Boolean) as string[],
      );
    }

    return products.map((prod) => ({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      sku: prod.sku,
      brand: prod.brand || prod.brandRel?.name,
      categoryName: prod.category.name,
      primaryImageUrl: prod.images[0]?.imageUrl || null,
      foodPreference: prod.foodPreference,
      variants: prod.variants.map((v) => ({
        id: v.id,
        name: v.name,
        packSize: v.packSize,
        mrp: Number(v.mrp),
        sku: v.sku,
        barcode: v.barcode,
        primaryImageUrl:
          v.primaryImageUrl || v.images[0]?.imageUrl || prod.images[0]?.imageUrl || null,
        isAlreadyListed: listedVariantIds.has(v.id),
      })),
    }));
  }

  /**
   * Create a new store listing mapping a master catalog variant to the seller's store.
   * Atomically initializes listing and inventory record.
   */
  async createListing(userId: string, storeId: string, dto: CreateSellerListingDto) {
    await this.verifyStoreOwnership(userId, storeId);

    // 1. Verify master product exists and is ACTIVE
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { category: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Master catalog product not found');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot list product with status ${product.status}. Master product must be ACTIVE.`,
      );
    }

    // 2. Verify master variant exists, belongs to product, and is ACTIVE
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
    });

    if (!variant || variant.productId !== product.id) {
      throw new NotFoundException('Selected variant does not belong to the master product');
    }

    if (!variant.isActive) {
      throw new BadRequestException('Selected product variant is inactive in the master catalog');
    }

    // 3. Enforce MRP ceiling: 0 < sellingPrice <= variant.mrp
    const variantMrp = Number(variant.mrp);
    if (dto.sellingPrice <= 0) {
      throw new BadRequestException('Selling price must be greater than zero');
    }
    if (dto.sellingPrice > variantMrp) {
      throw new BadRequestException(
        `Store selling price (₹${dto.sellingPrice}) cannot exceed the master catalog MRP (₹${variantMrp}).`,
      );
    }

    // 4. Check for duplicate listing
    const existingListing = await this.prisma.sellerProduct.findFirst({
      where: {
        sellerId: storeId,
        variantId: dto.variantId,
        deletedAt: null,
      },
    });

    if (existingListing) {
      throw new ConflictException({
        message: 'This product variant is already listed in your store',
        existingListingId: existingListing.id,
        status: existingListing.status,
      });
    }

    const initialStock = dto.initialStock ?? 0;
    const lowStockThreshold = dto.lowStockThreshold ?? 5;
    const status =
      dto.status ??
      (initialStock === 0 ? SellerProductStatus.OUT_OF_STOCK : SellerProductStatus.ACTIVE);

    // 5. Execute atomic database transaction
    return this.prisma.$transaction(async (tx) => {
      // Create listing
      const listing = await tx.sellerProduct.create({
        data: {
          sellerId: storeId,
          productId: dto.productId,
          variantId: dto.variantId,
          sellingPrice: new Decimal(dto.sellingPrice),
          mrp: new Decimal(variantMrp),
          sellerSku: dto.sellerSku || `STR-${variant.sku || variant.id.slice(0, 8)}`,
          status,
        },
      });

      // Create inventory with invariants: stockOnHand = availableQuantity + reservedQuantity (0)
      const inventory = await tx.inventory.create({
        data: {
          sellerProductId: listing.id,
          stockOnHand: initialStock,
          availableQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold,
        },
      });

      // Record INITIAL_STOCK in audit ledger if initial stock was configured
      if (initialStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: InventoryTransactionType.INITIAL_STOCK,
            quantity: initialStock,
            stockBefore: 0,
            stockAfter: initialStock,
            note: 'Initial listing stock setup',
            createdBy: userId,
          },
        });
      }

      return this.formatListingItem(listing, inventory, product, variant);
    });
  }

  /**
   * List store listings with search, category filtering, and inventory status filters.
   */
  async getListings(userId: string, storeId: string, query: QuerySellerListingsDto) {
    await this.verifyStoreOwnership(userId, storeId);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      sellerId: storeId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.product = { categoryId: query.categoryId };
    }

    if (query.search?.trim()) {
      where.OR = [
        { product: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
        { sellerSku: { contains: query.search.trim(), mode: 'insensitive' } },
        { variant: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
        { variant: { sku: { contains: query.search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sellerProduct.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
              brandRel: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          variant: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          inventory: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sellerProduct.count({ where }),
    ]);

    let formatted = items.map((item) =>
      this.formatListingItem(item, item.inventory, item.product, item.variant),
    );

    // Apply in-memory filters for low stock / out of stock if requested
    if (query.isLowStock) {
      formatted = formatted.filter((item) => item.isLowStock);
    }
    if (query.isOutOfStock) {
      formatted = formatted.filter((item) => item.isOutOfStock);
    }

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve single store listing by ID with complete variant and inventory state.
   */
  async getListingById(userId: string, storeId: string, listingId: string) {
    await this.verifyStoreOwnership(userId, storeId);

    const listing = await this.prisma.sellerProduct.findFirst({
      where: {
        id: listingId,
        sellerId: storeId,
        deletedAt: null,
      },
      include: {
        product: {
          include: {
            category: true,
            brandRel: true,
            images: true,
          },
        },
        variant: {
          include: {
            images: true,
          },
        },
        inventory: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${listingId} not found in this store`);
    }

    return this.formatListingItem(listing, listing.inventory, listing.product, listing.variant);
  }

  /**
   * Update store listing metadata (selling price, seller SKU, low stock threshold, status).
   */
  async updateListing(
    userId: string,
    storeId: string,
    listingId: string,
    dto: UpdateSellerListingDto,
  ) {
    await this.verifyStoreOwnership(userId, storeId);

    const listing = await this.prisma.sellerProduct.findFirst({
      where: { id: listingId, sellerId: storeId, deletedAt: null },
      include: { variant: true, inventory: true },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${listingId} not found in this store`);
    }

    // Validate price ceiling if sellingPrice is updated
    if (dto.sellingPrice !== undefined) {
      const variantMrp = listing.variant ? Number(listing.variant.mrp) : Number(listing.mrp || 0);
      if (dto.sellingPrice <= 0) {
        throw new BadRequestException('Selling price must be greater than zero');
      }
      if (variantMrp > 0 && dto.sellingPrice > variantMrp) {
        throw new BadRequestException(
          `Selling price (₹${dto.sellingPrice}) cannot exceed master catalog MRP (₹${variantMrp}).`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedListing = await tx.sellerProduct.update({
        where: { id: listingId },
        data: {
          sellingPrice: dto.sellingPrice !== undefined ? new Decimal(dto.sellingPrice) : undefined,
          sellerSku: dto.sellerSku !== undefined ? dto.sellerSku : undefined,
          status: dto.status !== undefined ? dto.status : undefined,
        },
        include: {
          product: { include: { category: true, images: true } },
          variant: { include: { images: true } },
          inventory: true,
        },
      });

      if (dto.lowStockThreshold !== undefined && listing.inventory) {
        await tx.inventory.update({
          where: { id: listing.inventory.id },
          data: { lowStockThreshold: dto.lowStockThreshold },
        });
      }

      return this.formatListingItem(
        updatedListing,
        updatedListing.inventory,
        updatedListing.product,
        updatedListing.variant,
      );
    });
  }

  /**
   * Update store selling price specifically with strict MRP validation.
   */
  async updateListingPrice(
    userId: string,
    storeId: string,
    listingId: string,
    dto: UpdateListingPriceDto,
  ) {
    return this.updateListing(userId, storeId, listingId, {
      sellingPrice: dto.sellingPrice,
    });
  }

  /**
   * Update listing status (ACTIVE, PAUSED, OUT_OF_STOCK, DISABLED).
   */
  async updateListingStatus(
    userId: string,
    storeId: string,
    listingId: string,
    dto: UpdateListingStatusDto,
  ) {
    return this.updateListing(userId, storeId, listingId, {
      status: dto.status,
    });
  }

  /**
   * Master Catalog Reconcile Policy: When an administrator lowers a variant's MRP,
   * automatically revalidate and clamp all store selling prices that exceed the new MRP.
   */
  async handleMasterVariantMrpChange(variantId: string, newMrp: number) {
    const affectedListings = await this.prisma.sellerProduct.findMany({
      where: {
        variantId,
        deletedAt: null,
        sellingPrice: { gt: new Decimal(newMrp) },
      },
    });

    for (const listing of affectedListings) {
      await this.prisma.sellerProduct.update({
        where: { id: listing.id },
        data: {
          sellingPrice: new Decimal(newMrp),
          mrp: new Decimal(newMrp),
        },
      });
    }

    return {
      affectedListingsCount: affectedListings.length,
      newMrp,
    };
  }

  private formatListingItem(listing: any, inventory: any, product: any, variant: any) {
    const mrp = Number(variant?.mrp ?? listing.mrp ?? 0);
    const sellingPrice = Number(listing.sellingPrice);
    const discountPercent =
      mrp > sellingPrice && mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

    const stockOnHand = inventory?.stockOnHand ?? 0;
    const reservedStock = inventory?.reservedQuantity ?? 0;
    const availableStock = inventory?.availableQuantity ?? 0;
    const lowStockThreshold = inventory?.lowStockThreshold ?? 5;

    const isOutOfStock = availableStock <= 0 || listing.status === SellerProductStatus.OUT_OF_STOCK;
    const isLowStock = availableStock > 0 && availableStock <= lowStockThreshold;

    const imageUrl =
      variant?.primaryImageUrl ||
      variant?.images?.[0]?.imageUrl ||
      product?.images?.[0]?.imageUrl ||
      null;

    return {
      id: listing.id,
      sellerId: listing.sellerId,
      productId: product?.id || listing.productId,
      productName: product?.name || 'Unknown Product',
      productSlug: product?.slug || '',
      categoryName: product?.category?.name || 'General',
      brandName: product?.brand || product?.brandRel?.name || null,
      variantId: variant?.id || listing.variantId,
      variantName: variant?.name || 'Default Variant',
      packSize: variant?.packSize || null,
      sku: variant?.sku || product?.sku || null,
      sellerSku: listing.sellerSku,
      mrp,
      sellingPrice,
      discountPercent,
      status: listing.status,
      imageUrl,
      stockOnHand,
      reservedStock,
      availableStock,
      lowStockThreshold,
      isLowStock,
      isOutOfStock,
      updatedAt: listing.updatedAt.toISOString(),
      createdAt: listing.createdAt.toISOString(),
    };
  }
}
