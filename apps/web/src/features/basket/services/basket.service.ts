import {
  BasketStateResponse,
  CartRevalidationResponse,
  StoreSwitchComparison,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class BasketService {
  static async getCart(): Promise<BasketStateResponse> {
    const res = await apiClient.get<BasketStateResponse>(ENDPOINTS.CART.ROOT);
    return res.data!;
  }

  static async addItem(payload: {
    sellerProductId: string;
    quantity: number;
    confirmStoreSwitch?: boolean;
  }): Promise<BasketStateResponse> {
    const res = await apiClient.post<BasketStateResponse>(ENDPOINTS.CART.ITEMS, payload);
    return res.data!;
  }

  static async updateItem(itemId: string, quantity: number): Promise<BasketStateResponse> {
    const res = await apiClient.patch<BasketStateResponse>(ENDPOINTS.CART.ITEM_BY_ID(itemId), {
      quantity,
    });
    return res.data!;
  }

  static async removeItem(itemId: string): Promise<BasketStateResponse> {
    const res = await apiClient.delete<BasketStateResponse>(ENDPOINTS.CART.ITEM_BY_ID(itemId));
    return res.data!;
  }

  static async clearCart(): Promise<BasketStateResponse> {
    const res = await apiClient.delete<BasketStateResponse>(ENDPOINTS.CART.ROOT);
    return res.data!;
  }

  static async compareStoreSwitch(payload: {
    currentStoreId?: string;
    targetStoreId?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    items: Array<{
      sellerProductId?: string;
      productId?: string;
      variantId: string;
      productName?: string;
      packSize?: string;
      quantity: number;
      unitPrice: number;
    }>;
  }): Promise<StoreSwitchComparison> {
    const res = await apiClient.post<StoreSwitchComparison>(ENDPOINTS.CART.COMPARE_STORE, payload);
    return res.data!;
  }

  static async applyStoreSwitch(targetStoreId: string): Promise<BasketStateResponse> {
    const res = await apiClient.post<BasketStateResponse>(ENDPOINTS.CART.APPLY_STORE_SWITCH, {
      targetStoreId,
    });
    return res.data!;
  }

  static async syncCart(
    items: Array<{ sellerProductId: string; quantity: number }>,
  ): Promise<BasketStateResponse> {
    const res = await apiClient.post<BasketStateResponse>(ENDPOINTS.CART.SYNC, { items });
    return res.data!;
  }

  static async revalidateCart(payload: {
    storeId: string;
    items: Array<{
      listingId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
    }>;
  }): Promise<CartRevalidationResponse> {
    const res = await apiClient.post<CartRevalidationResponse>(
      ENDPOINTS.INVENTORY.REVALIDATE_CART,
      payload,
    );
    return res.data!;
  }
}
