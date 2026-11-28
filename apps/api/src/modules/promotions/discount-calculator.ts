import { BadRequestException } from '@nestjs/common';
import { DiscountType, SellerDiscountStatus } from '@prisma/client';

export const ALLOWED_SELLER_DISCOUNT_TRANSITIONS: Record<
  SellerDiscountStatus,
  SellerDiscountStatus[]
> = {
  [SellerDiscountStatus.DRAFT]: [
    SellerDiscountStatus.SCHEDULED,
    SellerDiscountStatus.ACTIVE,
    SellerDiscountStatus.ENDED,
  ],
  [SellerDiscountStatus.SCHEDULED]: [
    SellerDiscountStatus.ACTIVE,
    SellerDiscountStatus.PAUSED,
    SellerDiscountStatus.EXPIRED,
    SellerDiscountStatus.ENDED,
  ],
  [SellerDiscountStatus.ACTIVE]: [
    SellerDiscountStatus.PAUSED,
    SellerDiscountStatus.EXPIRED,
    SellerDiscountStatus.ENDED,
  ],
  [SellerDiscountStatus.PAUSED]: [
    SellerDiscountStatus.ACTIVE,
    SellerDiscountStatus.SCHEDULED,
    SellerDiscountStatus.EXPIRED,
    SellerDiscountStatus.ENDED,
  ],
  [SellerDiscountStatus.EXPIRED]: [],
  [SellerDiscountStatus.ENDED]: [],
};

export function assertValidSellerDiscountTransition(
  from: SellerDiscountStatus,
  to: SellerDiscountStatus,
): void {
  if (from === to) return;
  const allowed = ALLOWED_SELLER_DISCOUNT_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new BadRequestException({
      code: 'INVALID_DISCOUNT_TRANSITION',
      message: `Cannot transition discount from ${from} to ${to}.`,
    });
  }
}

export function toPaise(amount: number | string | { toString(): string }): number {
  const num = typeof amount === 'number' ? amount : Number(amount.toString());
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export interface DiscountCandidate {
  id: string;
  title?: string | null;
  discountType: DiscountType;
  discountValue: number | string | { toString(): string };
  status: SellerDiscountStatus;
  startsAt: Date | string;
  expiresAt: Date | string;
}

export function isSellerDiscountCurrentlyValid(
  d: DiscountCandidate,
  now: Date = new Date(),
): boolean {
  if (d.status !== SellerDiscountStatus.ACTIVE && d.status !== SellerDiscountStatus.SCHEDULED) {
    return false;
  }
  const starts = new Date(d.startsAt);
  const expires = new Date(d.expiresAt);
  return starts <= now && expires > now;
}

export function computeDiscountedPricePaise(params: {
  baseSellingPricePaise: number;
  mrpPaise: number;
  discountType: DiscountType;
  discountValue: number;
}): { discountPaise: number; effectivePricePaise: number } {
  const { baseSellingPricePaise, mrpPaise, discountType, discountValue } = params;
  if (baseSellingPricePaise <= 0) {
    return { discountPaise: 0, effectivePricePaise: 0 };
  }

  let rawDiscountPaise = 0;
  if (discountType === DiscountType.PERCENTAGE) {
    rawDiscountPaise = Math.round((baseSellingPricePaise * discountValue) / 100);
  } else {
    rawDiscountPaise = Math.round(discountValue * 100);
  }

  // Ensure effective selling price is at least ₹1.00 (100 paise) and <= MRP
  const maxAllowedDiscount = Math.max(0, baseSellingPricePaise - 100);
  const clampedDiscountPaise = Math.min(Math.max(0, rawDiscountPaise), maxAllowedDiscount);
  let effectivePricePaise = baseSellingPricePaise - clampedDiscountPaise;
  if (mrpPaise > 0 && effectivePricePaise > mrpPaise) {
    effectivePricePaise = mrpPaise;
  }

  return {
    discountPaise: baseSellingPricePaise - effectivePricePaise,
    effectivePricePaise,
  };
}

export interface EffectiveListingPriceResult {
  baseSellingPrice: number;
  effectiveSellingPrice: number;
  sellerDiscountAmount: number;
  mrp: number;
  discountPercentFromMrp: number;
  appliedSellerDiscountId: string | null;
  appliedSellerDiscountTitle: string | null;
}

/**
 * Authoritative resolver for a SellerProduct listing's live price.
 * Evaluates active/scheduled SellerProductDiscount records against server time.
 */
export function resolveEffectiveListingPrice(params: {
  baseSellingPrice: number | string | { toString(): string };
  mrp?: number | string | { toString(): string } | null;
  discounts?: DiscountCandidate[];
  now?: Date;
}): EffectiveListingPriceResult {
  const now = params.now || new Date();
  const basePaise = toPaise(params.baseSellingPrice);
  const mrpPaise = params.mrp ? toPaise(params.mrp) : basePaise;
  const effectiveMrpPaise = Math.max(mrpPaise, basePaise);

  let bestDiscountId: string | null = null;
  let bestDiscountTitle: string | null = null;
  let bestDiscountPaise = 0;
  let bestEffectivePaise = basePaise;

  for (const d of params.discounts || []) {
    if (!isSellerDiscountCurrentlyValid(d, now)) continue;
    const calc = computeDiscountedPricePaise({
      baseSellingPricePaise: basePaise,
      mrpPaise: effectiveMrpPaise,
      discountType: d.discountType,
      discountValue: Number(d.discountValue.toString()),
    });
    if (calc.discountPaise > bestDiscountPaise) {
      bestDiscountPaise = calc.discountPaise;
      bestEffectivePaise = calc.effectivePricePaise;
      bestDiscountId = d.id;
      bestDiscountTitle = d.title ?? null;
    }
  }

  const discountPercentFromMrp =
    effectiveMrpPaise > bestEffectivePaise && effectiveMrpPaise > 0
      ? Math.round(((effectiveMrpPaise - bestEffectivePaise) / effectiveMrpPaise) * 100)
      : 0;

  return {
    baseSellingPrice: fromPaise(basePaise),
    effectiveSellingPrice: fromPaise(bestEffectivePaise),
    sellerDiscountAmount: fromPaise(bestDiscountPaise),
    mrp: fromPaise(effectiveMrpPaise),
    discountPercentFromMrp,
    appliedSellerDiscountId: bestDiscountId,
    appliedSellerDiscountTitle: bestDiscountTitle,
  };
}
