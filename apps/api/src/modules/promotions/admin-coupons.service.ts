import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AdminCouponItem,
  PaginatedCouponsResponse,
  PublicOfferItem,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CreateCouponDto, QueryCouponsDto, UpdateCouponDto } from './dto/promotions.dto';

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCoupon(c: any): AdminCouponItem {
    return {
      id: c.id,
      code: c.code,
      description: c.description ?? null,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minimumOrderAmount: Number(c.minimumOrderAmount),
      maximumDiscount: c.maximumDiscount !== null ? Number(c.maximumDiscount) : null,
      usageLimit: c.usageLimit ?? null,
      currentUsageCount: c.currentUsageCount ?? 0,
      perUserLimit: c.perUserLimit ?? 1,
      firstOrderOnly: Boolean(c.firstOrderOnly),
      isStackableWithSellerDiscount: Boolean(c.isStackableWithSellerDiscount),
      startsAt: new Date(c.startsAt).toISOString(),
      expiresAt: new Date(c.expiresAt).toISOString(),
      isActive: Boolean(c.isActive),
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
    };
  }

  private validateCouponDatesAndValues(params: {
    discountType: DiscountType;
    discountValue: number;
    startsAt: Date;
    expiresAt: Date;
  }) {
    if (params.expiresAt <= params.startsAt) {
      throw new BadRequestException('Coupon expiry time must be after start time.');
    }
    if (params.discountType === DiscountType.PERCENTAGE && params.discountValue > 100) {
      throw new BadRequestException('Percentage coupon cannot exceed 100%.');
    }
  }

  async createCoupon(adminUserId: string, dto: CreateCouponDto): Promise<AdminCouponItem> {
    const code = dto.code.trim().toUpperCase();
    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);

    this.validateCouponDatesAndValues({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      startsAt,
      expiresAt,
    });

    try {
      const created = await this.prisma.coupon.create({
        data: {
          code,
          description: dto.description?.trim() || null,
          discountType: dto.discountType,
          discountValue: new Decimal(dto.discountValue),
          minimumOrderAmount: new Decimal(dto.minimumOrderAmount ?? 0),
          maximumDiscount:
            dto.maximumDiscount !== undefined ? new Decimal(dto.maximumDiscount) : null,
          usageLimit: dto.usageLimit ?? null,
          perUserLimit: dto.perUserLimit ?? 1,
          firstOrderOnly: Boolean(dto.firstOrderOnly),
          isStackableWithSellerDiscount: dto.isStackableWithSellerDiscount !== false,
          startsAt,
          expiresAt,
          isActive: dto.isActive !== false,
        },
      });

      await this.prisma.adminActivityLog.create({
        data: {
          adminUserId,
          action: 'CREATE_COUPON',
          module: 'PROMOTIONS',
          description: `Created coupon ${created.code}`,
          metadata: { couponId: created.id, code: created.code },
        },
      });

      return this.mapCoupon(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Coupon code "${code}" already exists.`);
      }
      throw err;
    }
  }

  async listCoupons(query: QueryCouponsDto): Promise<PaginatedCouponsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {
      ...(query.search?.trim()
        ? {
            OR: [
              { code: { contains: query.search.trim(), mode: 'insensitive' } },
              { description: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      items: items.map((c) => this.mapCoupon(c)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getCoupon(couponId: string): Promise<AdminCouponItem> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('Coupon not found.');
    return this.mapCoupon(coupon);
  }

  async updateCoupon(
    adminUserId: string,
    couponId: string,
    dto: UpdateCouponDto,
  ): Promise<AdminCouponItem> {
    const existing = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) throw new NotFoundException('Coupon not found.');

    const discountType = dto.discountType ?? existing.discountType;
    const discountValue = dto.discountValue ?? Number(existing.discountValue);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt;

    this.validateCouponDatesAndValues({ discountType, discountValue, startsAt, expiresAt });

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        discountType,
        discountValue: new Decimal(discountValue),
        ...(dto.minimumOrderAmount !== undefined
          ? { minimumOrderAmount: new Decimal(dto.minimumOrderAmount) }
          : {}),
        ...(dto.maximumDiscount !== undefined
          ? {
              maximumDiscount:
                dto.maximumDiscount !== null ? new Decimal(dto.maximumDiscount) : null,
            }
          : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.perUserLimit !== undefined ? { perUserLimit: dto.perUserLimit } : {}),
        ...(dto.firstOrderOnly !== undefined ? { firstOrderOnly: dto.firstOrderOnly } : {}),
        ...(dto.isStackableWithSellerDiscount !== undefined
          ? { isStackableWithSellerDiscount: dto.isStackableWithSellerDiscount }
          : {}),
        startsAt,
        expiresAt,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.prisma.adminActivityLog.create({
      data: {
        adminUserId,
        action: 'UPDATE_COUPON',
        module: 'PROMOTIONS',
        description: `Updated coupon ${updated.code}`,
        metadata: { couponId: updated.id, code: updated.code },
      },
    });

    return this.mapCoupon(updated);
  }

  async setCouponActive(
    adminUserId: string,
    couponId: string,
    isActive: boolean,
  ): Promise<AdminCouponItem> {
    const existing = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) throw new NotFoundException('Coupon not found.');

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive },
    });

    await this.prisma.adminActivityLog.create({
      data: {
        adminUserId,
        action: isActive ? 'ACTIVATE_COUPON' : 'PAUSE_COUPON',
        module: 'PROMOTIONS',
        description: `${isActive ? 'Activated' : 'Paused'} coupon ${updated.code}`,
        metadata: { couponId: updated.id, code: updated.code },
      },
    });

    return this.mapCoupon(updated);
  }

  async listPublicActiveOffers(): Promise<PublicOfferItem[]> {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
      take: 25,
    });

    return coupons
      .filter((c) => c.usageLimit === null || c.currentUsageCount < c.usageLimit)
      .map((c) => ({
        code: c.code,
        description: c.description ?? null,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        minimumOrderAmount: Number(c.minimumOrderAmount),
        maximumDiscount: c.maximumDiscount !== null ? Number(c.maximumDiscount) : null,
        firstOrderOnly: Boolean(c.firstOrderOnly),
        expiresAt: c.expiresAt.toISOString(),
      }));
  }
}
