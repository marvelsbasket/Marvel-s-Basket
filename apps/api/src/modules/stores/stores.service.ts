import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductStatus, SellerProductStatus, SellerStatus } from '@prisma/client';
import { PublicStoreItem, StoreBusinessHourItem } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { QueryNearbyStoresDto } from './dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  /**
   * Evaluates current IST (Asia/Kolkata) day of week (0=Sunday..6=Saturday) and HH:MM minutes.
   */
  private getCurrentIstTime(now: Date = new Date()): {
    dayOfWeek: number;
    currentMinutes: number;
    dayNameShort: string;
  } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '12';
    const minuteStr = parts.find((p) => p.type === 'minute')?.value || '00';

    const hour = parseInt(hourStr, 10) % 24;
    const minute = parseInt(minuteStr, 10);

    return {
      dayOfWeek: weekdayMap[weekdayStr] ?? 1,
      currentMinutes: hour * 60 + minute,
      dayNameShort: weekdayStr,
    };
  }

  private parseHhMmToMinutes(timeStr?: string | null): number | null {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  /**
   * Evaluates store operational state (Open, Closing Soon, Closed, Suspended/Unavailable).
   */
  evaluateStoreOperationalStatus(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seller: any,
    now: Date = new Date(),
  ): {
    isApproved: boolean;
    isOpen: boolean;
    isAcceptingOrders: boolean;
    isClosingSoon: boolean;
    closingSoonMinutes: number | null;
    operationalStatusLabel: string;
    openingTime: string | null;
    closingTime: string | null;
  } {
    const isApproved =
      seller.status === SellerStatus.APPROVED || seller.status === SellerStatus.APPROVED_ACTIVE;

    const fallbackOpen = seller.profile?.openingTime || null;
    const fallbackClose = seller.profile?.closingTime || null;

    if (!isApproved) {
      return {
        isApproved: false,
        isOpen: false,
        isAcceptingOrders: false,
        isClosingSoon: false,
        closingSoonMinutes: null,
        operationalStatusLabel:
          seller.status === SellerStatus.SUSPENDED ? 'Suspended' : 'Temporarily Unavailable',
        openingTime: fallbackOpen,
        closingTime: fallbackClose,
      };
    }

    const { dayOfWeek, currentMinutes, dayNameShort } = this.getCurrentIstTime(now);
    const businessHours: Array<{
      dayOfWeek: number;
      openingTime: string;
      closingTime: string;
      isClosed: boolean;
    }> = seller.businessHours || [];

    const todaySchedule = businessHours.find((h) => h.dayOfWeek === dayOfWeek);

    if (todaySchedule?.isClosed) {
      return {
        isApproved: true,
        isOpen: false,
        isAcceptingOrders: false,
        isClosingSoon: false,
        closingSoonMinutes: null,
        operationalStatusLabel: 'Closed Today',
        openingTime: todaySchedule.openingTime,
        closingTime: todaySchedule.closingTime,
      };
    }

    // Check profile weeklyOffDays string if no explicit SellerBusinessHours row marked closed
    const weeklyOffDays = (seller.profile?.weeklyOffDays || '').toLowerCase();
    if (
      !todaySchedule &&
      weeklyOffDays &&
      weeklyOffDays !== 'none' &&
      weeklyOffDays.includes(dayNameShort.toLowerCase())
    ) {
      return {
        isApproved: true,
        isOpen: false,
        isAcceptingOrders: false,
        isClosingSoon: false,
        closingSoonMinutes: null,
        operationalStatusLabel: 'Closed Today',
        openingTime: fallbackOpen,
        closingTime: fallbackClose,
      };
    }

    const effectiveOpenStr = todaySchedule?.openingTime || fallbackOpen;
    const effectiveCloseStr = todaySchedule?.closingTime || fallbackClose;
    const openMins = this.parseHhMmToMinutes(effectiveOpenStr);
    const closeMins = this.parseHhMmToMinutes(effectiveCloseStr);

    if (openMins !== null && closeMins !== null) {
      const isWithinHours =
        closeMins >= openMins
          ? currentMinutes >= openMins && currentMinutes < closeMins
          : currentMinutes >= openMins || currentMinutes < closeMins;

      if (!isWithinHours) {
        return {
          isApproved: true,
          isOpen: false,
          isAcceptingOrders: false,
          isClosingSoon: false,
          closingSoonMinutes: null,
          operationalStatusLabel: 'Closed',
          openingTime: effectiveOpenStr,
          closingTime: effectiveCloseStr,
        };
      }

      const remainingMinutes =
        closeMins >= currentMinutes
          ? closeMins - currentMinutes
          : 24 * 60 - currentMinutes + closeMins;

      const isClosingSoon = remainingMinutes > 0 && remainingMinutes <= 30;

      return {
        isApproved: true,
        isOpen: true,
        isAcceptingOrders: true,
        isClosingSoon,
        closingSoonMinutes: isClosingSoon ? remainingMinutes : null,
        operationalStatusLabel: isClosingSoon ? 'Closing Soon' : 'Open',
        openingTime: effectiveOpenStr,
        closingTime: effectiveCloseStr,
      };
    }

    // Approved store without restrictive hours configured defaults to Open
    return {
      isApproved: true,
      isOpen: true,
      isAcceptingOrders: true,
      isClosingSoon: false,
      closingSoonMinutes: null,
      operationalStatusLabel: 'Open',
      openingTime: effectiveOpenStr,
      closingTime: effectiveCloseStr,
    };
  }

  /**
   * Computes delivery ETA dynamically from preparationTime and customer-store distance.
   */
  computeDeliveryEstimate(
    preparationTime: number | null | undefined,
    distanceKm: number | null,
    isOpen: boolean,
    isAcceptingOrders: boolean,
  ): { deliveryTimeMinutes: number | null; deliveryEtaLabel: string | null } {
    if (!isOpen || !isAcceptingOrders) {
      return { deliveryTimeMinutes: null, deliveryEtaLabel: null };
    }

    const prepMins = preparationTime && preparationTime > 0 ? preparationTime : null;
    if (prepMins === null && distanceKm === null) {
      return { deliveryTimeMinutes: null, deliveryEtaLabel: null };
    }

    const basePrep = prepMins ?? 15;
    const effectiveDistance = distanceKm !== null ? distanceKm : 2.0;
    const travelMins = Math.max(5, Math.min(35, Math.round(effectiveDistance * 4)));
    const totalMins = basePrep + travelMins;

    return {
      deliveryTimeMinutes: totalMins,
      deliveryEtaLabel: `${totalMins}–${totalMins + 8} mins`,
    };
  }

  /**
   * Loads configured platform minimum order value if set in PlatformSettings.
   */
  private async getConfiguredMinimumOrderValue(): Promise<number | null> {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'minimum_order_value' },
    });
    if (!setting || setting.value === null || setting.value === undefined) {
      return null;
    }
    const parsed = Number(setting.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  /**
   * Loads aggregated real rating & review count for sellers from Review table.
   */
  private async getRatingsMap(
    sellerIds: string[],
  ): Promise<Map<string, { rating: number; reviewCount: number }>> {
    const map = new Map<string, { rating: number; reviewCount: number }>();
    if (sellerIds.length === 0) return map;

    const aggregates = await this.prisma.review.groupBy({
      by: ['sellerId'],
      where: {
        sellerId: { in: sellerIds },
        isPublished: true,
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    for (const row of aggregates) {
      if (row.sellerId && row._count.id > 0 && row._avg.rating !== null) {
        map.set(row.sellerId, {
          rating: Math.round(row._avg.rating * 10) / 10,
          reviewCount: row._count.id,
        });
      }
    }

    return map;
  }

  /**
   * Maps a Seller Prisma record with operational status, distance, delivery ETA, and rating.
   */
  mapPublicStore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seller: any,
    options: {
      distanceKm: number | null;
      ratingInfo?: { rating: number; reviewCount: number };
      minimumOrderValue: number | null;
      activeProductCount?: number;
      categories?: Array<{ id: string; name: string; slug: string; productCount: number }>;
    },
  ): PublicStoreItem {
    const opStatus = this.evaluateStoreOperationalStatus(seller);
    const { deliveryTimeMinutes, deliveryEtaLabel } = this.computeDeliveryEstimate(
      seller.profile?.preparationTime,
      options.distanceKm,
      opStatus.isOpen,
      opStatus.isAcceptingOrders,
    );

    const serviceRadiusKm = seller.profile?.serviceRadiusKm
      ? Number(seller.profile.serviceRadiusKm)
      : 5;

    const businessHours: StoreBusinessHourItem[] | undefined = seller.businessHours?.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (h: any) => ({
        dayOfWeek: h.dayOfWeek,
        openingTime: h.openingTime,
        closingTime: h.closingTime,
        isClosed: h.isClosed,
      }),
    );

    return {
      id: seller.id,
      slug: seller.slug,
      name: seller.storeDisplayName || seller.businessName,
      storeCategory: seller.storeCategory || null,
      description: seller.profile?.description || null,
      logoUrl: seller.profile?.logoUrl || null,
      bannerUrl: seller.profile?.bannerUrl || null,
      storefrontPhotoUrl: seller.profile?.storefrontPhotoUrl || null,
      city: seller.profile?.city || '',
      state: seller.profile?.state || '',
      postalCode: seller.profile?.postalCode || '',
      addressLine1: seller.profile?.addressLine1 || '',
      latitude: seller.profile?.latitude ? Number(seller.profile.latitude) : null,
      longitude: seller.profile?.longitude ? Number(seller.profile.longitude) : null,
      serviceRadiusKm,
      distanceKm: options.distanceKm,
      deliveryTimeMinutes,
      deliveryEtaLabel,
      isOpen: opStatus.isOpen,
      isAcceptingOrders: opStatus.isAcceptingOrders,
      isClosingSoon: opStatus.isClosingSoon,
      closingSoonMinutes: opStatus.closingSoonMinutes,
      operationalStatusLabel: opStatus.operationalStatusLabel,
      openingTime: opStatus.openingTime,
      closingTime: opStatus.closingTime,
      weeklyOffDays: seller.profile?.weeklyOffDays || null,
      rating: options.ratingInfo ? options.ratingInfo.rating : null,
      reviewCount: options.ratingInfo ? options.ratingInfo.reviewCount : 0,
      minimumOrderValue: options.minimumOrderValue,
      activeProductCount: options.activeProductCount,
      categories: options.categories,
      businessHours,
    };
  }

  /**
   * Finds all approved stores serving a given location (PIN code, coordinates, or city).
   * Strictly checks PIN code service area or Haversine radius — NEVER fabricates availability.
   */
  async findNearbyStores(query: QueryNearbyStoresDto): Promise<PublicStoreItem[]> {
    const postalCode = query.postalCode?.trim();
    const city = query.city?.trim();
    const hasCoords =
      query.latitude !== undefined &&
      query.longitude !== undefined &&
      Number.isFinite(query.latitude) &&
      Number.isFinite(query.longitude);

    // If no location filter provided at all, return empty list (never fabricate local stores)
    if (!postalCode && !hasCoords && !city) {
      return [];
    }

    const candidates = await this.prisma.seller.findMany({
      where: {
        status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
        deletedAt: null,
        ...(query.storeCategory ? { storeCategory: query.storeCategory } : {}),
      },
      include: {
        profile: true,
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        serviceAreas: { where: { isActive: true } },
        _count: {
          select: {
            listings: {
              where: { status: SellerProductStatus.ACTIVE, deletedAt: null },
            },
          },
        },
      },
    });

    const eligible: Array<{ seller: (typeof candidates)[0]; distanceKm: number | null }> = [];

    for (const seller of candidates) {
      const storeLat = seller.profile?.latitude ? Number(seller.profile.latitude) : null;
      const storeLng = seller.profile?.longitude ? Number(seller.profile.longitude) : null;
      const baseRadius = seller.profile?.serviceRadiusKm
        ? Number(seller.profile.serviceRadiusKm)
        : 5;

      let distanceKm: number | null = null;
      if (hasCoords && storeLat !== null && storeLng !== null) {
        distanceKm = this.calculateDistanceKm(
          query.latitude!,
          query.longitude!,
          storeLat,
          storeLng,
        );
      }

      // Check serviceability:
      // 1. PIN code matches an active SellerServiceArea or store's own postalCode
      const matchesPostal = postalCode
        ? seller.serviceAreas.some((sa) => sa.postalCode === postalCode) ||
          seller.profile?.postalCode === postalCode
        : false;

      // 2. Coordinate radius match: within store's serviceRadiusKm or a serviceArea's radiusKm
      let matchesRadius = false;
      if (hasCoords) {
        if (distanceKm !== null && distanceKm <= baseRadius) {
          matchesRadius = true;
        } else {
          for (const sa of seller.serviceAreas) {
            if (sa.latitude !== null && sa.longitude !== null) {
              const areaDist = this.calculateDistanceKm(
                query.latitude!,
                query.longitude!,
                Number(sa.latitude),
                Number(sa.longitude),
              );
              const areaRadius = sa.radiusKm ? Number(sa.radiusKm) : baseRadius;
              if (areaDist <= areaRadius) {
                matchesRadius = true;
                if (distanceKm === null || areaDist < distanceKm) {
                  distanceKm = areaDist;
                }
                break;
              }
            }
          }
        }
      }

      // 3. City match only when neither postalCode nor coordinates matched/blocked
      // Wait: if postalCode or coordinates ARE provided, require exact PIN or radius match!
      // Only use city match if customer explicitly searched by city without PIN/coords.
      const matchesCityOnly =
        !postalCode &&
        !hasCoords &&
        city &&
        seller.profile?.city?.toLowerCase() === city.toLowerCase();

      if (matchesPostal || matchesRadius || matchesCityOnly) {
        eligible.push({ seller, distanceKm });
      }
    }

    const sellerIds = eligible.map((e) => e.seller.id);
    const [ratingsMap, minOrderVal] = await Promise.all([
      this.getRatingsMap(sellerIds),
      this.getConfiguredMinimumOrderValue(),
    ]);

    const mapped = eligible.map(({ seller, distanceKm }) =>
      this.mapPublicStore(seller, {
        distanceKm,
        ratingInfo: ratingsMap.get(seller.id),
        minimumOrderValue: minOrderVal,
        activeProductCount: seller._count.listings,
      }),
    );

    // Sort: Open & accepting orders first, then closest distance, then most active listings
    mapped.sort((a, b) => {
      if (a.isAcceptingOrders !== b.isAcceptingOrders) {
        return a.isAcceptingOrders ? -1 : 1;
      }
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null && b.distanceKm === null) return -1;
      if (a.distanceKm === null && b.distanceKm !== null) return 1;
      return (b.activeProductCount ?? 0) - (a.activeProductCount ?? 0);
    });

    return mapped;
  }

  /**
   * Retrieves public storefront profile by slug or UUID, including store-scoped categories.
   */
  async getPublicStoreBySlug(
    slugOrId: string,
    customerCoords?: { latitude?: number; longitude?: number },
  ): Promise<PublicStoreItem> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const seller = await this.prisma.seller.findFirst({
      where: {
        OR: [...(isUuid ? [{ id: slugOrId }] : []), { slug: slugOrId }],
        deletedAt: null,
        // Never expose DRAFT, PENDING, or REJECTED onboarding stores publicly
        status: {
          in: [
            SellerStatus.APPROVED,
            SellerStatus.APPROVED_ACTIVE,
            SellerStatus.SUSPENDED,
            SellerStatus.CLOSED,
          ],
        },
      },
      include: {
        profile: true,
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!seller) {
      throw new NotFoundException(`Store '${slugOrId}' not found`);
    }

    let distanceKm: number | null = null;
    if (
      customerCoords?.latitude !== undefined &&
      customerCoords?.longitude !== undefined &&
      seller.profile?.latitude &&
      seller.profile?.longitude
    ) {
      distanceKm = this.calculateDistanceKm(
        customerCoords.latitude,
        customerCoords.longitude,
        Number(seller.profile.latitude),
        Number(seller.profile.longitude),
      );
    }

    // Fetch distinct categories of active products listed by this store
    const activeListings = await this.prisma.sellerProduct.findMany({
      where: {
        sellerId: seller.id,
        status: SellerProductStatus.ACTIVE,
        deletedAt: null,
        product: {
          status: ProductStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        productId: true,
        product: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                parent: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    // Count distinct products per L1/direct category for store navigation
    const catProductSets = new Map<
      string,
      { id: string; name: string; slug: string; productIds: Set<string> }
    >();

    for (const listing of activeListings) {
      const cat = listing.product.category.parent || listing.product.category;
      if (!catProductSets.has(cat.id)) {
        catProductSets.set(cat.id, {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          productIds: new Set(),
        });
      }
      catProductSets.get(cat.id)!.productIds.add(listing.productId);
    }

    const categories = Array.from(catProductSets.values()).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c.productIds.size,
    }));

    const distinctProductCount = new Set(activeListings.map((l) => l.productId)).size;

    const [ratingsMap, minOrderVal] = await Promise.all([
      this.getRatingsMap([seller.id]),
      this.getConfiguredMinimumOrderValue(),
    ]);

    return this.mapPublicStore(seller, {
      distanceKm,
      ratingInfo: ratingsMap.get(seller.id),
      minimumOrderValue: minOrderVal,
      activeProductCount: distinctProductCount,
      categories,
    });
  }
}
