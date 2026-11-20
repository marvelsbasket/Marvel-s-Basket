import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FoodPreference, ProductStatus } from '@prisma/client';
import {
  CatalogStoreMappingItem,
  PaginatedResponse,
  ProductDetailItem,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
  QueryAdminProductsDto,
  UpdateProductDto,
  UpdateProductStatusDto,
  UpdateProductVariantDto,
} from './dto';

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generateSku(productSlug: string, variantName: string): string {
    const pPart = productSlug
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 8)
      .toUpperCase();
    const vPart = variantName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MB-${pPart}-${vPart || 'STD'}-${random}`;
  }

  /**
   * Admin: List master catalog products with search, status filter, and pagination.
   */
  async list(query: QueryAdminProductsDto): Promise<PaginatedResponse<any>> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.brandId) {
      where.brandId = query.brandId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brandRel: { select: { id: true, name: true, slug: true } },
          variants: {
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              name: true,
              packSize: true,
              mrp: true,
              sku: true,
              primaryImageUrl: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              sellerProducts: true,
              variants: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map((prod) => ({
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        brand: prod.brand || prod.brandRel?.name || null,
        category: prod.category,
        status: prod.status,
        foodPreference: prod.foodPreference,
        isFeatured: prod.isFeatured,
        variantCount: prod._count.variants,
        storeListingCount: prod._count.sellerProducts,
        variants: prod.variants.map((v) => ({
          ...v,
          mrp: Number(v.mrp),
        })),
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Admin: Get full master product dossier with all variants, images, and specifications.
   */
  async getById(id: string): Promise<ProductDetailItem> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
        brandRel: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
            isActive: true,
          },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          orderBy: { displayOrder: 'asc' },
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      brand: product.brand || product.brandRel?.name || null,
      brandDetails: product.brandRel,
      category: product.category,
      foodPreference: product.foodPreference,
      countryOfOrigin: product.countryOfOrigin,
      manufacturerDetails: product.manufacturerDetails,
      packerDetails: product.packerDetails,
      shelfLife: product.shelfLife,
      storageInstructions: product.storageInstructions,
      ingredients: product.ingredients,
      nutritionalInfo: product.nutritionalInfo as Record<string, unknown>,
      specifications: product.specifications as Record<string, unknown>,
      attributes: product.attributes as Record<string, unknown>,
      searchTags: product.searchTags,
      status: product.status,
      variants: product.variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        name: v.name,
        packSize: v.packSize || v.name,
        unitValue: v.unitValue ? Number(v.unitValue) : null,
        unitType: v.unitType,
        mrp: Number(v.mrp),
        sku: v.sku,
        barcode: v.barcode,
        primaryImageUrl: v.primaryImageUrl || product.images[0]?.imageUrl || null,
        isActive: v.isActive,
        displayOrder: v.displayOrder,
        attributes: v.attributes as Record<string, unknown>,
        images: v.images.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
          altText: img.altText,
          isPrimary: img.isPrimary,
          displayOrder: img.displayOrder,
        })),
      })),
      store: null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  /**
   * Admin: Creates a new platform-owned master product (default status: DRAFT).
   * Optionally creates the initial master variant atomically.
   */
  async create(dto: CreateProductDto): Promise<ProductDetailItem> {
    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    // Verify slug uniqueness
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Product slug '${slug}' already exists`);
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException(`Category with ID '${dto.categoryId}' not found`);
    }

    // Verify brand if provided
    let brandName = dto.brand?.trim() || null;
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) {
        throw new NotFoundException(`Brand with ID '${dto.brandId}' not found`);
      }
      brandName = brand.name;
    }

    // Create product
    const createdProduct = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: dto.categoryId,
          brandId: dto.brandId || null,
          name: dto.name.trim(),
          slug,
          shortDescription: dto.shortDescription?.trim() || null,
          description: dto.description?.trim() || null,
          brand: brandName,
          foodPreference: dto.foodPreference || FoodPreference.NA,
          countryOfOrigin: dto.countryOfOrigin || 'India',
          manufacturerDetails: dto.manufacturerDetails?.trim() || null,
          packerDetails: dto.packerDetails?.trim() || null,
          shelfLife: dto.shelfLife?.trim() || null,
          storageInstructions: dto.storageInstructions?.trim() || null,
          ingredients: dto.ingredients?.trim() || null,
          nutritionalInfo: dto.nutritionalInfo as any,
          specifications: dto.specifications as any,
          attributes: dto.attributes as any,
          searchTags: dto.searchTags || [],
          isFeatured: dto.isFeatured || false,
          status: ProductStatus.DRAFT,
        },
      });

      // If initial variant provided, create it
      if (dto.initialVariant) {
        const sku =
          dto.initialVariant.sku?.trim() || this.generateSku(slug, dto.initialVariant.name);

        await tx.productVariant.create({
          data: {
            productId: product.id,
            name: dto.initialVariant.name.trim(),
            packSize: dto.initialVariant.packSize?.trim() || dto.initialVariant.name.trim(),
            unitValue:
              dto.initialVariant.unitValue !== undefined ? dto.initialVariant.unitValue : null,
            unitType: dto.initialVariant.unitType?.trim() || null,
            mrp: dto.initialVariant.mrp,
            sku,
            barcode: dto.initialVariant.barcode?.trim() || null,
            primaryImageUrl: dto.initialVariant.primaryImageUrl || null,
            isActive:
              dto.initialVariant.isActive !== undefined ? dto.initialVariant.isActive : true,
            displayOrder: dto.initialVariant.displayOrder || 0,
            attributes: dto.initialVariant.attributes as any,
          },
        });
      }

      return product;
    });

    this.logger.log(`Created master product: ${createdProduct.name} (${createdProduct.id})`);
    return this.getById(createdProduct.id);
  }

  /**
   * Admin: Update master product details.
   */
  async update(id: string, dto: UpdateProductDto): Promise<ProductDetailItem> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = this.generateSlug(dto.slug);
      const conflict = await this.prisma.product.findUnique({ where: { slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Product slug '${slug}' is already taken`);
      }
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException(`Category with ID '${dto.categoryId}' not found`);
      }
    }

    let brandName = dto.brand !== undefined ? dto.brand.trim() : existing.brand;
    if (dto.brandId && dto.brandId !== existing.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) {
        throw new NotFoundException(`Brand with ID '${dto.brandId}' not found`);
      }
      brandName = brand.name;
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.brandId !== undefined && { brandId: dto.brandId }),
        ...(brandName !== undefined && { brand: brandName }),
        ...(dto.shortDescription !== undefined && {
          shortDescription: dto.shortDescription?.trim() || null,
        }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.foodPreference !== undefined && { foodPreference: dto.foodPreference }),
        ...(dto.countryOfOrigin !== undefined && { countryOfOrigin: dto.countryOfOrigin }),
        ...(dto.manufacturerDetails !== undefined && {
          manufacturerDetails: dto.manufacturerDetails?.trim() || null,
        }),
        ...(dto.packerDetails !== undefined && {
          packerDetails: dto.packerDetails?.trim() || null,
        }),
        ...(dto.shelfLife !== undefined && { shelfLife: dto.shelfLife?.trim() || null }),
        ...(dto.storageInstructions !== undefined && {
          storageInstructions: dto.storageInstructions?.trim() || null,
        }),
        ...(dto.ingredients !== undefined && { ingredients: dto.ingredients?.trim() || null }),
        ...(dto.nutritionalInfo !== undefined && { nutritionalInfo: dto.nutritionalInfo as any }),
        ...(dto.specifications !== undefined && { specifications: dto.specifications as any }),
        ...(dto.attributes !== undefined && { attributes: dto.attributes as any }),
        ...(dto.searchTags !== undefined && { searchTags: dto.searchTags }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      },
    });

    this.logger.log(`Updated master product: ${id}`);
    return this.getById(id);
  }

  /**
   * Admin: Transition product status (DRAFT, ACTIVE, DISCONTINUED, INACTIVE).
   * Enforces strict publishing validations before transitioning to ACTIVE.
   */
  async updateStatus(id: string, dto: UpdateProductStatusDto): Promise<ProductDetailItem> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: { where: { isActive: true } },
        images: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Publishing validations when making a product ACTIVE
    if (dto.status === ProductStatus.ACTIVE) {
      if (product.variants.length === 0) {
        throw new BadRequestException(
          'Cannot publish product: at least one active product variant is required.',
        );
      }

      const invalidMrpVariant = product.variants.find((v) => Number(v.mrp) <= 0);
      if (invalidMrpVariant) {
        throw new BadRequestException(
          `Cannot publish product: variant '${invalidMrpVariant.name}' must have a valid positive MRP.`,
        );
      }

      const hasVariantImage = product.variants.some((v) => v.primaryImageUrl);
      const hasProductImage = product.images.length > 0;
      if (!hasVariantImage && !hasProductImage) {
        throw new BadRequestException(
          'Cannot publish product: at least one primary product or variant image is required.',
        );
      }
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
    });

    this.logger.log(
      `Product ${id} status changed to ${dto.status}. Reason: ${dto.reason || 'None'}`,
    );
    return this.getById(id);
  }

  /**
   * Admin: Safe deletion / archival of master product.
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: { select: { sellerProducts: true } },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Soft delete to preserve historical integrity and order snapshots
    await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });

    this.logger.log(`Archived master product: ${product.name} (${id})`);

    return {
      success: true,
      message: `Product '${product.name}' archived successfully`,
    };
  }

  /**
   * Admin: Add a new variant to an existing master product.
   */
  async addVariant(productId: string, dto: CreateProductVariantDto): Promise<ProductDetailItem> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const sku = dto.sku?.trim() || this.generateSku(product.slug, dto.name);

    // Check SKU uniqueness
    const existingSku = await this.prisma.productVariant.findUnique({ where: { sku } });
    if (existingSku) {
      throw new ConflictException(`SKU code '${sku}' already exists`);
    }

    await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name.trim(),
        packSize: dto.packSize?.trim() || dto.name.trim(),
        unitValue: dto.unitValue !== undefined ? dto.unitValue : null,
        unitType: dto.unitType?.trim() || null,
        mrp: dto.mrp,
        sku,
        barcode: dto.barcode?.trim() || null,
        primaryImageUrl: dto.primaryImageUrl || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        displayOrder: dto.displayOrder || 0,
        attributes: dto.attributes as any,
      },
    });

    this.logger.log(`Added variant '${dto.name}' to product '${product.name}'`);
    return this.getById(productId);
  }

  /**
   * Admin: Update an existing product variant.
   */
  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ): Promise<ProductDetailItem> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found on product '${productId}'`);
    }

    if (dto.sku && dto.sku !== variant.sku) {
      const conflictSku = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
      if (conflictSku && conflictSku.id !== variantId) {
        throw new ConflictException(`SKU code '${dto.sku}' already exists`);
      }
    }

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.packSize !== undefined && { packSize: dto.packSize?.trim() || dto.name?.trim() }),
        ...(dto.unitValue !== undefined && { unitValue: dto.unitValue }),
        ...(dto.unitType !== undefined && { unitType: dto.unitType?.trim() || null }),
        ...(dto.mrp !== undefined && { mrp: dto.mrp }),
        ...(dto.sku !== undefined && { sku: dto.sku.trim() }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode?.trim() || null }),
        ...(dto.primaryImageUrl !== undefined && { primaryImageUrl: dto.primaryImageUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.attributes !== undefined && { attributes: dto.attributes as any }),
      },
    });

    this.logger.log(`Updated variant '${variantId}' on product '${productId}'`);
    return this.getById(productId);
  }

  /**
   * Admin: Safe deletion of a product variant.
   */
  async deleteVariant(productId: string, variantId: string): Promise<ProductDetailItem> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: {
        product: {
          include: {
            variants: { where: { isActive: true } },
          },
        },
        sellerProducts: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found on product '${productId}'`);
    }

    // Check if deleting the only active variant of an ACTIVE product
    if (variant.product.status === ProductStatus.ACTIVE && variant.product.variants.length <= 1) {
      throw new BadRequestException(
        'Cannot delete the only active variant of a published product. Deactivate the product or add another variant first.',
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });
    this.logger.log(`Deleted variant '${variantId}' from product '${productId}'`);

    return this.getById(productId);
  }

  /**
   * Admin: Upload variant image (max 5 images per variant rule).
   */
  async uploadVariantImage(
    productId: string,
    variantId: string,
    file: Express.Multer.File,
    isPrimary = false,
  ): Promise<ProductDetailItem> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { images: true },
    });

    if (!variant) {
      throw new NotFoundException(`Variant '${variantId}' not found on product '${productId}'`);
    }

    if (variant.images.length >= 5) {
      throw new BadRequestException('Maximum 5 gallery images allowed per product variant.');
    }

    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: `marvels-basket/catalog/products/${productId}/variants/${variantId}`,
      maxWidth: 1200,
      maxHeight: 1200,
      tags: ['product-variant-image', variant.sku || productId],
    });

    const isFirstImage = variant.images.length === 0;
    const shouldBePrimary = isPrimary || isFirstImage;

    await this.prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.productImage.updateMany({
          where: { variantId },
          data: { isPrimary: false },
        });

        await tx.productVariant.update({
          where: { id: variantId },
          data: {
            primaryImageUrl: upload.secureUrl,
            primaryImagePublicId: upload.publicId,
          },
        });
      }

      await tx.productImage.create({
        data: {
          productId,
          variantId,
          imageUrl: upload.secureUrl,
          publicId: upload.publicId,
          isPrimary: shouldBePrimary,
          displayOrder: variant.images.length,
          altText: `${variant.name} image`,
        },
      });
    });

    this.logger.log(`Uploaded image for variant '${variantId}' on product '${productId}'`);
    return this.getById(productId);
  }

  /**
   * Admin: Delete variant image and clean up Cloudinary asset.
   */
  async deleteVariantImage(
    productId: string,
    variantId: string,
    imageId: string,
  ): Promise<ProductDetailItem> {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, variantId, productId },
    });

    if (!image) {
      throw new NotFoundException(`Image '${imageId}' not found on variant '${variantId}'`);
    }

    if (image.publicId) {
      await this.cloudinaryService.deleteResource(image.publicId, 'image').catch(() => {});
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });

      // If the deleted image was primary, promote the next image
      if (image.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: { variantId },
          orderBy: { displayOrder: 'asc' },
        });

        if (nextImage) {
          await tx.productImage.update({
            where: { id: nextImage.id },
            data: { isPrimary: true },
          });

          await tx.productVariant.update({
            where: { id: variantId },
            data: {
              primaryImageUrl: nextImage.imageUrl,
              primaryImagePublicId: nextImage.publicId,
            },
          });
        } else {
          await tx.productVariant.update({
            where: { id: variantId },
            data: {
              primaryImageUrl: null,
              primaryImagePublicId: null,
            },
          });
        }
      }
    });

    return this.getById(productId);
  }

  /**
   * Admin: Inspect store inventory and pricing mappings for this product across all stores.
   * Demonstrates strict master catalog vs store inventory architectural separation.
   */
  async getStoreListings(productId: string): Promise<CatalogStoreMappingItem[]> {
    const listings = await this.prisma.sellerProduct.findMany({
      where: { productId },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            storeDisplayName: true,
            profile: { select: { city: true } },
          },
        },
        inventory: true,
      },
      orderBy: { sellingPrice: 'asc' },
    });

    return listings.map((l) => ({
      sellerId: l.sellerId,
      storeName: l.seller.storeDisplayName || l.seller.businessName,
      storeCity: l.seller.profile?.city || 'Bengaluru',
      sellingPrice: Number(l.sellingPrice),
      mrp: l.mrp ? Number(l.mrp) : null,
      availableStock: l.inventory?.availableQuantity || 0,
      lowStockThreshold: l.inventory?.lowStockThreshold || 5,
      status: l.status,
      lastInventoryUpdate: l.inventory?.updatedAt.toISOString() || l.updatedAt.toISOString(),
    }));
  }
}
