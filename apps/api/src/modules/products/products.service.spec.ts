import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus, SellerStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrisma = {
    seller: {
      findFirst: jest.fn(),
    },
    sellerServiceArea: {
      findFirst: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveServiceableStore', () => {
    it('should resolve explicit store if active and approved', async () => {
      const storeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockStore = {
        id: storeId,
        businessName: 'Indiranagar Mart',
        status: SellerStatus.APPROVED,
      };
      mockPrisma.seller.findFirst.mockResolvedValue(mockStore);

      const resolved = await service.resolveServiceableStore({ storeId });
      expect(resolved).toEqual(mockStore);
      expect(mockPrisma.seller.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: storeId }, { slug: storeId }],
          status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
        },
        include: { profile: true },
      });
    });

    it('should resolve store via postalCode service area', async () => {
      const mockStore = {
        id: 'store-area',
        businessName: 'Local Mart',
        status: SellerStatus.APPROVED,
      };
      mockPrisma.sellerServiceArea.findFirst.mockResolvedValue({
        seller: mockStore,
      });

      const resolved = await service.resolveServiceableStore({ postalCode: '560038' });
      expect(resolved).toEqual(mockStore);
    });
  });

  describe('getCatalogProducts', () => {
    it('should map master product variants with store-specific selling price and stock', async () => {
      const mockStore = {
        id: 'store-1',
        businessName: 'Indiranagar Mart',
        profile: { storeDisplayName: 'Indiranagar Mart', preparationTime: 15 },
        status: SellerStatus.APPROVED,
      };
      mockPrisma.seller.findFirst.mockResolvedValue(mockStore);

      const mockProducts = [
        {
          id: 'p-1',
          name: 'Amul Milk',
          slug: 'amul-milk',
          brand: 'Amul',
          foodPreference: 'VEG',
          category: { id: 'c-1', name: 'Dairy', slug: 'dairy' },
          images: [{ imageUrl: 'http://img.jpg' }],
          variants: [
            {
              id: 'v-1',
              productId: 'p-1',
              name: '500 ml',
              packSize: '500 ml - Pouch',
              unitValue: 500,
              unitType: 'ml',
              mrp: 30.0,
              sku: 'MB-AMUL-500',
              barcode: null,
              primaryImageUrl: 'http://img.jpg',
              isActive: true,
              displayOrder: 0,
              images: [],
            },
          ],
          sellerProducts: [
            {
              id: 'sp-1',
              sellerId: 'store-1',
              productId: 'p-1',
              variantId: 'v-1',
              sellingPrice: 28.0, // Store discount ₹28 vs MRP ₹30
              inventory: { availableQuantity: 40 },
            },
          ],
        },
      ];

      mockPrisma.product.count.mockResolvedValue(1);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getCatalogProducts({ storeId: 'store-1' });

      expect(result.items).toHaveLength(1);
      const card = result.items[0];
      expect(card.name).toBe('Amul Milk');
      expect(card.mrp).toBe(30.0);
      expect(card.sellingPrice).toBe(28.0);
      expect(card.discountPercent).toBe(7); // (30-28)/30 * 100 = 6.66% -> 7%
      expect(card.availableQuantity).toBe(40);
      expect(card.isAvailable).toBe(true);
      expect(card.store?.name).toBe('Indiranagar Mart');
    });
  });

  describe('getProductBySlug', () => {
    it('should throw NotFoundException if product does not exist or is inactive', async () => {
      mockPrisma.seller.findFirst.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductBySlug('missing-slug')).rejects.toThrow(NotFoundException);
    });

    it('should return full product details with variant prices', async () => {
      mockPrisma.seller.findFirst.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p-1',
        name: 'Amul Milk',
        slug: 'amul-milk',
        status: ProductStatus.ACTIVE,
        foodPreference: 'VEG',
        category: { id: 'c-1', name: 'Dairy', slug: 'dairy', parent: null },
        brandRel: null,
        images: [],
        variants: [
          {
            id: 'v-1',
            productId: 'p-1',
            name: '500 ml',
            mrp: 30.0,
            primaryImageUrl: 'http://img.png',
            images: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getProductBySlug('amul-milk');
      expect(result.id).toBe('p-1');
      expect(result.name).toBe('Amul Milk');
      expect(result.variants).toHaveLength(1);
    });
  });
});
