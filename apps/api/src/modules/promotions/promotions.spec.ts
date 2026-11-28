import { BadRequestException } from '@nestjs/common';
import { DiscountType, SellerDiscountStatus } from '@prisma/client';
import {
  assertValidSellerDiscountTransition,
  computeDiscountedPricePaise,
  resolveEffectiveListingPrice,
} from './discount-calculator';

describe('Phase 15 — Promotions & Seller Discounts Unit Suite', () => {
  describe('Discount Calculator', () => {
    it('computes percentage and flat discounts in integer paise without negative prices', () => {
      const pct = computeDiscountedPricePaise({
        baseSellingPricePaise: 25000,
        mrpPaise: 30000,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
      });
      expect(pct).toEqual({ discountPaise: 5000, effectivePricePaise: 20000 });

      // Clamps to ₹1.00 (100 paise) minimum
      const extremeFlat = computeDiscountedPricePaise({
        baseSellingPricePaise: 5000,
        mrpPaise: 6000,
        discountType: DiscountType.FLAT,
        discountValue: 100,
      });
      expect(extremeFlat).toEqual({ discountPaise: 4900, effectivePricePaise: 100 });
    });

    it('resolves only currently active discounts within start/expiry window', () => {
      const now = new Date('2026-11-28T10:00:00.000Z');
      const res = resolveEffectiveListingPrice({
        baseSellingPrice: 200,
        mrp: 250,
        now,
        discounts: [
          {
            id: 'd-expired',
            discountType: DiscountType.PERCENTAGE,
            discountValue: 50,
            status: SellerDiscountStatus.ACTIVE,
            startsAt: new Date('2026-11-20T00:00:00.000Z'),
            expiresAt: new Date('2026-11-27T00:00:00.000Z'),
          },
          {
            id: 'd-paused',
            discountType: DiscountType.PERCENTAGE,
            discountValue: 40,
            status: SellerDiscountStatus.PAUSED,
            startsAt: new Date('2026-11-20T00:00:00.000Z'),
            expiresAt: new Date('2026-12-05T00:00:00.000Z'),
          },
          {
            id: 'd-valid',
            title: 'Fresh 10%',
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            status: SellerDiscountStatus.ACTIVE,
            startsAt: new Date('2026-11-28T00:00:00.000Z'),
            expiresAt: new Date('2026-12-05T00:00:00.000Z'),
          },
        ],
      });

      expect(res.effectiveSellingPrice).toBe(180);
      expect(res.sellerDiscountAmount).toBe(20);
      expect(res.appliedSellerDiscountId).toBe('d-valid');
      expect(res.discountPercentFromMrp).toBe(28);
    });
  });

  describe('Discount Lifecycle Transitions', () => {
    it('enforces valid lifecycle transitions and blocks terminal overwrites', () => {
      expect(() =>
        assertValidSellerDiscountTransition(
          SellerDiscountStatus.DRAFT,
          SellerDiscountStatus.ACTIVE,
        ),
      ).not.toThrow();

      expect(() =>
        assertValidSellerDiscountTransition(
          SellerDiscountStatus.ENDED,
          SellerDiscountStatus.ACTIVE,
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        assertValidSellerDiscountTransition(
          SellerDiscountStatus.EXPIRED,
          SellerDiscountStatus.PAUSED,
        ),
      ).toThrow(BadRequestException);
    });
  });
});
