import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus, SellerProductStatus, SellerStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: Record<string, any> = {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    sellerProduct: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    seller: {
      findUnique: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(mockPrisma),
  );

  const mockStoresService = {
    evaluateStoreOperationalStatus: jest.fn().mockReturnValue({
      isApproved: true,
      isOpen: true,
      isAcceptingOrders: true,
      isClosingSoon: false,
      closingSoonMinutes: null,
      operationalStatusLabel: 'Open',
      openingTime: '07:00',
      closingTime: '22:00',
    }),
    computeDeliveryEstimate: jest.fn().mockReturnValue({
      deliveryTimeMinutes: 20,
      deliveryEtaLabel: '20–28 mins',
    }),
    getPublicStoreBySlug: jest.fn(),
    findNearbyStores: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StoresService, useValue: mockStoresService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('addItem', () => {
    it('throws ConflictException STORE_SWITCH_REQUIRED when adding item from another store without confirmStoreSwitch', async () => {
      mockPrisma.sellerProduct.findUnique.mockResolvedValue({
        id: 'sp-store2',
        sellerId: 'store-2',
        status: SellerProductStatus.ACTIVE,
        deletedAt: null,
        product: { name: 'Milk', status: ProductStatus.ACTIVE, deletedAt: null },
        variant: { isActive: true },
        inventory: { availableQuantity: 10 },
        seller: {
          id: 'store-2',
          slug: 'store-2',
          businessName: 'Store Two',
          storeDisplayName: 'Store Two',
          status: SellerStatus.APPROVED,
          profile: {},
          businessHours: [],
        },
      });
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'u-1',
        sellerId: 'store-1',
      });
      mockPrisma.cartItem.count.mockResolvedValue(2);
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        slug: 'store-1',
        businessName: 'Store One',
        storeDisplayName: 'Store One',
      });

      await expect(
        service.addItem('u-1', { sellerProductId: 'sp-store2', quantity: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException INSUFFICIENT_STOCK when requested quantity exceeds available stock', async () => {
      mockPrisma.sellerProduct.findUnique.mockResolvedValue({
        id: 'sp-1',
        sellerId: 'store-1',
        status: SellerProductStatus.ACTIVE,
        deletedAt: null,
        product: { name: 'Sugar', status: ProductStatus.ACTIVE, deletedAt: null },
        variant: { isActive: true },
        inventory: { availableQuantity: 2 },
        seller: {
          id: 'store-1',
          slug: 'store-1',
          businessName: 'Store One',
          storeDisplayName: 'Store One',
          status: SellerStatus.APPROVED,
          profile: {},
          businessHours: [],
        },
      });
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'u-1',
        sellerId: 'store-1',
      });
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('u-1', { sellerProductId: 'sp-1', quantity: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('compareStoreSwitch', () => {
    it('identifies price changes and unavailable items against the target store', async () => {
      mockStoresService.getPublicStoreBySlug.mockResolvedValue({
        id: 'store-2',
        name: 'Store Two',
        slug: 'store-2',
        isOpen: true,
        isAcceptingOrders: true,
        operationalStatusLabel: 'Open',
      });
      mockPrisma.seller.findUnique.mockResolvedValue({
        id: 'store-1',
        slug: 'store-1',
        businessName: 'Store One',
        storeDisplayName: 'Store One',
      });

      mockPrisma.sellerProduct.findFirst
        .mockResolvedValueOnce({
          id: 'sp-2a',
          productId: 'p-1',
          variantId: 'v-1',
          sellingPrice: 35,
          mrp: 40,
          product: { name: 'Milk', slug: 'milk', brand: 'Amul', images: [] },
          variant: { packSize: '500 ml', name: '500 ml', primaryImageUrl: null },
          inventory: { availableQuantity: 10 },
        })
        .mockResolvedValueOnce(null);

      const comparison = await service.compareStoreSwitch({
        currentStoreId: 'store-1',
        targetStoreId: 'store-2',
        items: [
          { variantId: 'v-1', productName: 'Milk', quantity: 1, unitPrice: 33 },
          { variantId: 'v-2', productName: 'Onion', quantity: 1, unitPrice: 49 },
        ],
      });

      expect(comparison.isServiceable).toBe(true);
      expect(comparison.compatibleItems).toHaveLength(1);
      expect(comparison.compatibleItems[0].newUnitPrice).toBe(35);
      expect(comparison.compatibleItems[0].priceChanged).toBe(true);
      expect(comparison.unavailableCount).toBe(1);
      expect(comparison.priceChangesCount).toBe(1);
    });
  });
});
