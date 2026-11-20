import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SellerListingsService } from './seller-listings.service';
import { PrismaService } from '../../../database/prisma.service';
import { ProductStatus, SellerProductStatus, SellerStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('SellerListingsService', () => {
  let service: SellerListingsService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    seller: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
    sellerProduct: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SellerListingsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SellerListingsService>(SellerListingsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('verifyStoreOwnership', () => {
    it('should throw NotFoundException if store does not exist', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue(null);
      await expect(service.verifyStoreOwnership('user-1', 'store-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the store owner', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'different-user',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      await expect(service.verifyStoreOwnership('user-1', 'store-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if store is not approved and active', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.PENDING_VERIFICATION,
      });

      await expect(service.verifyStoreOwnership('user-1', 'store-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return store if user owns the approved store', async () => {
      const store = {
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.APPROVED_ACTIVE,
      };
      mockPrisma.seller.findUnique.mockResolvedValue(store);

      const result = await service.verifyStoreOwnership('user-1', 'store-1');
      expect(result).toEqual(store);
    });
  });

  describe('createListing', () => {
    const store = {
      id: 'store-1',
      ownerUserId: 'user-1',
      status: SellerStatus.APPROVED_ACTIVE,
    };

    const product = {
      id: 'prod-1',
      name: 'Amul Milk',
      slug: 'amul-milk',
      status: ProductStatus.ACTIVE,
      category: { name: 'Dairy & Bakery' },
    };

    const variant = {
      id: 'var-1',
      productId: 'prod-1',
      name: '500 ml Pouch',
      packSize: '500 ml',
      mrp: new Decimal(30.0),
      sku: 'AMUL-500',
      isActive: true,
    };

    beforeEach(() => {
      mockPrisma.seller.findUnique.mockResolvedValue(store);
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.productVariant.findUnique.mockResolvedValue(variant);
      mockPrisma.sellerProduct.findFirst.mockResolvedValue(null);
    });

    it('should reject selling price higher than master variant MRP', async () => {
      await expect(
        service.createListing('user-1', 'store-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          sellingPrice: 35.0, // MRP is 30.0!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject zero or negative selling price', async () => {
      await expect(
        service.createListing('user-1', 'store-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          sellingPrice: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject creating listing if variant is already listed in this store', async () => {
      mockPrisma.sellerProduct.findFirst.mockResolvedValue({ id: 'existing-listing-1' });

      await expect(
        service.createListing('user-1', 'store-1', {
          productId: 'prod-1',
          variantId: 'var-1',
          sellingPrice: 28.0,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create listing and initialize inventory atomically when valid', async () => {
      mockPrisma.sellerProduct.create.mockResolvedValue({
        id: 'new-listing-1',
        sellerId: 'store-1',
        productId: 'prod-1',
        variantId: 'var-1',
        sellingPrice: new Decimal(28.0),
        mrp: new Decimal(30.0),
        sellerSku: 'STR-AMUL-500',
        status: SellerProductStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.inventory.create.mockResolvedValue({
        id: 'inv-1',
        sellerProductId: 'new-listing-1',
        stockOnHand: 40,
        availableQuantity: 40,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      });

      const res = await service.createListing('user-1', 'store-1', {
        productId: 'prod-1',
        variantId: 'var-1',
        sellingPrice: 28.0,
        initialStock: 40,
      });

      expect(res.id).toBe('new-listing-1');
      expect(res.sellingPrice).toBe(28.0);
      expect(res.mrp).toBe(30.0);
      expect(res.stockOnHand).toBe(40);
      expect(res.availableStock).toBe(40);
      expect(res.reservedStock).toBe(0);
      expect(mockPrisma.sellerProduct.create).toHaveBeenCalled();
      expect(mockPrisma.inventory.create).toHaveBeenCalled();
      expect(mockPrisma.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 40,
            stockBefore: 0,
            stockAfter: 40,
          }),
        }),
      );
    });
  });

  describe('updateListingPrice', () => {
    it('should reject price greater than master variant MRP', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'store-1',
        variant: { mrp: new Decimal(50.0) },
        inventory: { id: 'inv-1' },
      });

      await expect(
        service.updateListingPrice('user-1', 'store-1', 'listing-1', {
          sellingPrice: 55.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid price <= MRP', async () => {
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        ownerUserId: 'user-1',
        status: SellerStatus.APPROVED_ACTIVE,
      });

      mockPrisma.sellerProduct.findFirst.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'store-1',
        variant: { mrp: new Decimal(50.0) },
        inventory: { id: 'inv-1', stockOnHand: 10, availableQuantity: 10, reservedQuantity: 0 },
      });

      mockPrisma.sellerProduct.update.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'store-1',
        sellingPrice: new Decimal(48.0),
        mrp: new Decimal(50.0),
        status: SellerProductStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { name: 'Atta', slug: 'atta', category: { name: 'Groceries' } },
        variant: { name: '5kg', mrp: new Decimal(50.0) },
        inventory: {
          stockOnHand: 10,
          availableQuantity: 10,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
      });

      const res = await service.updateListingPrice('user-1', 'store-1', 'listing-1', {
        sellingPrice: 48.0,
      });

      expect(res.sellingPrice).toBe(48.0);
    });
  });

  describe('handleMasterVariantMrpChange', () => {
    it('should clamp store selling prices if new master MRP is lower than current selling price', async () => {
      mockPrisma.sellerProduct.findMany.mockResolvedValue([
        { id: 'listing-1', sellingPrice: new Decimal(95.0), mrp: new Decimal(100.0) },
      ]);

      const res = await service.handleMasterVariantMrpChange('var-1', 90.0);
      expect(res.affectedListingsCount).toBe(1);
      expect(mockPrisma.sellerProduct.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: {
          sellingPrice: new Decimal(90.0),
          mrp: new Decimal(90.0),
        },
      });
    });
  });
});
