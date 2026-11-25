import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;

  const mockPrisma = {
    platformSetting: { findMany: jest.fn() },
    coupon: { findUnique: jest.fn() },
    couponUsage: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService, StoresService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PricingService>(PricingService);
    jest.clearAllMocks();
  });

  describe('paise arithmetic', () => {
    it('avoids floating-point artifacts like 19.19999999999999', () => {
      const p = service.toPaise(19.2);
      expect(p).toBe(1920);
      expect(service.fromPaise(p)).toBe(19.2);
    });
  });

  describe('evaluateDeliveryFee', () => {
    const baseConfig = {
      minimumOrderValuePaise: 14900,
      defaultDeliveryFeePaise: 2900,
      freeDeliveryThresholdPaise: 49900,
      deliveryFeeTiers: [
        { minKm: 0, maxKm: 1.5, fee: 15 },
        { minKm: 1.5, maxKm: 3, fee: 25 },
        { minKm: 3, maxKm: 5, fee: 35 },
      ],
      maxCartItemQuantity: 20,
      taxRatePercent: 0,
    };

    it('calculates distance-tiered delivery fee within radius', () => {
      const res = service.evaluateDeliveryFee({
        storeName: 'Fresh Mart',
        storeLat: 26.06,
        storeLon: 83.18,
        serviceRadiusKm: 5,
        addressLat: 26.065,
        addressLon: 83.185,
        itemSubtotalPaise: 25000,
        config: baseConfig,
      });

      expect(res.isServiceable).toBe(true);
      expect(res.distanceKm).toBeLessThan(1.5);
      expect(res.deliveryFeePaise).toBe(1500);
    });

    it('waives delivery fee above free delivery threshold', () => {
      const res = service.evaluateDeliveryFee({
        storeName: 'Fresh Mart',
        storeLat: 26.06,
        storeLon: 83.18,
        serviceRadiusKm: 5,
        addressLat: 26.065,
        addressLon: 83.185,
        itemSubtotalPaise: 50000,
        config: baseConfig,
      });

      expect(res.isServiceable).toBe(true);
      expect(res.deliveryFeePaise).toBe(0);
    });

    it('marks address unserviceable when outside store radius', () => {
      const res = service.evaluateDeliveryFee({
        storeName: 'Fresh Mart',
        storeLat: 26.06,
        storeLon: 83.18,
        serviceRadiusKm: 3,
        addressLat: 26.2,
        addressLon: 83.3,
        itemSubtotalPaise: 30000,
        config: baseConfig,
      });

      expect(res.isServiceable).toBe(false);
      expect(res.reason).toContain('outside Fresh Mart');
    });

    it('marks address unserviceable when coordinates are missing', () => {
      const res = service.evaluateDeliveryFee({
        storeName: 'Fresh Mart',
        storeLat: 26.06,
        storeLon: 83.18,
        serviceRadiusKm: 5,
        addressLat: null,
        addressLon: null,
        itemSubtotalPaise: 30000,
        config: baseConfig,
      });

      expect(res.isServiceable).toBe(false);
    });
  });

  describe('validateCoupon', () => {
    const activeCoupon = {
      id: 'coupon-1',
      code: 'SAVE20',
      description: '20% off up to ₹100',
      discountType: DiscountType.PERCENTAGE,
      discountValue: new Decimal(20),
      minimumOrderAmount: new Decimal(200),
      maximumDiscount: new Decimal(100),
      usageLimit: 100,
      perUserLimit: 1,
      startsAt: new Date(Date.now() - 60000),
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true,
    };

    it('applies percentage coupon capped at maximumDiscount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.couponUsage.count.mockResolvedValue(0);

      const res = await service.validateCoupon({
        code: 'save20',
        userId: 'user-1',
        itemSubtotalPaise: 80000, // ₹800 -> 20% = ₹160, capped at ₹100
      });

      expect(res.code).toBe('SAVE20');
      expect(res.discountPaise).toBe(10000);
    });

    it('rejects expired coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...activeCoupon,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.validateCoupon({ code: 'SAVE20', userId: 'user-1', itemSubtotalPaise: 50000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when below minimumOrderAmount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(activeCoupon);

      await expect(
        service.validateCoupon({ code: 'SAVE20', userId: 'user-1', itemSubtotalPaise: 15000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when per-user usage limit is reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(activeCoupon);
      mockPrisma.couponUsage.count
        .mockResolvedValueOnce(5) // global
        .mockResolvedValueOnce(1); // per-user

      await expect(
        service.validateCoupon({ code: 'SAVE20', userId: 'user-1', itemSubtotalPaise: 50000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
