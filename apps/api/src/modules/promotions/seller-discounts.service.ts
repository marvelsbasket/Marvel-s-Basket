import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  Prisma,
  SellerDiscountStatus,
  SellerStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PaginatedSellerDiscountsResponse,
  SellerDiscountStatusType,
  SellerProductDiscountItem,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  assertValidSellerDiscountTransition,
  computeDiscountedPricePaise,
  fromPaise,
  toPaise,
} from './discount-calculator';
import {
  CreateSellerDiscountDto,
  QuerySellerDiscountsDto,
  UpdateSellerDiscountDto,
} from './dto/promotions.dto';

const DISCOUNT_INCLUDE = {
  sellerProduct: {
    include: {
      product: { select: { name: true } },
      variant: { select: { name: true, packSize: true, mrp: true } },
    },
  },
};

@Injectable()
export class SellerDiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveActiveSeller(sellerUserId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { ownerUserId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller store not found.');
    }
    if (seller.status === SellerStatus.SUSPENDED) {
      throw new ForbiddenException('Suspended stores cannot manage product discounts.');
    }
    if (seller.status !== SellerStatus.APPROVED_ACTIVE && seller.status !== SellerStatus.APPROVED) {
      throw new ForbiddenException('Only approved active stores can manage product discounts.');
    }
    return seller;
  }

  private validateDiscountBounds(params: {
    discountType: DiscountType;
    discountValue: number;
    baseSellingPricePaise: number;
    mrpPaise: number;
    startsAt: Date;
    expiresAt: Date;
  }) {
    if (params.expiresAt <= params.startsAt) {
      throw new BadRequestException({
        code: 'INVALID_DISCOUNT_WINDOW',
        message: 'Discount expiry time must be after start time.',
      });
    }

    if (params.discountType === DiscountType.PERCENTAGE) {
      if (params.discountValue <= 0 || params.discountValue > 90) {
        throw new BadRequestException({
          code: 'INVALID_PERCENTAGE_DISCOUNT',
          message: 'Percentage discount must be between 0.01% and 90%.',
        });
      }
    } else {
      const flatPaise = Math.round(params.discountValue * 100);
      if (flatPaise <= 0 || flatPaise >= params.baseSellingPricePaise) {
        throw new BadRequestException({
          code: 'INVALID_FLAT_DISCOUNT',
          message: 'Flat discount must be positive and less than the listing selling price.',
        });
      }
    }

    const calc = computeDiscountedPricePaise({
      baseSellingPricePaise: params.baseSellingPricePaise,
      mrpPaise: params.mrpPaise,
      discountType: params.discountType,
      discountValue: params.discountValue,
    });

    if (calc.effectivePricePaise < 100 || calc.effectivePricePaise > params.mrpPaise) {
      throw new BadRequestException({
        code: 'INVALID_EFFECTIVE_PRICE',
        message: 'Resulting discounted price must be at least ₹1.00 and cannot exceed MRP.',
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDiscount(d: any): SellerProductDiscountItem {
    const basePaise = toPaise(d.sellerProduct?.sellingPrice ?? 0);
    const mrpPaise = Math.max(
      toPaise(d.sellerProduct?.variant?.mrp ?? d.sellerProduct?.sellingPrice ?? 0),
      basePaise,
    );
    const calc = computeDiscountedPricePaise({
      baseSellingPricePaise: basePaise,
      mrpPaise,
      discountType: d.discountType,
      discountValue: Number(d.discountValue),
    });

    const now = new Date();
    let effectiveStatus = d.status as SellerDiscountStatus;
    if (
      (effectiveStatus === SellerDiscountStatus.ACTIVE ||
        effectiveStatus === SellerDiscountStatus.SCHEDULED) &&
      new Date(d.expiresAt) <= now
    ) {
      effectiveStatus = SellerDiscountStatus.EXPIRED;
    }

    return {
      id: d.id,
      sellerId: d.sellerId,
      sellerProductId: d.sellerProductId,
      productName: d.sellerProduct?.product?.name || 'Product',
      variantName: d.sellerProduct?.variant?.name ?? null,
      packSize: d.sellerProduct?.variant?.packSize ?? null,
      title: d.title ?? null,
      discountType: d.discountType,
      discountValue: Number(d.discountValue),
      baseSellingPrice: fromPaise(basePaise),
      mrp: fromPaise(mrpPaise),
      discountAmount: fromPaise(calc.discountPaise),
      effectiveSellingPrice: fromPaise(calc.effectivePricePaise),
      status: effectiveStatus as SellerDiscountStatusType,
      startsAt: new Date(d.startsAt).toISOString(),
      expiresAt: new Date(d.expiresAt).toISOString(),
      pausedAt: d.pausedAt ? new Date(d.pausedAt).toISOString() : null,
      endedAt: d.endedAt ? new Date(d.endedAt).toISOString() : null,
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    };
  }

  async createDiscount(
    sellerUserId: string,
    dto: CreateSellerDiscountDto,
  ): Promise<SellerProductDiscountItem> {
    const seller = await this.resolveActiveSeller(sellerUserId);

    const listing = await this.prisma.sellerProduct.findFirst({
      where: { id: dto.sellerProductId, sellerId: seller.id, deletedAt: null },
      include: { variant: { select: { mrp: true } } },
    });
    if (!listing) {
      throw new NotFoundException('Product listing not found in your store.');
    }

    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);
    const basePaise = toPaise(listing.sellingPrice);
    const mrpPaise = Math.max(toPaise(listing.variant?.mrp ?? listing.sellingPrice), basePaise);

    this.validateDiscountBounds({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      baseSellingPricePaise: basePaise,
      mrpPaise,
      startsAt,
      expiresAt,
    });

    // Prevent overlapping active/scheduled discount on same listing
    const overlap = await this.prisma.sellerProductDiscount.findFirst({
      where: {
        sellerProductId: listing.id,
        status: { in: [SellerDiscountStatus.ACTIVE, SellerDiscountStatus.SCHEDULED] },
        startsAt: { lt: expiresAt },
        expiresAt: { gt: startsAt },
      },
    });
    if (overlap) {
      throw new ConflictException({
        code: 'OVERLAPPING_DISCOUNT',
        message: 'An active or scheduled discount already overlaps this time window for this listing.',
      });
    }

    const now = new Date();
    let initialStatus: SellerDiscountStatus = SellerDiscountStatus.DRAFT;
    if (dto.publishImmediately !== false) {
      if (expiresAt <= now) {
        throw new BadRequestException('Cannot publish an already expired discount.');
      }
      initialStatus =
        startsAt > now ? SellerDiscountStatus.SCHEDULED : SellerDiscountStatus.ACTIVE;
    }

    const created = await this.prisma.sellerProductDiscount.create({
      data: {
        sellerId: seller.id,
        sellerProductId: listing.id,
        title: dto.title?.trim() || null,
        discountType: dto.discountType,
        discountValue: new Decimal(dto.discountValue),
        status: initialStatus,
        startsAt,
        expiresAt,
        createdBy: sellerUserId,
      },
      include: DISCOUNT_INCLUDE,
    });

    return this.mapDiscount(created);
  }

  async listDiscounts(
    sellerUserId: string,
    query: QuerySellerDiscountsDto,
  ): Promise<PaginatedSellerDiscountsResponse> {
    const seller = await this.resolveActiveSeller(sellerUserId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SellerProductDiscountWhereInput = {
      sellerId: seller.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.sellerProductDiscount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: DISCOUNT_INCLUDE,
      }),
      this.prisma.sellerProductDiscount.count({ where }),
    ]);

    return {
      items: items.map((i) => this.mapDiscount(i)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getDiscount(
    sellerUserId: string,
    discountId: string,
  ): Promise<SellerProductDiscountItem> {
    const seller = await this.resolveActiveSeller(sellerUserId);
    const discount = await this.prisma.sellerProductDiscount.findFirst({
      where: { id: discountId, sellerId: seller.id },
      include: DISCOUNT_INCLUDE,
    });
    if (!discount) {
      throw new NotFoundException('Discount not found.');
    }
    return this.mapDiscount(discount);
  }

  async updateDiscount(
    sellerUserId: string,
    discountId: string,
    dto: UpdateSellerDiscountDto,
  ): Promise<SellerProductDiscountItem> {
    const seller = await this.resolveActiveSeller(sellerUserId);
    const existing = await this.prisma.sellerProductDiscount.findFirst({
      where: { id: discountId, sellerId: seller.id },
      include: {
        sellerProduct: { include: { variant: { select: { mrp: true } } } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Discount not found.');
    }
    if (
      existing.status === SellerDiscountStatus.ENDED ||
      existing.status === SellerDiscountStatus.EXPIRED
    ) {
      throw new ConflictException(`Cannot edit a discount in ${existing.status} status.`);
    }

    const discountType = dto.discountType ?? existing.discountType;
    const discountValue = dto.discountValue ?? Number(existing.discountValue);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt;
    const basePaise = toPaise(existing.sellerProduct.sellingPrice);
    const mrpPaise = Math.max(
      toPaise(existing.sellerProduct.variant?.mrp ?? existing.sellerProduct.sellingPrice),
      basePaise,
    );

    this.validateDiscountBounds({
      discountType,
      discountValue,
      baseSellingPricePaise: basePaise,
      mrpPaise,
      startsAt,
      expiresAt,
    });

    const updated = await this.prisma.sellerProductDiscount.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title?.trim() || null } : {}),
        discountType,
        discountValue: new Decimal(discountValue),
        startsAt,
        expiresAt,
      },
      include: DISCOUNT_INCLUDE,
    });

    return this.mapDiscount(updated);
  }

  async transitionDiscountStatus(
    sellerUserId: string,
    discountId: string,
    action: 'activate' | 'pause' | 'end',
  ): Promise<SellerProductDiscountItem> {
    const seller = await this.resolveActiveSeller(sellerUserId);
    const existing = await this.prisma.sellerProductDiscount.findFirst({
      where: { id: discountId, sellerId: seller.id },
      include: DISCOUNT_INCLUDE,
    });
    if (!existing) {
      throw new NotFoundException('Discount not found.');
    }

    const now = new Date();
    let targetStatus: SellerDiscountStatus;
    if (action === 'activate') {
      if (existing.expiresAt <= now) {
        throw new BadRequestException('Cannot activate an expired discount.');
      }
      targetStatus =
        existing.startsAt > now ? SellerDiscountStatus.SCHEDULED : SellerDiscountStatus.ACTIVE;
    } else if (action === 'pause') {
      targetStatus = SellerDiscountStatus.PAUSED;
    } else {
      targetStatus = SellerDiscountStatus.ENDED;
    }

    assertValidSellerDiscountTransition(existing.status, targetStatus);

    const updated = await this.prisma.sellerProductDiscount.update({
      where: { id: existing.id },
      data: {
        status: targetStatus,
        ...(targetStatus === SellerDiscountStatus.PAUSED ? { pausedAt: now } : {}),
        ...(targetStatus === SellerDiscountStatus.ENDED ? { endedAt: now } : {}),
      },
      include: DISCOUNT_INCLUDE,
    });

    return this.mapDiscount(updated);
  }
}
