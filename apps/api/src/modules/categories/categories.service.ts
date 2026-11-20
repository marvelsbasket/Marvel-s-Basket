import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CategoryTreeItem, PaginatedResponse } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CategoryOrderItem, CreateCategoryDto, QueryCategoriesDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Helper to generate a URL-safe slug from a category title.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Public: Retrieves the complete hierarchical category tree.
   * Root categories contain nested subcategories with product counts and media.
   */
  async getTree(onlyActive = true): Promise<CategoryTreeItem[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        ...(onlyActive ? { isActive: true } : {}),
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                deletedAt: null,
                ...(onlyActive ? { status: 'ACTIVE' } : {}),
              },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Map into tree structure in-memory for efficiency
    const categoryMap = new Map<string, CategoryTreeItem>();

    for (const cat of categories) {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        iconUrl: cat.iconUrl,
        imageUrl: cat.imageUrl,
        parentId: cat.parentId,
        displayOrder: cat.displayOrder,
        isActive: cat.isActive,
        taxCode: cat.taxCode,
        defaultGstRate: cat.defaultGstRate ? Number(cat.defaultGstRate) : null,
        productCount: cat._count.products,
        subcategories: [],
      });
    }

    const tree: CategoryTreeItem[] = [];

    for (const cat of categories) {
      const item = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId)!;
        item.parent = { id: parent.id, name: parent.name, slug: parent.slug };
        parent.subcategories.push(item);
      } else if (!cat.parentId) {
        tree.push(item);
      }
    }

    return tree;
  }

  /**
   * Public: Retrieves a single category by slug, including breadcrumbs and child subcategories.
   */
  async getBySlug(slug: string): Promise<CategoryTreeItem> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
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
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: {
            products: {
              where: { deletedAt: null, status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconUrl: category.iconUrl,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      taxCode: category.taxCode,
      defaultGstRate: category.defaultGstRate ? Number(category.defaultGstRate) : null,
      productCount: category._count.products,
      parent: category.parent,
      subcategories: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        iconUrl: child.iconUrl,
        imageUrl: child.imageUrl,
        parentId: child.parentId,
        displayOrder: child.displayOrder,
        isActive: child.isActive,
        taxCode: child.taxCode,
        defaultGstRate: child.defaultGstRate ? Number(child.defaultGstRate) : null,
        productCount: child._count.products,
        subcategories: [],
      })),
    };
  }

  /**
   * Admin: List categories with pagination, search, and hierarchy filtering.
   */
  async getAdminList(query: QueryCategoriesDto): Promise<PaginatedResponse<CategoryTreeItem>> {
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
    if (query.rootOnly) {
      where.parentId = null;
    }

    const [total, items] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              products: { where: { deletedAt: null } },
              children: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    const mappedItems: CategoryTreeItem[] = items.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      iconUrl: cat.iconUrl,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      taxCode: cat.taxCode,
      defaultGstRate: cat.defaultGstRate ? Number(cat.defaultGstRate) : null,
      productCount: cat._count.products,
      parent: cat.parent,
      subcategories: [],
    }));

    return {
      items: mappedItems,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Admin: Get category by ID.
   */
  async getById(id: string): Promise<CategoryTreeItem> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          include: {
            _count: { select: { products: { where: { deletedAt: null } } } },
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconUrl: category.iconUrl,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      taxCode: category.taxCode,
      defaultGstRate: category.defaultGstRate ? Number(category.defaultGstRate) : null,
      productCount: category._count.products,
      parent: category.parent,
      subcategories: category.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        iconUrl: c.iconUrl,
        imageUrl: c.imageUrl,
        parentId: c.parentId,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
        taxCode: c.taxCode,
        defaultGstRate: c.defaultGstRate ? Number(c.defaultGstRate) : null,
        productCount: c._count.products,
        subcategories: [],
      })),
    };
  }

  /**
   * Admin: Creates a new master category or subcategory.
   */
  async create(dto: CreateCategoryDto): Promise<CategoryTreeItem> {
    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    // Verify slug uniqueness
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Category slug '${slug}' already exists`);
    }

    // If parentId provided, verify parent exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentId: dto.parentId || null,
        description: dto.description?.trim() || null,
        displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        taxCode: dto.taxCode?.trim() || null,
        defaultGstRate: dto.defaultGstRate !== undefined ? dto.defaultGstRate : null,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.log(`Created category: ${created.name} (${created.slug})`);

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      iconUrl: created.iconUrl,
      imageUrl: created.imageUrl,
      parentId: created.parentId,
      displayOrder: created.displayOrder,
      isActive: created.isActive,
      taxCode: created.taxCode,
      defaultGstRate: created.defaultGstRate ? Number(created.defaultGstRate) : null,
      productCount: 0,
      parent: created.parent,
      subcategories: [],
    };
  }

  /**
   * Admin: Updates category fields and hierarchy.
   * Prevents circular parent-child relationships and slug collisions.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryTreeItem> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = this.generateSlug(dto.slug);
      const conflict = await this.prisma.category.findUnique({ where: { slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Category slug '${slug}' is already taken`);
      }
    }

    // Hierarchy validation: prevent circular reference
    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      if (dto.parentId) {
        const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
        if (!parent) {
          throw new NotFoundException(`Parent category '${dto.parentId}' does not exist`);
        }

        // Check if proposed parent is a descendant of this category
        const isDescendant = await this.checkIsDescendant(id, dto.parentId);
        if (isDescendant) {
          throw new BadRequestException(
            'Circular category hierarchy detected: cannot set a child or descendant as parent',
          );
        }
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.taxCode !== undefined && { taxCode: dto.taxCode?.trim() || null }),
        ...(dto.defaultGstRate !== undefined && { defaultGstRate: dto.defaultGstRate }),
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    this.logger.log(`Updated category: ${updated.id} (${updated.name})`);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      iconUrl: updated.iconUrl,
      imageUrl: updated.imageUrl,
      parentId: updated.parentId,
      displayOrder: updated.displayOrder,
      isActive: updated.isActive,
      taxCode: updated.taxCode,
      defaultGstRate: updated.defaultGstRate ? Number(updated.defaultGstRate) : null,
      productCount: updated._count.products,
      parent: updated.parent,
      subcategories: [],
    };
  }

  /**
   * Helper to verify if candidateId is a descendant of ancestorId.
   */
  private async checkIsDescendant(ancestorId: string, candidateId: string): Promise<boolean> {
    let currentId: string | null = candidateId;
    while (currentId) {
      if (currentId === ancestorId) return true;
      const node: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      currentId = node ? node.parentId : null;
    }
    return false;
  }

  /**
   * Admin: Safe deletion of a category.
   * Prevents unsafe deletion when child categories or products exist.
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            products: { where: { deletedAt: null } },
            commissionRules: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it contains ${category._count.children} active subcategory(s). Delete or reassign subcategories first.`,
      );
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it contains ${category._count.products} associated product(s). Delete or reassign products first.`,
      );
    }

    // Clean up Cloudinary assets if any
    if (category.iconPublicId) {
      try {
        await this.cloudinaryService.deleteResource(category.iconPublicId, 'image');
      } catch {
        // Log & proceed if deletion fails
      }
    }
    if (category.imagePublicId) {
      try {
        await this.cloudinaryService.deleteResource(category.imagePublicId, 'image');
      } catch {
        // Log & proceed if deletion fails
      }
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`Deleted category: ${category.name} (${id})`);

    return {
      success: true,
      message: `Category '${category.name}' deleted successfully`,
    };
  }

  /**
   * Admin: Uploads or updates a category icon image via Cloudinary.
   */
  async uploadIcon(id: string, file: Express.Multer.File): Promise<CategoryTreeItem> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: 'marvels-basket/catalog/categories/icons',
      maxWidth: 256,
      maxHeight: 256,
      tags: ['category-icon', category.slug],
    });

    // Delete old icon if one exists
    if (category.iconPublicId) {
      await this.cloudinaryService.deleteResource(category.iconPublicId, 'image').catch(() => {});
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        iconUrl: upload.secureUrl,
        iconPublicId: upload.publicId,
      },
    });

    return this.getById(updated.id);
  }

  /**
   * Admin: Uploads or updates a category banner/thumbnail image via Cloudinary.
   */
  async uploadImage(id: string, file: Express.Multer.File): Promise<CategoryTreeItem> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: 'marvels-basket/catalog/categories/images',
      maxWidth: 1200,
      maxHeight: 800,
      tags: ['category-banner', category.slug],
    });

    // Delete old image if one exists
    if (category.imagePublicId) {
      await this.cloudinaryService.deleteResource(category.imagePublicId, 'image').catch(() => {});
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        imageUrl: upload.secureUrl,
        imagePublicId: upload.publicId,
      },
    });

    return this.getById(updated.id);
  }

  /**
   * Admin: Reorders multiple categories by updating displayOrder.
   */
  async reorder(items: CategoryOrderItem[]): Promise<{ success: boolean; updatedCount: number }> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );

    this.logger.log(`Reordered ${items.length} categories`);
    return {
      success: true,
      updatedCount: items.length,
    };
  }
}
