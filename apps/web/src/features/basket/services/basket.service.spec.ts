import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { BasketService } from './basket.service';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('BasketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('addItem posts to /cart/items with sellerProductId and quantity', async () => {
    const cartState = { items: [], itemCount: 0, totalUnits: 0, subtotal: 0 };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: cartState });

    const res = await BasketService.addItem({
      sellerProductId: 'sp-1',
      quantity: 2,
    });

    expect(res).toEqual(cartState);
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.CART.ITEMS, {
      sellerProductId: 'sp-1',
      quantity: 2,
    });
  });

  it('compareStoreSwitch posts items against candidate store/postalCode', async () => {
    const diff = {
      isServiceable: true,
      compatibleItems: [],
      unavailableItems: [],
      priceChangesCount: 0,
      unavailableCount: 0,
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: diff });

    const res = await BasketService.compareStoreSwitch({
      currentStoreId: 'store-1',
      postalCode: '560095',
      items: [{ variantId: 'v-1', quantity: 1, unitPrice: 33 }],
    });

    expect(res.isServiceable).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.CART.COMPARE_STORE, {
      currentStoreId: 'store-1',
      postalCode: '560095',
      items: [{ variantId: 'v-1', quantity: 1, unitPrice: 33 }],
    });
  });

  it('revalidateCart posts to /inventory/revalidate-cart', async () => {
    const reval = {
      isOrderable: true,
      hasPriceChanges: false,
      hasQuantityAdjustments: false,
      items: [],
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: reval });

    await BasketService.revalidateCart({
      storeId: 'store-1',
      items: [{ listingId: 'sp-1', quantity: 1, unitPrice: 33 }],
    });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.INVENTORY.REVALIDATE_CART, {
      storeId: 'store-1',
      items: [{ listingId: 'sp-1', quantity: 1, unitPrice: 33 }],
    });
  });
});
