import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryReservationService } from './inventory-reservation.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  ProductStatus,
  SellerProductStatus,
  SellerStatus,
  StockReservationStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('InventoryReservationService', () => {
  let service: InventoryReservationService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    seller: {
      findUnique: jest.fn(),
    },
    sellerProduct: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockReservation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    checkoutSession: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    inventoryTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(async (cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryReservationService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<InventoryReservationService>(InventoryReservationService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
    mockPrisma.stockReservation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.checkoutSession.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('revalidateCart', () => {
    it('should detect price changes and adjust unavailable quantities', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        businessName: 'Fresh Mart',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      // Product has selling price 50 (customer had 45 in basket)
      // and available quantity 2 (customer requested 5 in basket)
      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'listing-1',
        sellingPrice: new Decimal(50.0),
        status: SellerProductStatus.ACTIVE,
        product: { name: 'Amul Butter', status: ProductStatus.ACTIVE },
        variant: { name: '500g', packSize: '500g', isActive: true, mrp: new Decimal(60.0) },
        inventory: { id: 'inv-1', availableQuantity: 2 },
      });

      mockPrisma.stockReservation.findMany.mockResolvedValue([]);
      mockPrisma.inventory.findUnique.mockResolvedValue({ id: 'inv-1', availableQuantity: 2 });

      const res = await service.revalidateCart({
        storeId: 'store-1',
        items: [
          {
            variantId: 'var-1',
            quantity: 5,
            unitPrice: 45.0, // previous cart price was 45!
          },
        ],
      });

      expect(res.hasPriceChanges).toBe(true);
      expect(res.hasQuantityAdjustments).toBe(true);
      expect(res.items[0].requestedQuantity).toBe(5);
      expect(res.items[0].adjustedQuantity).toBe(2);
      expect(res.items[0].currentUnitPrice).toBe(50.0);
      expect(res.items[0].priceChanged).toBe(true);
      expect(res.items[0].message).toContain('Only 2 left');
    });
  });

  describe('createReservation', () => {
    const store = {
      id: 'store-1',
      status: SellerStatus.APPROVED_ACTIVE,
    };

    beforeEach(() => {
      mockPrisma.seller.findUnique.mockResolvedValue(store);
      mockPrisma.stockReservation.findMany.mockResolvedValue([]);
    });

    it('should atomically reserve stock when stock is sufficient', async () => {
      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'listing-1',
        sellingPrice: new Decimal(30.0),
        status: SellerProductStatus.ACTIVE,
        product: { name: 'Milk', status: ProductStatus.ACTIVE },
        variant: { name: '500ml', isActive: true },
        inventory: { id: 'inv-1' },
      });

      mockPrisma.$executeRaw.mockResolvedValue(0);
      // Atomic conditional update returns updated row
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'inv-1',
          stock_on_hand: 50,
          reserved_quantity: 2,
          available_quantity: 48,
        },
      ]);

      mockPrisma.stockReservation.create.mockResolvedValue({
        id: 'res-1',
        inventoryId: 'inv-1',
        quantity: 2,
        status: StockReservationStatus.ACTIVE,
        expiresAt: new Date(),
      });

      const res = await service.createReservation({
        storeId: 'store-1',
        checkoutSessionId: 'sess-123',
        idempotencyKey: 'idemp-abc',
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(res.status).toBe(StockReservationStatus.ACTIVE);
      expect(res.checkoutSessionId).toBe('sess-123');
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.stockReservation.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if atomic conditional update affects 0 rows (competing customer took stock)', async () => {
      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'listing-1',
        sellingPrice: new Decimal(30.0),
        status: SellerProductStatus.ACTIVE,
        product: { name: 'Milk', status: ProductStatus.ACTIVE },
        variant: { name: '500ml', isActive: true },
        inventory: { id: 'inv-1' },
      });

      mockPrisma.$executeRaw.mockResolvedValue(0);
      // Zero rows returned by conditional update
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.createReservation({
          storeId: 'store-1',
          checkoutSessionId: 'sess-123',
          idempotencyKey: 'idemp-abc',
          items: [{ variantId: 'var-1', quantity: 2 }],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should return existing reservation if idempotencyKey was previously processed', async () => {
      mockPrisma.stockReservation.findMany.mockResolvedValue([
        {
          id: 'existing-res-1',
          inventoryId: 'inv-1',
          quantity: 2,
          status: StockReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 600000),
          unitPrice: new Decimal(30.0),
          inventory: {
            sellerProductId: 'listing-1',
            sellerProduct: { variantId: 'var-1', sellingPrice: new Decimal(30.0) },
          },
        },
      ]);

      const res = await service.createReservation({
        storeId: 'store-1',
        checkoutSessionId: 'sess-123',
        idempotencyKey: 'idemp-duplicate',
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(res.reservationId).toBe('existing-res-1');
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('commitReservation', () => {
    it('should decrease stock on hand and reserved stock and transition status to COMMITTED', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        stockOnHand: 50,
        reservedQuantity: 2,
        availableQuantity: 48,
      });
      mockPrisma.stockReservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          inventoryId: 'inv-1',
          quantity: 2,
          status: StockReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 600000),
          inventory: {
            id: 'inv-1',
            stockOnHand: 50,
            reservedQuantity: 2,
            availableQuantity: 48,
            sellerProduct: { id: 'listing-1' },
          },
        },
      ]);

      const res = await service.commitReservation({
        checkoutSessionId: 'sess-123',
        idempotencyKey: 'commit-idemp',
      });

      expect(res.status).toBe(StockReservationStatus.COMMITTED);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          stockOnHand: 48, // 50 - 2
          reservedQuantity: 0, // 2 - 2
          availableQuantity: 48,
        },
      });
      expect(mockPrisma.stockReservation.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'res-1',
          status: StockReservationStatus.ACTIVE,
        }),
        data: expect.objectContaining({
          status: StockReservationStatus.COMMITTED,
        }),
      });
      expect(mockPrisma.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ORDER_COMMITTED',
            quantity: -2,
            stockBefore: 50,
            stockAfter: 48,
          }),
        }),
      );
    });

    it('should reject committing an expired reservation (Section 11)', async () => {
      mockPrisma.stockReservation.findMany.mockResolvedValue([
        {
          id: 'res-expired',
          status: StockReservationStatus.EXPIRED,
          inventory: { id: 'inv-1' },
        },
      ]);

      await expect(
        service.commitReservation({
          checkoutSessionId: 'sess-expired',
          idempotencyKey: 'commit-idemp',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseReservation', () => {
    it('should restore available stock and decrement reserved stock', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        stockOnHand: 50,
        reservedQuantity: 3,
        availableQuantity: 47,
        sellerProduct: { id: 'listing-1', status: SellerProductStatus.OUT_OF_STOCK },
      });
      mockPrisma.stockReservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          inventoryId: 'inv-1',
          quantity: 3,
          status: StockReservationStatus.ACTIVE,
          inventory: {
            id: 'inv-1',
            stockOnHand: 50,
            reservedQuantity: 3,
            availableQuantity: 47,
            sellerProduct: { id: 'listing-1', status: SellerProductStatus.OUT_OF_STOCK },
          },
        },
      ]);

      const res = await service.releaseReservation({
        checkoutSessionId: 'sess-123',
        reason: 'Payment timeout',
      });

      expect(res.status).toBe(StockReservationStatus.RELEASED);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          reservedQuantity: 0,
          availableQuantity: 50, // 47 + 3
        },
      });
      expect(mockPrisma.sellerProduct.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { status: SellerProductStatus.ACTIVE },
      });
    });
  });
});
