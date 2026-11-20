import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductStatus, Seller, SellerStatus } from '@prisma/client';
import {
  PaginatedResponse,
  ProductCardItem,
  ProductDetailItem,
  ProductVariantItem,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { QueryCatalogProductsDto } from './dto';

// Common Indian quick-commerce localized synonyms dictionary
const SEARCH_SYNONYMS: Record<string, string[]> = {
  doodh: ['milk', 'dairy'],
  milk: ['doodh', 'taaza', 'toned', 'cow milk'],
  atta: ['flour', 'wheat', 'sharbati', 'aashirvaad'],
  flour: ['atta', 'maida', 'suji'],
  dahi: ['curd', 'yogurt'],
  curd: ['dahi'],
  makkhan: ['butter'],
  butter: ['makkhan', 'amul'],
  tel: ['oil', 'mustard', 'sunflower', 'refined'],
  oil: ['tel', 'cooking oil', 'fortune'],
  chawal: ['rice', 'basmati'],
  rice: ['chawal', 'basmati'],
  biscuit: ['biscuits', 'cookies', 'rusk'],
  chips: ['namkeen', 'crisps', 'snack', 'lays', 'kurkure'],
  namkeen: ['mixture', 'sev', 'bhujia', 'chips'],
  aloo: ['potato', 'potatoes'],
  potato: ['aloo'],
  pyaz: ['onion', 'onions'],
  onion: ['pyaz'],
  tamatar: ['tomato', 'tomatoes'],
  tomato: ['tamatar'],
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the customer's serviceable store for hyperlocal quick-commerce delivery.
   * Priority:
   * 1. Explicit storeId if active and approved
   * 2. Store with matching service area for postalCode
   * 3. Fallback: primary active store in the system
   */
  async resolveServiceableStore(options?: {
    storeId?: string;
    postalCode?: string;
  }): Promise<Seller | null> {
    if (options?.storeId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        options.storeId,
      );
      const store = await this.prisma.seller.findFirst({
        where: {
          OR: [...(isUuid ? [{ id: options.storeId }] : []), { slug: options.storeId }],
          status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
        },
        include: { profile: true },
      });
      if (store) return store;
    }

    if (options?.postalCode) {
      const serviceArea = await this.prisma.sellerServiceArea.findFirst({
        where: {
          postalCode: options.postalCode.trim(),
          isActive: true,
          seller: {
            status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
          },
        },
        include: {
          seller: { include: { profile: true } },
        },
      });
      if (serviceArea?.seller) return serviceArea.seller;
    }

    // Default fallback: first active approved store
    return this.prisma.seller.findFirst({
      where: {
        status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
      },
      include: { profile: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Customer Storefront: Discover master products scoped to the customer's serviceable store.
   * Merges platform-owned product details with store-owned pricing and stock.
   */
  async getCatalogProducts(
    query: QueryCatalogProductsDto,
  ): Promise<PaginatedResponse<ProductCardItem>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // 1. Resolve store context
    const store = await this.resolveServiceableStore({
      storeId: query.storeId,
      postalCode: query.postalCode,
    });

    // 2. Build Prisma Where Clause for Master Catalog Products
    const where: any = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };

    if (query.foodPreference) {
      where.foodPreference = query.foodPreference;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    // Category / Subcategory hierarchy handling
    const rawSubcategory = query.subcategory || query.subcategoryId;
    const rawCategory = query.category || query.categoryId;

    if (rawSubcategory) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawSubcategory,
      );
      const sub = await this.prisma.category.findFirst({
        where: {
          OR: [...(isUuid ? [{ id: rawSubcategory }] : []), { slug: rawSubcategory }],
        },
      });
      if (sub) {
        where.categoryId = sub.id;
      }
    } else if (rawCategory) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawCategory,
      );
      const cat = await this.prisma.category.findFirst({
        where: {
          OR: [...(isUuid ? [{ id: rawCategory }] : []), { slug: rawCategory }],
        },
        include: { children: { select: { id: true } } },
      });

      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map((c) => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    // Brand filtering
    const rawBrand = query.brand || query.brandId;
    if (rawBrand) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawBrand,
      );
      const brandConditions = [
        ...(isUuid ? [{ brandId: rawBrand }] : []),
        { brand: { contains: rawBrand, mode: 'insensitive' } },
        { brandRel: { slug: rawBrand.toLowerCase() } },
      ];
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: brandConditions },
      ];
    }

    // Free text keyword search with synonym expansion
    if (query.q && query.q.trim()) {
      const term = query.q.trim().toLowerCase();
      const synonyms = SEARCH_SYNONYMS[term] || [];
      const searchTerms = [term, ...synonyms];

      const searchConditions = searchTerms.flatMap((word) => [
        { name: { contains: word, mode: 'insensitive' } },
        { brand: { contains: word, mode: 'insensitive' } },
        { description: { contains: word, mode: 'insensitive' } },
        { shortDescription: { contains: word, mode: 'insensitive' } },
        { category: { name: { contains: word, mode: 'insensitive' } } },
        { searchTags: { has: word } },
      ]);

      where.AND = [
        ...(where.AND || []),
        {
          OR: searchConditions,
        },
      ];
    }

    // 3. Query Master Products with Variants & Images
    const [, rawProducts] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brandRel: { select: { id: true, name: true, slug: true, logoUrl: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { imageUrl: true },
          },
          variants: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: {
              images: {
                orderBy: { displayOrder: 'asc' },
                select: {
                  id: true,
                  imageUrl: true,
                  publicId: true,
                  altText: true,
                  isPrimary: true,
                  displayOrder: true,
                },
              },
            },
          },
          ...(store
            ? {
                sellerProducts: {
                  where: {
                    sellerId: store.id,
                    status: 'ACTIVE',
                  },
                  include: {
                    inventory: {
                      select: {
                        availableQuantity: true,
                        reservedQuantity: true,
                      },
                    },
                  },
                },
              }
            : {}),
        },
      }),
    ]);

    // 4. Map & Merge Master Products with Store-Specific Pricing and Stock
    const mappedCards: ProductCardItem[] = [];

    for (const prod of rawProducts) {
      if (prod.variants.length === 0) continue;

      // Create quick lookup for store inventory mapped to variants
      const storeListingsMap = new Map<string, any>();
      if (store && (prod as any).sellerProducts) {
        for (const sp of (prod as any).sellerProducts) {
          const key = sp.variantId || 'DEFAULT';
          storeListingsMap.set(key, sp);
        }
      }

      // Map variants with store-specific data
      const mappedVariants: ProductVariantItem[] = prod.variants.map((v) => {
        const storeListing = storeListingsMap.get(v.id) || storeListingsMap.get('DEFAULT');
        const mrp = Number(v.mrp);

        let sellingPrice = mrp;
        let availableQuantity = 0;
        let isAvailable = false;
        let discountPercent = 0;
        let sellerProductId: string | undefined;

        if (storeListing) {
          sellingPrice = Number(storeListing.sellingPrice);
          availableQuantity = storeListing.inventory?.availableQuantity || 0;
          isAvailable = availableQuantity > 0;
          sellerProductId = storeListing.id;
        }

        if (mrp > 0 && sellingPrice < mrp) {
          discountPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
        }

        return {
          id: v.id,
          productId: v.productId,
          name: v.name,
          packSize: v.packSize || v.name,
          unitValue: v.unitValue ? Number(v.unitValue) : null,
          unitType: v.unitType,
          mrp,
          sku: v.sku,
          barcode: v.barcode,
          primaryImageUrl: v.primaryImageUrl || prod.images[0]?.imageUrl || null,
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
          sellingPrice,
          availableQuantity,
          isAvailable,
          discountPercent,
          sellerProductId,
        };
      });

      // Default variant is the first active variant
      const defaultVariant = mappedVariants[0];

      // Check price range filter on store selling price
      if (query.minPrice !== undefined && defaultVariant.sellingPrice! < query.minPrice) {
        continue;
      }
      if (query.maxPrice !== undefined && defaultVariant.sellingPrice! > query.maxPrice) {
        continue;
      }

      // Check min discount filter
      if (query.minDiscount !== undefined && defaultVariant.discountPercent! < query.minDiscount) {
        continue;
      }

      mappedCards.push({
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        brand: prod.brand || prod.brandRel?.name || null,
        category: prod.category,
        primaryImageUrl: defaultVariant.primaryImageUrl || prod.images[0]?.imageUrl || null,
        foodPreference: prod.foodPreference,
        variants: mappedVariants,
        defaultVariant,
        store: store
          ? {
              id: store.id,
              name: (store as any).profile?.storeDisplayName || store.businessName,
              deliveryTimeMinutes: (store as any).profile?.preparationTime
                ? (store as any).profile.preparationTime + 10
                : 15,
            }
          : null,
        mrp: defaultVariant.mrp,
        sellingPrice: defaultVariant.sellingPrice!,
        discountPercent: defaultVariant.discountPercent!,
        availableQuantity: defaultVariant.availableQuantity!,
        isAvailable: defaultVariant.isAvailable!,
      });
    }

    // 5. In-Memory Sorting by Store Values
    if (query.sort === 'price_asc') {
      mappedCards.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (query.sort === 'price_desc') {
      mappedCards.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (query.sort === 'discount_desc') {
      mappedCards.sort((a, b) => b.discountPercent - a.discountPercent);
    } else if (query.sort === 'newest') {
      // already sorted by createdAt
    }

    // 6. Pagination on filtered set
    const total = mappedCards.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = mappedCards.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Customer Storefront: Retrieves full product details by URL slug with store-specific pricing.
   */
  async getProductBySlug(
    slug: string,
    options?: { storeId?: string; postalCode?: string },
  ): Promise<ProductDetailItem> {
    const store = await this.resolveServiceableStore(options);

    const product = await this.prisma.product.findUnique({
      where: { slug },
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
          select: {
            id: true,
            imageUrl: true,
            publicId: true,
            altText: true,
            isPrimary: true,
            displayOrder: true,
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            images: {
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true,
                imageUrl: true,
                publicId: true,
                altText: true,
                isPrimary: true,
                displayOrder: true,
              },
            },
          },
        },
        ...(store
          ? {
              sellerProducts: {
                where: { sellerId: store.id, status: 'ACTIVE' },
                include: {
                  inventory: {
                    select: {
                      availableQuantity: true,
                      reservedQuantity: true,
                    },
                  },
                },
              },
            }
          : {}),
      },
    });

    if (!product || product.deletedAt || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException(`Product '${slug}' not found or is currently unavailable`);
    }

    const storeListingsMap = new Map<string, any>();
    if (store && (product as any).sellerProducts) {
      for (const sp of (product as any).sellerProducts) {
        const key = sp.variantId || 'DEFAULT';
        storeListingsMap.set(key, sp);
      }
    }

    const mappedVariants: ProductVariantItem[] = product.variants.map((v) => {
      const storeListing = storeListingsMap.get(v.id) || storeListingsMap.get('DEFAULT');
      const mrp = Number(v.mrp);

      let sellingPrice = mrp;
      let availableQuantity = 0;
      let isAvailable = false;
      let discountPercent = 0;
      let sellerProductId: string | undefined;

      if (storeListing) {
        sellingPrice = Number(storeListing.sellingPrice);
        availableQuantity = storeListing.inventory?.availableQuantity || 0;
        isAvailable = availableQuantity > 0;
        sellerProductId = storeListing.id;
      }

      if (mrp > 0 && sellingPrice < mrp) {
        discountPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
      }

      // Merge product-level images if variant has no specific images
      const images = v.images.length > 0 ? v.images : product.images;

      return {
        id: v.id,
        productId: v.productId,
        name: v.name,
        packSize: v.packSize || v.name,
        unitValue: v.unitValue ? Number(v.unitValue) : null,
        unitType: v.unitType,
        mrp,
        sku: v.sku,
        barcode: v.barcode,
        primaryImageUrl: v.primaryImageUrl || product.images[0]?.imageUrl || null,
        isActive: v.isActive,
        displayOrder: v.displayOrder,
        attributes: v.attributes as Record<string, unknown>,
        images: images.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
          altText: img.altText,
          isPrimary: img.isPrimary,
          displayOrder: img.displayOrder,
        })),
        sellingPrice,
        availableQuantity,
        isAvailable,
        discountPercent,
        sellerProductId,
      };
    });

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
      variants: mappedVariants,
      store: store
        ? {
            id: store.id,
            name: (store as any).profile?.storeDisplayName || store.businessName,
            slug: store.slug,
            deliveryTimeMinutes: (store as any).profile?.preparationTime
              ? (store as any).profile.preparationTime + 10
              : 15,
          }
        : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  /**
   * Search Suggestions: Autocomplete across active products, brands, and categories.
   */
  async getSearchSuggestions(q: string): Promise<{
    products: { name: string; slug: string }[];
    categories: { name: string; slug: string }[];
    brands: { name: string; slug: string }[];
  }> {
    if (!q || q.trim().length < 2) {
      return { products: [], categories: [], brands: [] };
    }

    const term = q.trim();

    const [products, categories, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { searchTags: { has: term.toLowerCase() } },
          ],
        },
        select: { name: true, slug: true },
        take: 5,
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: term, mode: 'insensitive' },
        },
        select: { name: true, slug: true },
        take: 3,
      }),
      this.prisma.brand.findMany({
        where: {
          isActive: true,
          name: { contains: term, mode: 'insensitive' },
        },
        select: { name: true, slug: true },
        take: 3,
      }),
    ]);

    return { products, categories, brands };
  }
}
