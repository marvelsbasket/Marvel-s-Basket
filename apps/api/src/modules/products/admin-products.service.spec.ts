import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FoodPreference, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AdminProductsService } from './admin-products.service';

describe('AdminProductsService', () => {
  let service: AdminProductsService;

  const mockPrisma: any = {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    brand: {
      findUnique: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productImage: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    sellerProduct: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      typeof callback === 'function' ? callback(mockPrisma) : Promise.all(callback),
    ),
  };

  const mockCloudinary = {
    uploadImage: jest.fn().mockResolvedValue({ secure_url: 'http://img.jpg', public_id: 'pub-1' }),
    deleteResource: jest.fn().mockResolvedValue(true),
  };

  const createMockProduct = (overrides: Record<string, any> = {}) => ({
    id: 'prod-1',
    name: 'Fresh Cow Milk',
    slug: 'fresh-cow-milk',
    status: ProductStatus.DRAFT,
    mrp: 35,
    taxCode: null,
    defaultGstRate: null,
    shortDescription: 'Fresh cow milk',
    foodPreference: FoodPreference.VEG,
    countryOfOrigin: 'India',
    manufacturerDetails: 'Amul Dairy',
    packerDetails: 'Amul Packer',
    shelfLife: '2 days',
    storageInstructions: 'Keep refrigerated',
    ingredients: 'Milk',
    nutritionalInfo: {},
    specifications: {},
    attributes: {},
    searchTags: ['milk', 'dairy'],
    isFeatured: false,
    variants: [
      {
        id: 'var-1',
        name: '500ml',
        packSize: '500 ml',
        unitValue: 500,
        unitType: 'ml',
        mrp: 35,
        sku: 'MB-MILK-500ML',
        barcode: '8901234567890',
        primaryImageUrl: 'http://img.jpg',
        isActive: true,
        displayOrder: 1,
        attributes: {},
        images: [],
      },
    ],
    images: [],
    category: { id: 'cat-1', name: 'Dairy', slug: 'dairy' },
    brandRel: { id: 'brand-1', name: 'Amul', slug: 'amul' },
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get<AdminProductsService>(AdminProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a master product with auto-generated slug and initial variant', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Dairy' });
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockProduct());

      mockPrisma.product.create.mockResolvedValue({
        id: 'prod-1',
        name: 'Fresh Cow Milk',
        slug: 'fresh-cow-milk',
        status: ProductStatus.DRAFT,
      });

      const dto = {
        name: 'Fresh Cow Milk',
        categoryId: 'cat-1',
        mrp: 35,
        variants: [
          {
            name: '500ml',
            packSize: '500 ml',
            unitValue: 500,
            unitType: 'ml',
            mrp: 35,
          },
        ],
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const dto = {
        name: 'Fresh Cow Milk',
        categoryId: 'non-existent-cat',
        mrp: 35,
      };

      await expect(service.create(dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should throw BadRequestException when publishing to ACTIVE without active variants', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Fresh Cow Milk',
        status: ProductStatus.DRAFT,
        variants: [],
        images: [],
      });

      await expect(
        service.updateStatus('prod-1', { status: ProductStatus.ACTIVE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when publishing to ACTIVE if variant has 0 MRP', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Fresh Cow Milk',
        status: ProductStatus.DRAFT,
        variants: [
          {
            id: 'var-1',
            name: '500ml',
            isActive: true,
            mrp: 0,
            primaryImageUrl: 'http://img.jpg',
          },
        ],
        images: [],
      });

      await expect(
        service.updateStatus('prod-1', { status: ProductStatus.ACTIVE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when publishing to ACTIVE if variant has no primary image', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Fresh Cow Milk',
        status: ProductStatus.DRAFT,
        variants: [
          {
            id: 'var-1',
            name: '500ml',
            isActive: true,
            mrp: 35,
            primaryImageUrl: null,
          },
        ],
        images: [],
      });

      await expect(
        service.updateStatus('prod-1', { status: ProductStatus.ACTIVE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update status to ACTIVE when validation passes', async () => {
      mockPrisma.product.findUnique
        .mockResolvedValueOnce({
          id: 'prod-1',
          name: 'Fresh Cow Milk',
          status: ProductStatus.DRAFT,
          variants: [
            {
              id: 'var-1',
              name: '500ml',
              isActive: true,
              mrp: 35,
              primaryImageUrl: 'http://img.jpg',
            },
          ],
          images: [],
        })
        .mockResolvedValueOnce(createMockProduct({ status: ProductStatus.ACTIVE }));

      mockPrisma.product.update.mockResolvedValue({
        id: 'prod-1',
        name: 'Fresh Cow Milk',
        status: ProductStatus.ACTIVE,
      });

      const result = await service.updateStatus('prod-1', { status: ProductStatus.ACTIVE });
      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { status: ProductStatus.ACTIVE },
      });
    });
  });

  describe('uploadVariantImage', () => {
    it('should reject if variant already has 5 images', async () => {
      mockPrisma.productVariant.findFirst.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        images: [{}, {}, {}, {}, {}],
      });

      const fakeFile = {
        buffer: Buffer.from('fake'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      await expect(service.uploadVariantImage('prod-1', 'var-1', fakeFile, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload and attach image to variant when under limit', async () => {
      mockPrisma.productVariant.findFirst.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        primaryImageUrl: null,
        images: [{}, {}],
      });
      mockPrisma.productImage.create.mockResolvedValue({
        id: 'img-new',
        url: 'http://img.jpg',
        publicId: 'pub-1',
        isPrimary: true,
        variantId: 'var-1',
        productId: 'prod-1',
      });
      mockPrisma.productVariant.update.mockResolvedValue({});
      mockPrisma.product.findUnique.mockResolvedValue(createMockProduct());

      const fakeFile = {
        buffer: Buffer.from('fake'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await service.uploadVariantImage('prod-1', 'var-1', fakeFile, true);
      expect(result).toBeDefined();
      expect(mockCloudinary.uploadImage).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete product by setting deletedAt and ARCHIVED status', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'Fresh Cow Milk',
      });
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.delete('prod-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            status: ProductStatus.ARCHIVED,
          }),
        }),
      );
    });
  });
});
