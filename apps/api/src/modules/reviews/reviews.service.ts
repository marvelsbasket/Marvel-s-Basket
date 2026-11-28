import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { OrderStatus, Prisma, ReviewStatus } from '@prisma/client';
import {
  MyReviewItem,
  PaginatedPublicReviewsResponse,
  PublicReviewItem,
  ReviewEligibilityResponse,
  ReviewStatusType,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../cache/redis.service';
import { RatingAggregationService } from './rating-aggregation.service';
import { sanitizeAndValidateReviewText } from './review-sanitizer';
import {
  CreateReviewDto,
  QueryProductReviewsDto,
  ReportReviewDto,
  UpdateReviewDto,
} from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingAggregation: RatingAggregationService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private async enforceRateLimit(key: string, maxRequests: number, windowSeconds: number) {
    if (!this.redis) return;
    try {
      const client = this.redis.getClient();
      if (!client) return;
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, windowSeconds);
      }
      if (count > maxRequests) {
        throw new BadRequestException({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        });
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPublicReview(r: any): PublicReviewItem {
    return {
      id: r.id,
      productId: r.productId,
      authorName: r.user?.name || 'Verified Customer',
      rating: r.rating,
      title: r.title ?? null,
      comment: r.comment ?? null,
      isVerifiedPurchase: Boolean(r.isVerifiedPurchase),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapMyReview(r: any): MyReviewItem {
    return {
      ...this.mapPublicReview(r),
      status: r.status as ReviewStatusType,
      productName: r.product?.name || 'Product',
      productSlug: r.product?.slug || '',
      orderItemId: r.orderItemId ?? null,
    };
  }

  /**
   * Checks whether the authenticated customer is eligible to review a product:
   * - Must have a DELIVERED order containing the product in OrderItem snapshot.
   * - Enforces one review per customer per master product.
   */
  async checkEligibility(
    userId: string,
    productId: string,
  ): Promise<ReviewEligibilityResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true, status: true },
    });
    if (existing) {
      return {
        eligible: false,
        reason:
          existing.status === ReviewStatus.REMOVED
            ? 'Your previous review for this product was removed.'
            : 'You have already submitted a review for this product.',
        existingReviewId: existing.id,
        eligibleOrderItemId: null,
      };
    }

    const eligibleItem = await this.prisma.orderItem.findFirst({
      where: {
        order: {
          customerId: userId,
          status: OrderStatus.DELIVERED,
        },
        OR: [
          { productIdSnapshot: productId },
          { sellerProduct: { productId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!eligibleItem) {
      return {
        eligible: false,
        reason: 'Only customers with a delivered purchase of this product can submit a review.',
        existingReviewId: null,
        eligibleOrderItemId: null,
      };
    }

    return {
      eligible: true,
      reason: null,
      existingReviewId: null,
      eligibleOrderItemId: eligibleItem.id,
    };
  }

  async createReview(userId: string, dto: CreateReviewDto): Promise<MyReviewItem> {
    await this.enforceRateLimit(`rl:review:create:${userId}`, 10, 3600);

    const sanitizedComment = sanitizeAndValidateReviewText(dto.comment, 'Review comment', 5);
    const sanitizedTitle = dto.title
      ? sanitizeAndValidateReviewText(dto.title, 'Review title', 1)
      : null;

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    // Verify genuine DELIVERED purchase
    const eligibleItem = await this.prisma.orderItem.findFirst({
      where: {
        order: {
          customerId: userId,
          status: OrderStatus.DELIVERED,
        },
        OR: [
          { productIdSnapshot: dto.productId },
          { sellerProduct: { productId: dto.productId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { sellerId: true } } },
    });

    if (!eligibleItem) {
      throw new ForbiddenException({
        code: 'REVIEW_NOT_ELIGIBLE',
        message: 'You can only review products from your delivered orders.',
      });
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: {
            userId,
            productId: dto.productId,
            sellerId: eligibleItem.order.sellerId,
            sellerProductId: eligibleItem.sellerProductId,
            orderItemId: eligibleItem.id,
            rating: dto.rating,
            title: sanitizedTitle,
            comment: sanitizedComment,
            status: ReviewStatus.PENDING,
            isPublished: false,
            isVerifiedPurchase: true,
          },
          include: {
            user: { select: { name: true } },
            product: { select: { name: true, slug: true } },
          },
        });

        await tx.reviewModerationLog.create({
          data: {
            reviewId: review.id,
            previousStatus: null,
            newStatus: ReviewStatus.PENDING,
            actorUserId: userId,
            actorRole: 'CUSTOMER',
            action: 'SUBMITTED',
            reason: 'Customer submitted verified-purchase review for moderation',
          },
        });

        return review;
      });

      return this.mapMyReview(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'You have already reviewed this product.',
        });
      }
      throw err;
    }
  }

  async updateMyReview(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<MyReviewItem> {
    const existing = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Review not found.');
    }
    if (existing.status === ReviewStatus.REMOVED) {
      throw new ConflictException('Removed reviews cannot be edited.');
    }

    const nextRating = dto.rating ?? existing.rating;
    const nextTitle =
      dto.title !== undefined
        ? dto.title.trim()
          ? sanitizeAndValidateReviewText(dto.title, 'Review title', 1)
          : null
        : existing.title;
    const nextComment =
      dto.comment !== undefined
        ? sanitizeAndValidateReviewText(dto.comment, 'Review comment', 5)
        : existing.comment;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Editing an approved/rejected review moves it back to PENDING for re-moderation
      const nextStatus = ReviewStatus.PENDING;
      const saved = await tx.review.update({
        where: { id: existing.id },
        data: {
          rating: nextRating,
          title: nextTitle,
          comment: nextComment,
          status: nextStatus,
          isPublished: false,
        },
        include: {
          user: { select: { name: true } },
          product: { select: { name: true, slug: true } },
        },
      });

      await tx.reviewModerationLog.create({
        data: {
          reviewId: existing.id,
          previousStatus: existing.status,
          newStatus: nextStatus,
          actorUserId: userId,
          actorRole: 'CUSTOMER',
          action: 'EDITED',
          reason: 'Customer edited review; queued for re-moderation',
          metadata: { previousRating: existing.rating, newRating: nextRating },
        },
      });

      if (existing.status === ReviewStatus.APPROVED) {
        await this.ratingAggregation.recomputeProductAggregateInTx(tx, existing.productId);
      }

      return saved;
    });

    return this.mapMyReview(updated);
  }

  async deleteMyReview(userId: string, reviewId: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Review not found.');
    }
    if (existing.status === ReviewStatus.REMOVED) {
      return { deleted: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: existing.id },
        data: {
          status: ReviewStatus.REMOVED,
          isPublished: false,
        },
      });

      await tx.reviewModerationLog.create({
        data: {
          reviewId: existing.id,
          previousStatus: existing.status,
          newStatus: ReviewStatus.REMOVED,
          actorUserId: userId,
          actorRole: 'CUSTOMER',
          action: 'CUSTOMER_REMOVED',
          reason: 'Customer soft-deleted their review',
        },
      });

      if (existing.status === ReviewStatus.APPROVED) {
        await this.ratingAggregation.recomputeProductAggregateInTx(tx, existing.productId);
      }
    });

    return { deleted: true };
  }

  async listProductReviews(
    productId: string,
    query: QueryProductReviewsDto,
  ): Promise<PaginatedPublicReviewsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      productId,
      status: ReviewStatus.APPROVED,
      isPublished: true,
      ...(query.rating ? { rating: query.rating } : {}),
    };

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      query.sort === 'highest'
        ? { rating: 'desc' }
        : query.sort === 'lowest'
          ? { rating: 'asc' }
          : { createdAt: 'desc' };

    const [summary, items, total] = await Promise.all([
      this.ratingAggregation.getProductRatingSummary(productId),
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      summary,
      items: items.map((r) => this.mapPublicReview(r)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listMyReviews(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.ReviewWhereInput = {
      userId,
      status: { not: ReviewStatus.REMOVED },
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { name: true } },
          product: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: items.map((r) => this.mapMyReview(r)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async reportReview(userId: string, reviewId: string, dto: ReportReviewDto) {
    await this.enforceRateLimit(`rl:review:report:${userId}`, 15, 3600);

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, status: true },
    });
    if (!review || review.status !== ReviewStatus.APPROVED) {
      throw new NotFoundException('Review not found.');
    }
    if (review.userId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_REPORT_OWN_REVIEW',
        message: 'You cannot report your own review.',
      });
    }

    const explanation = dto.explanation
      ? sanitizeAndValidateReviewText(dto.explanation, 'Report explanation', 1)
      : null;

    try {
      const report = await this.prisma.reviewReport.create({
        data: {
          reviewId: review.id,
          reporterUserId: userId,
          reason: dto.reason,
          explanation,
        },
      });
      return {
        id: report.id,
        reviewId: report.reviewId,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_REPORTED',
          message: 'You have already reported this review.',
        });
      }
      throw err;
    }
  }
}
