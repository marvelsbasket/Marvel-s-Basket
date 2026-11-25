import { CheckoutSummaryResponse } from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export interface PrepareCheckoutPayload {
  addressId: string;
  couponCode?: string | null;
  idempotencyKey?: string;
  expectedItemPrices?: Array<{
    sellerProductId: string;
    unitPrice: number;
    quantity?: number;
  }>;
}

export class CheckoutService {
  static async prepareCheckout(payload: PrepareCheckoutPayload): Promise<CheckoutSummaryResponse> {
    const res = await apiClient.post<CheckoutSummaryResponse>(ENDPOINTS.CHECKOUT.PREPARE, payload);
    return res.data!;
  }

  static async getSummary(sessionId?: string): Promise<CheckoutSummaryResponse> {
    const path = sessionId
      ? `${ENDPOINTS.CHECKOUT.SUMMARY}?sessionId=${encodeURIComponent(sessionId)}`
      : ENDPOINTS.CHECKOUT.SUMMARY;
    const res = await apiClient.get<CheckoutSummaryResponse>(path);
    return res.data!;
  }

  static async cancelCheckout(
    checkoutSessionId?: string,
  ): Promise<{ cancelled: boolean; releasedCount: number; message: string }> {
    const res = await apiClient.post<{
      cancelled: boolean;
      releasedCount: number;
      message: string;
    }>(ENDPOINTS.CHECKOUT.CANCEL, checkoutSessionId ? { checkoutSessionId } : {});
    return res.data!;
  }
}
