import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BrandItem, PaginatedResponse } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBrandDto, QueryBrandsDto, UpdateBrandDto } from './dto';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Public: List all active brands with active product counts.
   */
  async listActive(): Promise<BrandItem[]> {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: { deletedAt: null, status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      description: b.description,
      isActive: b.isActive,
      productCount: b._count.products,
    }));
  }

  /**
   * Admin: List brands with search and pagination.
   */
  async getAdminList(query: QueryBrandsDto): Promise<PaginatedResponse<BrandItem>> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, items] = await Promise.all([
      this.prisma.brand.count({ where }),
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { products: { where: { deletedAt: null } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      items: items.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        description: b.description,
        isActive: b.isActive,
        productCount: b._count.products,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Admin/Public: Get single brand by ID.
   */
  async getById(id: string): Promise<BrandItem> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
      description: brand.description,
      isActive: brand.isActive,
      productCount: brand._count.products,
    };
  }

  /**
   * Admin: Create a new brand.
   */
  async create(dto: CreateBrandDto): Promise<BrandItem> {
    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    const existingName = await this.prisma.brand.findUnique({ where: { name: dto.name.trim() } });
    if (existingName) {
      throw new ConflictException(`Brand with name '${dto.name}' already exists`);
    }

    const existingSlug = await this.prisma.brand.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Brand slug '${slug}' already exists`);
    }

    const created = await this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    this.logger.log(`Created brand: ${created.name} (${created.slug})`);

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      logoUrl: created.logoUrl,
      description: created.description,
      isActive: created.isActive,
      productCount: 0,
    };
  }

  /**
   * Admin: Update brand details.
   */
  async update(id: string, dto: UpdateBrandDto): Promise<BrandItem> {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = this.generateSlug(dto.slug);
      const conflict = await this.prisma.brand.findUnique({ where: { slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Brand slug '${slug}' already exists`);
      }
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const conflictName = await this.prisma.brand.findUnique({
        where: { name: dto.name.trim() },
      });
      if (conflictName && conflictName.id !== id) {
        throw new ConflictException(`Brand with name '${dto.name}' already exists`);
      }
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    this.logger.log(`Updated brand: ${updated.name} (${updated.id})`);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      description: updated.description,
      isActive: updated.isActive,
      productCount: updated._count.products,
    };
  }

  /**
   * Admin: Safe deletion of a brand.
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    if (brand._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete brand '${brand.name}' because it is assigned to ${brand._count.products} product(s). Reassign products before deleting.`,
      );
    }

    if (brand.logoPublicId) {
      await this.cloudinaryService.deleteResource(brand.logoPublicId, 'image').catch(() => {});
    }

    await this.prisma.brand.delete({ where: { id } });
    this.logger.log(`Deleted brand: ${brand.name} (${id})`);

    return {
      success: true,
      message: `Brand '${brand.name}' deleted successfully`,
    };
  }

  /**
   * Admin: Upload brand logo via Cloudinary.
   */
  async uploadLogo(id: string, file: Express.Multer.File): Promise<BrandItem> {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }

    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: 'marvels-basket/catalog/brands',
      maxWidth: 400,
      maxHeight: 400,
      tags: ['brand-logo', brand.slug],
    });

    if (brand.logoPublicId) {
      await this.cloudinaryService.deleteResource(brand.logoPublicId, 'image').catch(() => {});
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: {
        logoUrl: upload.secureUrl,
        logoPublicId: upload.publicId,
      },
    });

    return this.getById(updated.id);
  }
}
