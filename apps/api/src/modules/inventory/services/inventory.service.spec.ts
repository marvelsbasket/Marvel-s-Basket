import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../../database/prisma.service';
import { InventoryTransactionType, SellerProductStatus, SellerStatus } from '@prisma/client';
import { StockAdjustmentOperation } from '../dto';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    seller: {
      findUnique: jest.fn(),
    },
    sellerProduct: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      update: jest.fn(),
    },
    inventoryTransaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getInventoryOverview', () => {
    it('should aggregate metrics correctly', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      mockPrisma.sellerProduct.findMany.mockResolvedValue([
        {
          id: 'l-1',
          status: SellerProductStatus.ACTIVE,
          inventory: {
            stockOnHand: 50,
            reservedQuantity: 5,
            availableQuantity: 45,
            lowStockThreshold: 10,
          },
        },
        {
          id: 'l-2',
          status: SellerProductStatus.PAUSED,
          inventory: {
            stockOnHand: 20,
            reservedQuantity: 0,
            availableQuantity: 20,
            lowStockThreshold: 5,
          },
        },
        {
          id: 'l-3',
          status: SellerProductStatus.OUT_OF_STOCK,
          inventory: {
            stockOnHand: 0,
            reservedQuantity: 0,
            availableQuantity: 0,
            lowStockThreshold: 5,
          },
        },
      ]);

      const res = await service.getInventoryOverview('user-1', 'store-1');
      expect(res.totalListedProducts).toBe(3);
      expect(res.activeListings).toBe(1);
      expect(res.pausedListings).toBe(1);
      expect(res.outOfStockListings).toBe(1);
      expect(res.totalStockOnHand).toBe(70);
      expect(res.totalReservedStock).toBe(5);
      expect(res.totalAvailableStock).toBe(65);
    });
  });

  describe('adjustStock', () => {
    const store = {
      id: 'store-1',
      ownerUserId: 'user-1',
      status: SellerStatus.APPROVED_ACTIVE,
    };

    beforeEach(() => {
      mockPrisma.seller.findUnique.mockResolvedValue(store);
      mockPrisma.inventoryTransaction.findFirst.mockResolvedValue(null);
    });

    it('should successfully restock and update physical & available stock', async () => {
      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'l-1',
        sellerId: 'store-1',
        status: SellerProductStatus.ACTIVE,
        inventory: {
          id: 'inv-1',
          stockOnHand: 10,
          reservedQuantity: 2,
          availableQuantity: 8,
        },
      });

      mockPrisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        stockOnHand: 25,
        reservedQuantity: 2,
        availableQuantity: 23,
      });

      mockPrisma.inventoryTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: InventoryTransactionType.RESTOCK,
        quantity: 15,
        stockBefore: 10,
        stockAfter: 25,
        note: 'Restock shipment',
        createdAt: new Date(),
      });

      const res = await service.adjustStock('user-1', 'store-1', 'l-1', {
        operation: StockAdjustmentOperation.RESTOCK,
        quantity: 15,
        note: 'Restock shipment',
      });

      expect(res.stockOnHand).toBe(25);
      expect(res.availableStock).toBe(23);
      expect(res.reservedStock).toBe(2);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { stockOnHand: 25, availableQuantity: 23 },
      });
    });

    it('should REJECT manual stock reduction below currently reserved stock (Section 12)', async () => {
      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'l-1',
        sellerId: 'store-1',
        status: SellerProductStatus.ACTIVE,
        inventory: {
          id: 'inv-1',
          stockOnHand: 10,
          reservedQuantity: 4, // 4 units currently reserved
          availableQuantity: 6,
        },
      });

      // Attempting to reduce stock by 7 (10 - 7 = 3, which is < reserved 4!)
      await expect(
        service.adjustStock('user-1', 'store-1', 'l-1', {
          operation: StockAdjustmentOperation.MANUAL_DECREASE,
          quantity: 7,
          note: 'Selling offline directly',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing transaction if idempotencyKey was already processed', async () => {
      mockPrisma.inventoryTransaction.findFirst.mockResolvedValue({
        id: 'existing-tx-id',
        type: InventoryTransactionType.RESTOCK,
        inventory: { stockOnHand: 50, availableQuantity: 50, reservedQuantity: 0 },
      });

      const res = await service.adjustStock('user-1', 'store-1', 'l-1', {
        operation: StockAdjustmentOperation.RESTOCK,
        quantity: 20,
        note: 'Retry test',
        idempotencyKey: 'idemp-12345',
      });

      expect(res.id).toBe('existing-tx-id');
      expect(res.message).toContain('idempotent');
      expect(mockPrisma.inventory.update).not.toHaveBeenCalled();
    });
  });

  describe('reconcileInventory', () => {
    it('should verify ledger sum matches physical stock on hand', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      mockPrisma.sellerProduct.findMany.mockResolvedValue([
        {
          id: 'l-1',
          product: { name: 'Milk' },
          variant: { name: '500ml' },
          inventory: {
            id: 'inv-1',
            stockOnHand: 45,
            transactions: [
              { type: InventoryTransactionType.INITIAL_STOCK, quantity: 50 },
              { type: InventoryTransactionType.ORDER_COMMITTED, quantity: -5 },
            ],
          },
        },
      ]);

      const res = await service.reconcileInventory('user-1', 'store-1');
      expect(res.isFullyReconciled).toBe(true);
      expect(res.results[0].discrepancy).toBe(0);
      expect(res.results[0].calculatedStockFromLedger).toBe(45);
    });

    it('should detect and flag inventory discrepancies', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      mockPrisma.sellerProduct.findMany.mockResolvedValue([
        {
          id: 'l-1',
          product: { name: 'Milk' },
          variant: { name: '500ml' },
          inventory: {
            id: 'inv-1',
            stockOnHand: 50, // Physical stock says 50
            transactions: [
              { type: InventoryTransactionType.INITIAL_STOCK, quantity: 40 }, // Ledger says 40
            ],
          },
        },
      ]);

      const res = await service.reconcileInventory('user-1', 'store-1');
      expect(res.isFullyReconciled).toBe(false);
      expect(res.totalDiscrepancies).toBe(1);
      expect(res.results[0].discrepancy).toBe(10);
      expect(res.results[0].isReconciled).toBe(false);
    });
  });
});
