import {
  AdminReviewDetailResponse,
  AdminReviewItem,
  MyReviewItem,
  PaginatedAdminReviewsResponse,
  PaginatedPublicReviewsResponse,
  PaginatedReviewReportsResponse,
  ReviewEligibilityResponse,
  ReviewReportReasonType,
  ReviewStatusType,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class ReviewsService {
  static async listProductReviews(
    productId: string,
    params?: { sort?: 'recent' | 'highest' | 'lowest'; rating?: number; page?: number; limit?: number },
  ): Promise<PaginatedPublicReviewsResponse> {
    const res = await apiClient.get<PaginatedPublicReviewsResponse>(
      ENDPOINTS.REVIEWS.PRODUCT_REVIEWS(productId),
      { params },
    );
    return res.data!;
  }

  static async checkEligibility(productId: string): Promise<ReviewEligibilityResponse> {
    const res = await apiClient.get<ReviewEligibilityResponse>(
      ENDPOINTS.REVIEWS.ELIGIBILITY(productId),
    );
    return res.data!;
  }

  static async createReview(payload: {
    productId: string;
    rating: number;
    title?: string;
    comment: string;
  }): Promise<MyReviewItem> {
    const res = await apiClient.post<MyReviewItem>(ENDPOINTS.REVIEWS.CREATE, payload);
    return res.data!;
  }

  static async listMyReviews(page = 1, limit = 20): Promise<{
    items: MyReviewItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const res = await apiClient.get<{
      items: MyReviewItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(ENDPOINTS.REVIEWS.MY_REVIEWS, { params: { page, limit } });
    return res.data!;
  }

  static async updateReview(
    reviewId: string,
    payload: { rating?: number; title?: string; comment?: string },
  ): Promise<MyReviewItem> {
    const res = await apiClient.patch<MyReviewItem>(ENDPOINTS.REVIEWS.UPDATE(reviewId), payload);
    return res.data!;
  }

  static async deleteReview(reviewId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.REVIEWS.DELETE(reviewId));
  }

  static async reportReview(
    reviewId: string,
    reason: ReviewReportReasonType,
    explanation?: string,
  ): Promise<void> {
    await apiClient.post(ENDPOINTS.REVIEWS.REPORT(reviewId), { reason, explanation });
  }

  // Admin
  static async listAdminReviews(params?: {
    status?: ReviewStatusType;
    rating?: number;
    search?: string;
    reportedOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedAdminReviewsResponse> {
    const res = await apiClient.get<PaginatedAdminReviewsResponse>(ENDPOINTS.ADMIN_REVIEWS.LIST, {
      params,
    });
    return res.data!;
  }

  static async getAdminReviewDetail(reviewId: string): Promise<AdminReviewDetailResponse> {
    const res = await apiClient.get<AdminReviewDetailResponse>(
      ENDPOINTS.ADMIN_REVIEWS.DETAIL(reviewId),
    );
    return res.data!;
  }

  static async approveReview(reviewId: string, reason?: string): Promise<AdminReviewItem> {
    const res = await apiClient.post<AdminReviewItem>(ENDPOINTS.ADMIN_REVIEWS.APPROVE(reviewId), {
      reason,
    });
    return res.data!;
  }

  static async rejectReview(reviewId: string, reason: string): Promise<AdminReviewItem> {
    const res = await apiClient.post<AdminReviewItem>(ENDPOINTS.ADMIN_REVIEWS.REJECT(reviewId), {
      reason,
    });
    return res.data!;
  }

  static async hideReview(reviewId: string, reason?: string): Promise<AdminReviewItem> {
    const res = await apiClient.post<AdminReviewItem>(ENDPOINTS.ADMIN_REVIEWS.HIDE(reviewId), {
      reason,
    });
    return res.data!;
  }

  static async restoreReview(reviewId: string, reason?: string): Promise<AdminReviewItem> {
    const res = await apiClient.post<AdminReviewItem>(ENDPOINTS.ADMIN_REVIEWS.RESTORE(reviewId), {
      reason,
    });
    return res.data!;
  }

  static async listReports(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedReviewReportsResponse> {
    const res = await apiClient.get<PaginatedReviewReportsResponse>(
      ENDPOINTS.ADMIN_REVIEWS.REPORTS,
      { params },
    );
    return res.data!;
  }

  static async resolveReport(
    reportId: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolutionNote?: string,
  ): Promise<void> {
    await apiClient.post(ENDPOINTS.ADMIN_REVIEWS.RESOLVE_REPORT(reportId), {
      status,
      resolutionNote,
    });
  }
}
