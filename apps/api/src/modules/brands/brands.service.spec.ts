import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BrandsService } from './brands.service';

describe('BrandsService', () => {
  let service: BrandsService;

  const mockPrisma = {
    brand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCloudinary = {
    uploadImage: jest.fn(),
    deleteResource: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listActive', () => {
    it('should list all active brands with product count', async () => {
      mockPrisma.brand.findMany.mockResolvedValue([
        {
          id: 'b-1',
          name: 'Amul',
          slug: 'amul',
          logoUrl: 'http://amul.png',
          description: 'Taste of India',
          isActive: true,
          _count: { products: 12 },
        },
      ]);

      const brands = await service.listActive();
      expect(brands).toHaveLength(1);
      expect(brands[0].name).toBe('Amul');
      expect(brands[0].productCount).toBe(12);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if brand name exists', async () => {
      mockPrisma.brand.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.create({ name: 'Amul' })).rejects.toThrow(ConflictException);
    });

    it('should create brand successfully', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue(null);
      mockPrisma.brand.create.mockResolvedValue({
        id: 'new-b',
        name: 'Britannia',
        slug: 'britannia',
        logoUrl: null,
        description: null,
        isActive: true,
      });

      const brand = await service.create({ name: 'Britannia' });
      expect(brand.id).toBe('new-b');
      expect(brand.slug).toBe('britannia');
    });
  });

  describe('delete', () => {
    it('should reject deletion if brand is assigned to products', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'b-1',
        name: 'Amul',
        _count: { products: 4 },
      });

      await expect(service.delete('b-1')).rejects.toThrow(BadRequestException);
    });
  });
});
