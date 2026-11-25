import { BadRequestException, Injectable } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';

export interface DeliveryFeeTier {
  minKm: number;
  maxKm: number;
  fee: number;
}

export interface PlatformPricingConfig {
  minimumOrderValuePaise: number | null;
  defaultDeliveryFeePaise: number;
  freeDeliveryThresholdPaise: number | null;
  deliveryFeeTiers: DeliveryFeeTier[];
  maxCartItemQuantity: number;
  taxRatePercent: number;
}

export interface CouponEvaluationResult {
  couponId: string;
  code: string;
  discountPaise: number;
  description: string | null;
}

export interface DeliveryEvaluationResult {
  isServiceable: boolean;
  distanceKm: number | null;
  deliveryFeePaise: number;
  reason?: string;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  toPaise(amount: number | string | Decimal | null | undefined): number {
    if (amount === null || amount === undefined) return 0;
    const num = typeof amount === 'number' ? amount : Number(amount.toString());
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * 100);
  }

  fromPaise(paise: number): number {
    return Math.round(paise) / 100;
  }

  private parseNumericSetting(val: unknown): number | null {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  async getPlatformPricingConfig(): Promise<PlatformPricingConfig> {
    const keys = [
      'minimum_order_value',
      'default_delivery_fee',
      'free_delivery_threshold',
      'delivery_fee_tiers',
      'max_cart_item_quantity',
      'tax_rate_percent',
    ];

    const settings = await this.prisma.platformSetting.findMany({
      where: { key: { in: keys } },
    });

    const map = new Map<string, unknown>(settings.map((s) => [s.key, s.value]));

    const movRaw = this.parseNumericSetting(map.get('minimum_order_value'));
    const defaultFeeRaw = this.parseNumericSetting(map.get('default_delivery_fee'));
    const freeThresholdRaw = this.parseNumericSetting(map.get('free_delivery_threshold'));
    const maxQtyRaw = this.parseNumericSetting(map.get('max_cart_item_quantity'));
    const taxRateRaw = this.parseNumericSetting(map.get('tax_rate_percent'));

    let deliveryFeeTiers: DeliveryFeeTier[] = [];
    const rawTiers = map.get('delivery_fee_tiers');
    if (Array.isArray(rawTiers)) {
      deliveryFeeTiers = rawTiers
        .filter(
          (t): t is DeliveryFeeTier =>
            typeof t === 'object' &&
            t !== null &&
            typeof (t as DeliveryFeeTier).minKm === 'number' &&
            typeof (t as DeliveryFeeTier).maxKm === 'number' &&
            typeof (t as DeliveryFeeTier).fee === 'number',
        )
        .sort((a, b) => a.minKm - b.minKm);
    }

    return {
      minimumOrderValuePaise: movRaw !== null && movRaw >= 0 ? this.toPaise(movRaw) : null,
      defaultDeliveryFeePaise:
        defaultFeeRaw !== null && defaultFeeRaw >= 0 ? this.toPaise(defaultFeeRaw) : 0,
      freeDeliveryThresholdPaise:
        freeThresholdRaw !== null && freeThresholdRaw > 0 ? this.toPaise(freeThresholdRaw) : null,
      deliveryFeeTiers,
      maxCartItemQuantity: maxQtyRaw !== null && maxQtyRaw >= 1 ? Math.floor(maxQtyRaw) : 99,
      taxRatePercent: taxRateRaw !== null && taxRateRaw >= 0 ? taxRateRaw : 0,
    };
  }

  evaluateDeliveryFee(params: {
    storeName: string;
    storeLat: number | null;
    storeLon: number | null;
    serviceRadiusKm: number | null;
    addressLat: number | null;
    addressLon: number | null;
    itemSubtotalPaise: number;
    config: PlatformPricingConfig;
  }): DeliveryEvaluationResult {
    const {
      storeName,
      storeLat,
      storeLon,
      serviceRadiusKm,
      addressLat,
      addressLon,
      itemSubtotalPaise,
      config,
    } = params;

    if (
      storeLat === null ||
      storeLon === null ||
      addressLat === null ||
      addressLon === null ||
      !Number.isFinite(storeLat) ||
      !Number.isFinite(storeLon) ||
      !Number.isFinite(addressLat) ||
      !Number.isFinite(addressLon)
    ) {
      return {
        isServiceable: false,
        distanceKm: null,
        deliveryFeePaise: 0,
        reason: 'Delivery address or store coordinates are missing or invalid.',
      };
    }

    const distanceKm = this.storesService.calculateDistanceKm(
      storeLat,
      storeLon,
      addressLat,
      addressLon,
    );

    if (serviceRadiusKm !== null && distanceKm > serviceRadiusKm) {
      return {
        isServiceable: false,
        distanceKm,
        deliveryFeePaise: 0,
        reason: `Your delivery address is ${distanceKm} km away, outside ${storeName}'s ${serviceRadiusKm} km delivery radius.`,
      };
    }

    if (
      config.freeDeliveryThresholdPaise !== null &&
      itemSubtotalPaise >= config.freeDeliveryThresholdPaise
    ) {
      return {
        isServiceable: true,
        distanceKm,
        deliveryFeePaise: 0,
      };
    }

    if (config.deliveryFeeTiers.length > 0) {
      const matchedTier = config.deliveryFeeTiers.find(
        (t) => distanceKm >= t.minKm && distanceKm <= t.maxKm,
      );
      if (matchedTier) {
        return {
          isServiceable: true,
          distanceKm,
          deliveryFeePaise: this.toPaise(matchedTier.fee),
        };
      }
    }

    return {
      isServiceable: true,
      distanceKm,
      deliveryFeePaise: config.defaultDeliveryFeePaise,
    };
  }

  async validateCoupon(params: {
    code: string;
    userId: string;
    itemSubtotalPaise: number;
  }): Promise<CouponEvaluationResult> {
    const normalizedCode = params.code.trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException({
        code: 'INVALID_COUPON',
        message: 'Coupon code cannot be empty.',
      });
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException({
        code: 'INVALID_COUPON',
        message: `Coupon "${normalizedCode}" is invalid or inactive.`,
      });
    }

    const now = new Date();
    if (now < coupon.startsAt) {
      throw new BadRequestException({
        code: 'COUPON_NOT_STARTED',
        message: `Coupon "${normalizedCode}" is not active yet.`,
      });
    }

    if (now > coupon.expiresAt) {
      throw new BadRequestException({
        code: 'COUPON_EXPIRED',
        message: `Coupon "${normalizedCode}" has expired.`,
      });
    }

    const minOrderPaise = this.toPaise(coupon.minimumOrderAmount);
    if (params.itemSubtotalPaise < minOrderPaise) {
      const remaining = this.fromPaise(minOrderPaise - params.itemSubtotalPaise);
      throw new BadRequestException({
        code: 'COUPON_MIN_ORDER_NOT_MET',
        message: `Add ₹${remaining.toFixed(2).replace(/\.00$/, '')} more to apply coupon "${normalizedCode}".`,
      });
    }

    if (coupon.usageLimit !== null) {
      const totalUsages = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id },
      });
      if (totalUsages >= coupon.usageLimit) {
        throw new BadRequestException({
          code: 'COUPON_USAGE_LIMIT_REACHED',
          message: `Coupon "${normalizedCode}" has reached its maximum usage limit.`,
        });
      }
    }

    const userUsages = await this.prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId: params.userId,
      },
    });
    if (userUsages >= coupon.perUserLimit) {
      throw new BadRequestException({
        code: 'COUPON_USER_LIMIT_REACHED',
        message: `You have already used coupon "${normalizedCode}" the maximum number of times.`,
      });
    }

    let discountPaise = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      const pct = Number(coupon.discountValue.toString());
      discountPaise = Math.round((params.itemSubtotalPaise * pct) / 100);
    } else {
      discountPaise = this.toPaise(coupon.discountValue);
    }

    if (coupon.maximumDiscount !== null) {
      discountPaise = Math.min(discountPaise, this.toPaise(coupon.maximumDiscount));
    }

    discountPaise = Math.max(0, Math.min(discountPaise, params.itemSubtotalPaise));

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountPaise,
      description: coupon.description,
    };
  }
}
