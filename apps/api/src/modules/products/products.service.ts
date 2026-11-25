import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ProductStatus, Seller, SellerStatus } from '@prisma/client';
import {
  PaginatedResponse,
  ProductCardItem,
  ProductDetailItem,
  ProductVariantItem,
  SearchSuggestionProductItem,
  SearchSuggestionsResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { QueryCatalogProductsDto } from './dto';

// Common Indian quick-commerce localized synonyms dictionary
const SEARCH_SYNONYMS: Record<string, string[]> = {
  doodh: ['milk', 'dairy', 'taaza', 'toned'],
  milk: ['doodh', 'taaza', 'toned', 'cow milk'],
  atta: ['flour', 'wheat', 'sharbati', 'aashirvaad'],
  flour: ['atta', 'maida', 'suji'],
  dahi: ['curd', 'yogurt'],
  curd: ['dahi'],
  makkhan: ['butter'],
  butter: ['makkhan', 'amul'],
  tel: ['oil', 'mustard', 'sunflower', 'refined'],
  oil: ['tel', 'cooking oil', 'fortune', 'sunflower'],
  chawal: ['rice', 'basmati'],
  rice: ['chawal', 'basmati'],
  cheeni: ['sugar'],
  sugar: ['cheeni'],
  namak: ['salt'],
  salt: ['namak'],
  chai: ['tea', 'tata tea'],
  tea: ['chai', 'tata tea'],
  biscuit: ['biscuits', 'cookies', 'rusk', 'parle'],
  chips: ['namkeen', 'crisps', 'snack', 'lays', 'kurkure'],
  namkeen: ['mixture', 'sev', 'bhujia', 'chips'],
  aloo: ['potato', 'potatoes'],
  potato: ['aloo'],
  pyaz: ['onion', 'onions'],
  onion: ['pyaz'],
  tamatar: ['tomato', 'tomatoes'],
  tomato: ['tamatar'],
  dhaniya: ['coriander'],
  coriander: ['dhaniya'],
  matar: ['peas', 'green peas', 'safal'],
  peas: ['matar'],
  sabzi: ['vegetable', 'vegetables'],
  phal: ['fruit', 'fruits', 'apple'],
  seb: ['apple', 'apples'],
  apple: ['seb', 'royal gala'],
  mirch: ['capsicum', 'chilli', 'pepper'],
  capsicum: ['shimla mirch', 'mirch'],
  shimla: ['capsicum'],
  bread: ['sourdough', 'loaf', 'bakery'],
  soap: ['dettol', 'bathing soap'],
  juice: ['orange juice', 'real activ', 'cold drink'],
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => StoresService))
    private readonly storesService?: StoresService,
  ) {}

  /**
   * Computes bounded Levenshtein edit distance for simple search typo tolerance.
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 0; i < a.length; i++) {
      const curr = [i + 1];
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        curr.push(Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost));
      }
      for (let j = 0; j < prev.length; j++) {
        prev[j] = curr[j];
      }
    }
    return prev[b.length];
  }

  /**
   * Resolves the customer's serviceable store ONLY when explicit storeId or location is supplied.
   * Strictly NEVER falls back to an arbitrary flagship store when location is missing or unserviceable.
   */
  async resolveServiceableStore(options?: {
    storeId?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<
    (Seller & { profile?: any; businessHours?: any[]; distanceKm?: number | null }) | null
  > {
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
      return store || null;
    }

    const hasPostal = Boolean(options?.postalCode && options.postalCode.trim());
    const hasCoords =
      options?.latitude !== undefined &&
      options?.longitude !== undefined &&
      Number.isFinite(options.latitude) &&
      Number.isFinite(options.longitude);

    if (!hasPostal && !hasCoords) {
      return null;
    }

    // Use StoresService for accurate radius + PIN + operational hours prioritization
    if (this.storesService) {
      const nearby = await this.storesService.findNearbyStores({
        postalCode: options?.postalCode,
        latitude: options?.latitude,
        longitude: options?.longitude,
      });

      if (nearby.length === 0) {
        return null;
      }

      const best = nearby[0];
      const storeRecord = await this.prisma.seller.findFirst({
        where: { id: best.id },
        include: { profile: true },
      });
      if (!storeRecord) return null;
      return { ...storeRecord, distanceKm: best.distanceKm };
    }

    // Direct DB PIN fallback when StoresService is omitted (e.g. isolated unit tests)
    if (hasPostal) {
      const serviceArea = await this.prisma.sellerServiceArea.findFirst({
        where: {
          postalCode: options!.postalCode!.trim(),
          isActive: true,
          seller: {
            status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
          },
        },
        include: {
          seller: { include: { profile: true } },
        },
      });
      return serviceArea?.seller || null;
    }

    return null;
  }

  /**
   * Builds store metadata snapshot with real operational status & distance-aware delivery ETA.
   */
  private async buildStoreContextSummary(
    store: (Seller & { profile?: any; distanceKm?: number | null }) | null,
  ) {
    if (!store) return null;

    if (this.storesService) {
      // Load businessHours if not present for accurate open/closed evaluation
      const sellerWithHours = await this.prisma.seller.findUnique({
        where: { id: store.id },
        include: { profile: true, businessHours: { orderBy: { dayOfWeek: 'asc' } } },
      });
      const target = sellerWithHours || store;
      const op = this.storesService.evaluateStoreOperationalStatus(target);
      const eta = this.storesService.computeDeliveryEstimate(
        target.profile?.preparationTime,
        store.distanceKm ?? null,
        op.isOpen,
        op.isAcceptingOrders,
      );

      return {
        id: store.id,
        name: target.storeDisplayName || target.businessName,
        slug: target.slug,
        deliveryTimeMinutes: eta.deliveryTimeMinutes,
        isOpen: op.isOpen,
        isAcceptingOrders: op.isAcceptingOrders,
        operationalStatusLabel: op.operationalStatusLabel,
      };
    }

    return {
      id: store.id,
      name:
        (store as any).profile?.storeDisplayName || store.storeDisplayName || store.businessName,
      slug: store.slug,
      deliveryTimeMinutes: (store as any).profile?.preparationTime
        ? (store as any).profile.preparationTime + 10
        : 15,
      isOpen: true,
      isAcceptingOrders: true,
      operationalStatusLabel: 'Open',
    };
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

    const hasLocationContext = Boolean(
      query.storeId ||
      query.postalCode?.trim() ||
      (query.latitude !== undefined && query.longitude !== undefined),
    );

    // 1. Resolve store context
    const store = await this.resolveServiceableStore({
      storeId: query.storeId,
      postalCode: query.postalCode,
      latitude: query.latitude,
      longitude: query.longitude,
    });

    const storeSummary = await this.buildStoreContextSummary(store);

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

    // Free text keyword search with multi-word token + synonym expansion
    const baseWhereWithoutSearch = { ...where };
    const trimmedSearch = query.q?.trim().toLowerCase() || '';

    if (trimmedSearch) {
      const tokens = trimmedSearch.split(/\s+/).filter(Boolean);
      const tokenClauses = tokens.map((token) => {
        const synonyms = SEARCH_SYNONYMS[token] || [];
        const terms = Array.from(new Set([token, ...synonyms]));
        return {
          OR: terms.flatMap((word) => [
            { name: { contains: word, mode: 'insensitive' } },
            { brand: { contains: word, mode: 'insensitive' } },
            { description: { contains: word, mode: 'insensitive' } },
            { shortDescription: { contains: word, mode: 'insensitive' } },
            { category: { name: { contains: word, mode: 'insensitive' } } },
            { searchTags: { has: word } },
          ]),
        };
      });

      where.AND = [...(where.AND || []), ...tokenClauses];
    }

    const productInclude: any = {
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
                deletedAt: null,
              },
              include: {
                inventory: {
                  select: {
                    availableQuantity: true,
                    reservedQuantity: true,
                    lowStockThreshold: true,
                  },
                },
              },
            },
          }
        : {}),
    };

    // 3. Query Master Products with Variants & Images
    let [, rawProducts] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Fuzzy typo fallback when exact token search returns zero results
    if (trimmedSearch && rawProducts.length === 0 && trimmedSearch.length >= 3) {
      const allActive = await this.prisma.product.findMany({
        where: baseWhereWithoutSearch,
        include: productInclude,
        take: 150,
      });

      const searchWords = trimmedSearch.split(/\s+/).filter((w) => w.length >= 3);
      rawProducts = allActive.filter((prod) => {
        const candidateTokens = [
          ...prod.name.toLowerCase().split(/\s+/),
          ...(prod.brand ? prod.brand.toLowerCase().split(/\s+/) : []),
          ...(prod.searchTags || []).map((t) => t.toLowerCase()),
        ].filter((w) => w.length >= 3);

        return searchWords.some((sw) =>
          candidateTokens.some((ct) => {
            if (ct.includes(sw) || sw.includes(ct)) return true;
            const maxDist = sw.length >= 6 ? 2 : 1;
            return this.levenshteinDistance(sw, ct) <= maxDist;
          }),
        );
      });
    }

    const catalogTotalCount = rawProducts.length;

    // 4. Map & Merge Master Products with Store-Specific Pricing and Stock
    const mappedCards: ProductCardItem[] = [];

    for (const prod of rawProducts as any[]) {
      if (!prod.variants || prod.variants.length === 0) continue;

      const storeListingsMap = new Map<string, any>();
      if (store && prod.sellerProducts) {
        for (const sp of prod.sellerProducts) {
          const key = sp.variantId || 'DEFAULT';
          storeListingsMap.set(key, sp);
        }
      }

      if (query.onlyStoreListed && storeListingsMap.size === 0) {
        continue;
      }

      let maxLowStockThreshold = 5;

      const mappedVariants: ProductVariantItem[] = prod.variants.map((v: any) => {
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
          const storeAccepting = storeSummary
            ? storeSummary.isAcceptingOrders && storeSummary.isOpen
            : true;
          isAvailable = availableQuantity > 0 && storeAccepting;
          sellerProductId = storeListing.id;
          if (storeListing.inventory?.lowStockThreshold) {
            maxLowStockThreshold = storeListing.inventory.lowStockThreshold;
          }
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
          images: (v.images || []).map((img: any) => ({
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

      // Prefer the first available variant as the default!
      const defaultVariant =
        mappedVariants.find((v) => v.isAvailable && (v.availableQuantity ?? 0) > 0) ||
        mappedVariants.find((v) => Boolean(v.sellerProductId)) ||
        mappedVariants[0];

      if (
        query.inStockOnly &&
        (!defaultVariant.isAvailable || (defaultVariant.availableQuantity ?? 0) <= 0)
      ) {
        continue;
      }

      if (query.minPrice !== undefined && defaultVariant.sellingPrice! < query.minPrice) {
        continue;
      }
      if (query.maxPrice !== undefined && defaultVariant.sellingPrice! > query.maxPrice) {
        continue;
      }

      if (query.minDiscount !== undefined && defaultVariant.discountPercent! < query.minDiscount) {
        continue;
      }

      const availQty = defaultVariant.availableQuantity ?? 0;
      const isAvail = Boolean(defaultVariant.isAvailable && availQty > 0);
      const isLowStock = isAvail && availQty > 0 && availQty <= maxLowStockThreshold;

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
        store: storeSummary,
        mrp: defaultVariant.mrp,
        sellingPrice: defaultVariant.sellingPrice!,
        discountPercent: defaultVariant.discountPercent!,
        availableQuantity: availQty,
        isAvailable: isAvail,
        lowStockThreshold: maxLowStockThreshold,
        isLowStock,
        searchTags: prod.searchTags || [],
      });
    }

    // 5. Partition In-Stock ahead of Out-Of-Stock (when store resolved) + Apply Sorting
    const compareCards = (a: ProductCardItem, b: ProductCardItem): number => {
      if (store) {
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }
      }
      if (query.sort === 'price_asc') {
        return a.sellingPrice - b.sellingPrice;
      }
      if (query.sort === 'price_desc') {
        return b.sellingPrice - a.sellingPrice;
      }
      if (query.sort === 'discount_desc') {
        return b.discountPercent - a.discountPercent;
      }
      return 0;
    };

    mappedCards.sort(compareCards);

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
      metaInfo: {
        hasLocationContext,
        isServiceable: Boolean(store),
        storeId: store?.id || null,
        storeName: storeSummary?.name || null,
        storeSlug: store?.slug || null,
        catalogTotalCount,
      },
    };
  }

  /**
   * Customer Storefront: Retrieves full product details by URL slug with store-specific pricing.
   */
  async getProductBySlug(
    slug: string,
    options?: { storeId?: string; postalCode?: string; latitude?: number; longitude?: number },
  ): Promise<ProductDetailItem> {
    const store = await this.resolveServiceableStore(options);
    const storeSummary = await this.buildStoreContextSummary(store);

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
                where: { sellerId: store.id, status: 'ACTIVE', deletedAt: null },
                include: {
                  inventory: {
                    select: {
                      availableQuantity: true,
                      reservedQuantity: true,
                      lowStockThreshold: true,
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
        const storeAccepting = storeSummary
          ? storeSummary.isAcceptingOrders && storeSummary.isOpen
          : true;
        isAvailable = availableQuantity > 0 && storeAccepting;
        sellerProductId = storeListing.id;
      }

      if (mrp > 0 && sellingPrice < mrp) {
        discountPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
      }

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
      store: storeSummary
        ? {
            id: storeSummary.id,
            name: storeSummary.name,
            slug: storeSummary.slug,
            deliveryTimeMinutes: storeSummary.deliveryTimeMinutes ?? undefined,
          }
        : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  /**
   * Search Suggestions: Autocomplete across active products (with store pricing & ADD metadata),
   * brands, and categories. Supports Hinglish synonyms & location context.
   */
  async getSearchSuggestions(
    q: string,
    location?: { storeId?: string; postalCode?: string; latitude?: number; longitude?: number },
  ): Promise<SearchSuggestionsResponse> {
    if (!q || q.trim().length < 2) {
      return { products: [], categories: [], brands: [] };
    }

    const term = q.trim().toLowerCase();
    const synonyms = SEARCH_SYNONYMS[term] || [];
    const searchTerms = Array.from(new Set([term, ...synonyms]));

    const [catalogMatch, categories, brands] = await Promise.all([
      this.getCatalogProducts({
        q: term,
        limit: 5,
        page: 1,
        storeId: location?.storeId,
        postalCode: location?.postalCode,
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          OR: searchTerms.map((word) => ({ name: { contains: word, mode: 'insensitive' } })),
        },
        select: { name: true, slug: true },
        take: 4,
      }),
      this.prisma.brand.findMany({
        where: {
          isActive: true,
          OR: searchTerms.map((word) => ({ name: { contains: word, mode: 'insensitive' } })),
        },
        select: { name: true, slug: true },
        take: 4,
      }),
    ]);

    const products: SearchSuggestionProductItem[] = catalogMatch.items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      brand: item.brand,
      primaryImageUrl: item.primaryImageUrl,
      defaultVariantId: item.defaultVariant?.id,
      packSize: item.defaultVariant?.packSize || item.defaultVariant?.name || null,
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      discountPercent: item.discountPercent,
      availableQuantity: item.availableQuantity,
      isAvailable: item.isAvailable,
      sellerProductId: item.defaultVariant?.sellerProductId,
      storeId: item.store?.id || null,
      storeName: item.store?.name || null,
    }));

    return { products, categories, brands };
  }
}
