import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrisma: any = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      typeof callback === 'function' ? callback(mockPrisma) : Promise.all(callback),
    ),
  };

  const mockCloudinary = {
    uploadImage: jest.fn().mockResolvedValue({ secure_url: 'http://img.jpg', public_id: 'pub-id' }),
    deleteResource: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTree', () => {
    it('should return nested category tree with children and product count', async () => {
      const mockDbCategories = [
        {
          id: 'root-1',
          name: 'Fresh Produce',
          slug: 'fresh-produce',
          description: 'Fresh fruits and vegetables',
          iconUrl: 'http://icon.png',
          imageUrl: null,
          parentId: null,
          displayOrder: 1,
          isActive: true,
          taxCode: null,
          defaultGstRate: null,
          _count: { products: 5 },
        },
        {
          id: 'child-1',
          name: 'Fresh Fruits',
          slug: 'fresh-fruits',
          description: null,
          iconUrl: null,
          imageUrl: null,
          parentId: 'root-1',
          displayOrder: 1,
          isActive: true,
          taxCode: null,
          defaultGstRate: null,
          _count: { products: 3 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockDbCategories);

      const result = await service.getTree(true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root-1');
      expect(result[0].subcategories).toHaveLength(1);
      expect(result[0].subcategories[0].id).toBe('child-1');
      expect(result[0].subcategories[0].parent?.name).toBe('Fresh Produce');
    });
  });

  describe('getBySlug', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.getBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return category with subcategories', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Dairy',
        slug: 'dairy',
        description: 'Milk and curd',
        iconUrl: null,
        imageUrl: null,
        parentId: null,
        displayOrder: 1,
        isActive: true,
        taxCode: null,
        defaultGstRate: null,
        parent: null,
        children: [],
        _count: { products: 4 },
      });

      const result = await service.getBySlug('dairy');
      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Dairy');
      expect(result.productCount).toBe(4);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if slug already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ name: 'Snacks', slug: 'existing-slug' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if parentId does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce(null); // slug available
      mockPrisma.category.findUnique.mockResolvedValueOnce(null); // parent not found

      await expect(
        service.create({ name: 'Chips', parentId: 'non-existent-parent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create category successfully with auto-generated slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({
        id: 'new-id',
        name: 'Atta & Flours',
        slug: 'atta-flours',
        parentId: null,
        description: null,
        iconUrl: null,
        imageUrl: null,
        displayOrder: 0,
        isActive: true,
        taxCode: null,
        defaultGstRate: null,
        parent: null,
      });

      const result = await service.create({ name: 'Atta & Flours' });

      expect(result.id).toBe('new-id');
      expect(result.slug).toBe('atta-flours');
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if setting category as its own parent', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', parentId: null });

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should reject deletion if category has subcategories', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-root',
        name: 'Root Cat',
        _count: { children: 2, products: 0, commissionRules: 0 },
      });

      await expect(service.delete('cat-root')).rejects.toThrow(BadRequestException);
    });

    it('should reject deletion if category has associated products', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-leaf',
        name: 'Leaf Cat',
        _count: { children: 0, products: 5, commissionRules: 0 },
      });

      await expect(service.delete('cat-leaf')).rejects.toThrow(BadRequestException);
    });

    it('should delete safely if no dependencies exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-empty',
        name: 'Empty Cat',
        iconPublicId: 'icon-pub-id',
        imagePublicId: null,
        _count: { children: 0, products: 0, commissionRules: 0 },
      });
      mockPrisma.category.delete.mockResolvedValue({});

      const result = await service.delete('cat-empty');

      expect(result.success).toBe(true);
      expect(mockCloudinary.deleteResource).toHaveBeenCalledWith('icon-pub-id', 'image');
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-empty' } });
    });
  });
});
