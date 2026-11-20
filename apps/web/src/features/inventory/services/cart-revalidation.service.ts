import { InventoryService } from './inventory.service';
import { CartItemRevalidationInput, CartItemRevalidationResult } from '@marvels-basket/shared';

export interface CartRevalidationResponse {
  isOrderable: boolean;
  hasPriceChanges: boolean;
  hasQuantityAdjustments: boolean;
  items: CartItemRevalidationResult[];
}

export class CartRevalidationService {
  /**
   * Revalidates an in-memory or persisted customer basket against live store pricing,
   * stock on hand, and active status prior to checkout, without acquiring premature locks.
   */
  static async revalidateCustomerCart(
    items: CartItemRevalidationInput[],
    storeId?: string,
  ): Promise<CartRevalidationResponse> {
    return InventoryService.revalidateCart(items, storeId);
  }
}
