import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SellerStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from './stores.service';

describe('StoresService', () => {
  let service: StoresService;

  const mockPrisma = {
    seller: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    sellerProduct: {
      findMany: jest.fn(),
    },
    review: {
      groupBy: jest.fn(),
    },
    platformSetting: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoresService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<StoresService>(StoresService);
    jest.clearAllMocks();
    mockPrisma.review.groupBy.mockResolvedValue([]);
    mockPrisma.platformSetting.findUnique.mockResolvedValue(null);
  });

  describe('calculateDistanceKm', () => {
    it('computes 0 km for identical coordinates and accurate Bengaluru distance', () => {
      expect(service.calculateDistanceKm(12.9784, 77.6408, 12.9784, 77.6408)).toBe(0);
      const dist = service.calculateDistanceKm(12.9784, 77.6408, 12.9352, 77.6245);
      expect(dist).toBeGreaterThan(4.5);
      expect(dist).toBeLessThan(5.6);
    });
  });

  describe('evaluateStoreOperationalStatus', () => {
    it('marks non-approved or suspended stores as unavailable', () => {
      const suspended = service.evaluateStoreOperationalStatus({
        status: SellerStatus.SUSPENDED,
        profile: {},
        businessHours: [],
      });
      expect(suspended.isApproved).toBe(false);
      expect(suspended.isOpen).toBe(false);
      expect(suspended.isAcceptingOrders).toBe(false);
      expect(suspended.operationalStatusLabel).toBe('Suspended');
    });

    it('marks 00:00-23:59 open stores as accepting orders in IST', () => {
      const noonIst = new Date('2026-11-25T06:30:00.000Z'); // 12:00 IST (Wednesday = 3)
      const status = service.evaluateStoreOperationalStatus(
        {
          status: SellerStatus.APPROVED,
          profile: { openingTime: '07:00', closingTime: '22:00' },
          businessHours: [
            { dayOfWeek: 3, openingTime: '07:00', closingTime: '22:00', isClosed: false },
          ],
        },
        noonIst,
      );
      expect(status.isOpen).toBe(true);
      expect(status.isAcceptingOrders).toBe(true);
      expect(status.operationalStatusLabel).toBe('Open');
    });

    it('marks store closing within 30 minutes as Closing Soon', () => {
      const eveningIst = new Date('2026-11-25T16:15:00.000Z'); // 21:45 IST (Wednesday = 3)
      const status = service.evaluateStoreOperationalStatus(
        {
          status: SellerStatus.APPROVED,
          profile: { openingTime: '07:00', closingTime: '22:00' },
          businessHours: [
            { dayOfWeek: 3, openingTime: '07:00', closingTime: '22:00', isClosed: false },
          ],
        },
        eveningIst,
      );
      expect(status.isOpen).toBe(true);
      expect(status.isClosingSoon).toBe(true);
      expect(status.closingSoonMinutes).toBe(15);
      expect(status.operationalStatusLabel).toBe('Closing Soon');
    });
  });

  describe('findNearbyStores', () => {
    it('returns empty list when no location params are given (never fabricates local stores)', async () => {
      const stores = await service.findNearbyStores({});
      expect(stores).toEqual([]);
      expect(mockPrisma.seller.findMany).not.toHaveBeenCalled();
    });

    it('filters eligible stores by postal code or radius and excludes unserviceable stores', async () => {
      mockPrisma.seller.findMany.mockResolvedValue([
        {
          id: 's-1',
          businessName: 'Fresh Farms',
          storeDisplayName: 'Fresh Farms - Indiranagar',
          slug: 'fresh-farms-indiranagar',
          status: SellerStatus.APPROVED,
          profile: {
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            latitude: 12.9784,
            longitude: 77.6408,
            serviceRadiusKm: 5,
            preparationTime: 15,
            openingTime: '00:00',
            closingTime: '23:59',
          },
          businessHours: [],
          serviceAreas: [
            { postalCode: '560038', radiusKm: 5, isActive: true, latitude: null, longitude: null },
          ],
          _count: { listings: 12 },
        },
        {
          id: 's-2',
          businessName: 'Far Away Mart',
          storeDisplayName: 'Far Away Mart',
          slug: 'far-away-mart',
          status: SellerStatus.APPROVED,
          profile: {
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            latitude: 19.076,
            longitude: 72.8777,
            serviceRadiusKm: 5,
            preparationTime: 20,
            openingTime: '00:00',
            closingTime: '23:59',
          },
          businessHours: [],
          serviceAreas: [
            { postalCode: '400001', radiusKm: 5, isActive: true, latitude: null, longitude: null },
          ],
          _count: { listings: 5 },
        },
      ]);

      const stores = await service.findNearbyStores({ postalCode: '560038' });
      expect(stores).toHaveLength(1);
      expect(stores[0].id).toBe('s-1');
      expect(stores[0].rating).toBeNull();
      expect(stores[0].minimumOrderValue).toBeNull();
    });
  });

  describe('getPublicStoreBySlug', () => {
    it('throws NotFoundException when store is missing or unapproved', async () => {
      mockPrisma.seller.findFirst.mockResolvedValue(null);
      await expect(service.getPublicStoreBySlug('unknown-store')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
