import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import {
  AdminReviewDetailResponse,
  AdminReviewItem,
  PaginatedAdminReviewsResponse,
  PaginatedReviewReportsResponse,
  ProductRatingSummary,
  ReviewReportStatusType,
  ReviewStatusType,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { RatingAggregationService } from './rating-aggregation.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ModerateReviewDto,
  QueryAdminReviewsDto,
  RejectReviewDto,
  ResolveReportDto,
} from './dto/reviews.dto';

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingAggregation: RatingAggregationService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAdminReview(r: any): AdminReviewItem {
    return {
      id: r.id,
      productId: r.productId,
      productName: r.product?.name || 'Product',
      userId: r.userId,
      authorName: r.user?.name || 'Customer',
      rating: r.rating,
      title: r.title ?? null,
      comment: r.comment ?? null,
      status: r.status as ReviewStatusType,
      moderationReason: r.moderationReason ?? null,
      isVerifiedPurchase: Boolean(r.isVerifiedPurchase),
      isPublished: Boolean(r.isPublished),
      reportCount: r._count?.reports ?? r.reports?.length ?? 0,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  async listReviews(query: QueryAdminReviewsDto): Promise<PaginatedAdminReviewsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.reportedOnly ? { reports: { some: { status: 'OPEN' } } } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { title: { contains: query.search.trim(), mode: 'insensitive' } },
              { comment: { contains: query.search.trim(), mode: 'insensitive' } },
              { product: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
              { user: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total, grouped] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { name: true } },
          product: { select: { name: true } },
          _count: { select: { reports: true } },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const g of grouped) {
      statusCounts[g.status] = g._count._all;
    }

    return {
      items: items.map((r) => this.mapAdminReview(r)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      statusCounts,
    };
  }

  async getReviewDetail(reviewId: string): Promise<AdminReviewDetailResponse> {
    const r = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
        reports: { orderBy: { createdAt: 'desc' } },
        moderationLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!r) throw new NotFoundException('Review not found.');

    return {
      ...this.mapAdminReview(r),
      reports: r.reports.map((rep) => ({
        id: rep.id,
        reviewId: rep.reviewId,
        reason: rep.reason,
        explanation: rep.explanation ?? null,
        status: rep.status as ReviewReportStatusType,
        resolutionNote: rep.resolutionNote ?? null,
        resolvedAt: rep.resolvedAt ? rep.resolvedAt.toISOString() : null,
        createdAt: rep.createdAt.toISOString(),
      })),
      moderationLogs: r.moderationLogs.map((l) => ({
        id: l.id,
        previousStatus: l.previousStatus as ReviewStatusType | null,
        newStatus: l.newStatus as ReviewStatusType,
        actorRole: l.actorRole,
        action: l.action,
        reason: l.reason ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  private async transitionModerationStatus(params: {
    adminUserId: string;
    reviewId: string;
    targetStatus: ReviewStatus;
    action: string;
    reason?: string;
    allowedFromStatuses?: ReviewStatus[];
  }): Promise<AdminReviewItem> {
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id: params.reviewId },
        include: {
          user: { select: { name: true } },
          product: { select: { name: true } },
          _count: { select: { reports: true } },
        },
      });
      if (!existing) throw new NotFoundException('Review not found.');

      if (existing.status === ReviewStatus.REMOVED) {
        throw new ConflictException('Customer-removed reviews cannot be re-published.');
      }

      if (existing.status === params.targetStatus) {
        return existing;
      }

      if (
        params.allowedFromStatuses &&
        !params.allowedFromStatuses.includes(existing.status)
      ) {
        throw new ConflictException(
          `Cannot transition review from ${existing.status} to ${params.targetStatus} via ${params.action}.`,
        );
      }

      const isPublished = params.targetStatus === ReviewStatus.APPROVED;
      const saved = await tx.review.update({
        where: { id: existing.id },
        data: {
          status: params.targetStatus,
          isPublished,
          moderationReason: params.reason?.trim() || null,
          moderatedBy: params.adminUserId,
          moderatedAt: now,
        },
        include: {
          user: { select: { name: true } },
          product: { select: { name: true } },
          _count: { select: { reports: true } },
        },
      });

      await tx.reviewModerationLog.create({
        data: {
          reviewId: existing.id,
          previousStatus: existing.status,
          newStatus: params.targetStatus,
          actorUserId: params.adminUserId,
          actorRole: 'ADMIN',
          action: params.action,
          reason: params.reason?.trim() || null,
        },
      });

      await tx.adminActivityLog.create({
        data: {
          adminUserId: params.adminUserId,
          action: params.action,
          module: 'REVIEWS',
          description: `Review ${existing.id} -> ${params.targetStatus}`,
          metadata: { reviewId: existing.id, productId: existing.productId },
        },
      });

      await this.ratingAggregation.recomputeProductAggregateInTx(tx, existing.productId);
      return saved;
    });

    if (
      this.notificationsService &&
      (params.targetStatus === ReviewStatus.APPROVED ||
        params.targetStatus === ReviewStatus.REJECTED)
    ) {
      void this.notificationsService.publishEvent({
        eventKey:
          params.targetStatus === ReviewStatus.APPROVED
            ? 'REVIEW_APPROVED'
            : 'REVIEW_REJECTED',
        aggregateType: 'Review',
        aggregateId: updated.id,
        recipientUserId: updated.userId,
        idempotencyKey: `review_moderated:${updated.id}:${params.targetStatus}:${updated.updatedAt.toISOString()}`,
        payload: {
          reviewId: updated.id,
          productId: updated.productId,
          productName: updated.product?.name || 'a product',
          reason: params.reason ?? null,
          actionUrl: '/reviews',
        },
      });
    }

    return this.mapAdminReview(updated);
  }

  async approveReview(adminUserId: string, reviewId: string, dto: ModerateReviewDto) {
    return this.transitionModerationStatus({
      adminUserId,
      reviewId,
      targetStatus: ReviewStatus.APPROVED,
      action: 'APPROVE_REVIEW',
      reason: dto.reason,
    });
  }

  async rejectReview(adminUserId: string, reviewId: string, dto: RejectReviewDto) {
    return this.transitionModerationStatus({
      adminUserId,
      reviewId,
      targetStatus: ReviewStatus.REJECTED,
      action: 'REJECT_REVIEW',
      reason: dto.reason,
    });
  }

  async hideReview(adminUserId: string, reviewId: string, dto: ModerateReviewDto) {
    return this.transitionModerationStatus({
      adminUserId,
      reviewId,
      targetStatus: ReviewStatus.HIDDEN,
      action: 'HIDE_REVIEW',
      reason: dto.reason || 'Hidden by administrator',
    });
  }

  async restoreReview(adminUserId: string, reviewId: string, dto: ModerateReviewDto) {
    return this.transitionModerationStatus({
      adminUserId,
      reviewId,
      targetStatus: ReviewStatus.APPROVED,
      action: 'RESTORE_REVIEW',
      reason: dto.reason || 'Restored by administrator',
      allowedFromStatuses: [ReviewStatus.HIDDEN, ReviewStatus.REJECTED],
    });
  }

  async listReports(
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedReviewReportsResponse> {
    const skip = (page - 1) * limit;
    const where: Prisma.ReviewReportWhereInput = status
      ? { status: status as 'OPEN' | 'RESOLVED' | 'DISMISSED' }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.reviewReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          review: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
      this.prisma.reviewReport.count({ where }),
    ]);

    return {
      items: items.map((rep) => ({
        id: rep.id,
        reviewId: rep.reviewId,
        reason: rep.reason,
        explanation: rep.explanation ?? null,
        status: rep.status as ReviewReportStatusType,
        resolutionNote: rep.resolutionNote ?? null,
        resolvedAt: rep.resolvedAt ? rep.resolvedAt.toISOString() : null,
        createdAt: rep.createdAt.toISOString(),
        reviewSummary: {
          productId: rep.review.productId,
          productName: rep.review.product?.name || 'Product',
          rating: rep.review.rating,
          title: rep.review.title ?? null,
          comment: rep.review.comment ?? null,
          status: rep.review.status as ReviewStatusType,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async resolveReport(adminUserId: string, reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.reviewReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Review report not found.');

    const updated = await this.prisma.reviewReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote?.trim() || null,
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      reviewId: updated.reviewId,
      status: updated.status,
      resolutionNote: updated.resolutionNote,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    };
  }

  async reconcileProductRating(productId: string): Promise<ProductRatingSummary> {
    return this.prisma.$transaction((tx) =>
      this.ratingAggregation.recomputeProductAggregateInTx(tx, productId),
    );
  }
}
