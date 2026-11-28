import {
  AdminCouponItem,
  DiscountTypeValue,
  PaginatedCouponsResponse,
  PaginatedSellerDiscountsResponse,
  PublicOfferItem,
  SellerDiscountStatusType,
  SellerProductDiscountItem,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class PromotionsService {
  static async listPublicOffers(): Promise<PublicOfferItem[]> {
    const res = await apiClient.get<PublicOfferItem[]>(ENDPOINTS.PROMOTIONS.PUBLIC_OFFERS);
    return res.data || [];
  }

  // Seller Product Discounts
  static async listSellerDiscounts(params?: {
    status?: SellerDiscountStatusType;
    page?: number;
    limit?: number;
  }): Promise<PaginatedSellerDiscountsResponse> {
    const res = await apiClient.get<PaginatedSellerDiscountsResponse>(
      ENDPOINTS.PROMOTIONS.SELLER_DISCOUNTS,
      { params },
    );
    return res.data!;
  }

  static async createSellerDiscount(payload: {
    sellerProductId: string;
    title?: string;
    discountType: DiscountTypeValue;
    discountValue: number;
    startsAt: string;
    expiresAt: string;
    publishImmediately?: boolean;
  }): Promise<SellerProductDiscountItem> {
    const res = await apiClient.post<SellerProductDiscountItem>(
      ENDPOINTS.PROMOTIONS.SELLER_DISCOUNTS,
      payload,
    );
    return res.data!;
  }

  static async activateSellerDiscount(id: string): Promise<SellerProductDiscountItem> {
    const res = await apiClient.post<SellerProductDiscountItem>(
      ENDPOINTS.PROMOTIONS.SELLER_DISCOUNT_ACTIVATE(id),
      {},
    );
    return res.data!;
  }

  static async pauseSellerDiscount(id: string): Promise<SellerProductDiscountItem> {
    const res = await apiClient.post<SellerProductDiscountItem>(
      ENDPOINTS.PROMOTIONS.SELLER_DISCOUNT_PAUSE(id),
      {},
    );
    return res.data!;
  }

  static async endSellerDiscount(id: string): Promise<SellerProductDiscountItem> {
    const res = await apiClient.post<SellerProductDiscountItem>(
      ENDPOINTS.PROMOTIONS.SELLER_DISCOUNT_END(id),
      {},
    );
    return res.data!;
  }

  // Admin Platform Coupons
  static async listAdminCoupons(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedCouponsResponse> {
    const res = await apiClient.get<PaginatedCouponsResponse>(
      ENDPOINTS.PROMOTIONS.ADMIN_COUPONS,
      { params },
    );
    return res.data!;
  }

  static async createCoupon(payload: {
    code: string;
    description?: string;
    discountType: DiscountTypeValue;
    discountValue: number;
    minimumOrderAmount?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    firstOrderOnly?: boolean;
    isStackableWithSellerDiscount?: boolean;
    startsAt: string;
    expiresAt: string;
  }): Promise<AdminCouponItem> {
    const res = await apiClient.post<AdminCouponItem>(
      ENDPOINTS.PROMOTIONS.ADMIN_COUPONS,
      payload,
    );
    return res.data!;
  }

  static async setCouponActive(id: string, active: boolean): Promise<AdminCouponItem> {
    const url = active
      ? ENDPOINTS.PROMOTIONS.ADMIN_COUPON_ACTIVATE(id)
      : ENDPOINTS.PROMOTIONS.ADMIN_COUPON_PAUSE(id);
    const res = await apiClient.post<AdminCouponItem>(url, {});
    return res.data!;
  }
}
