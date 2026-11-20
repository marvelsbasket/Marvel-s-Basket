import { apiClient } from '@/lib/api';
import { InventoryService } from './inventory.service';
import { CartRevalidationService } from './cart-revalidation.service';
import { ENDPOINTS } from '@/lib/api/endpoints';

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('InventoryService & CartRevalidationService', () => {
  const storeId = 'store-uuid-123';
  const listingId = 'listing-uuid-456';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('InventoryService', () => {
    it('getOverview fetches aggregate metrics for store', async () => {
      const mockMetrics = {
        totalListedProducts: 25,
        activeListings: 20,
        pausedListings: 2,
        outOfStockListings: 3,
        lowStockListings: 4,
        totalStockOnHand: 500,
        totalReservedStock: 15,
        totalAvailableStock: 485,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockMetrics });

      const res = await InventoryService.getOverview(storeId);
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.INVENTORY.SELLER_OVERVIEW(storeId));
      expect(res).toEqual(mockMetrics);
    });

    it('getListings fetches listings with search and filter parameters', async () => {
      const mockListingsResponse = {
        items: [
          {
            id: listingId,
            productName: 'Organic Whole Milk',
            variantName: '1L Pouch',
            sellingPrice: 65,
            mrp: 70,
            stockOnHand: 40,
            reservedStock: 2,
            availableStock: 38,
            status: 'ACTIVE',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockListingsResponse });

      const res = await InventoryService.getListings(storeId, {
        search: 'milk',
        status: 'ACTIVE',
        page: 1,
        limit: 15,
      });

      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.INVENTORY.SELLER_LISTINGS(storeId), {
        params: { search: 'milk', status: 'ACTIVE', page: 1, limit: 15 },
      });
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('createListing sends POST request with variant mapping and initial stock', async () => {
      const mockCreated = {
        id: listingId,
        sellerId: storeId,
        productId: 'prod-1',
        variantId: 'var-1',
        sellingPrice: 45,
        stockOnHand: 20,
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockCreated });

      const payload = {
        productId: 'prod-1',
        variantId: 'var-1',
        sellingPrice: 45,
        initialStock: 20,
        lowStockThreshold: 5,
        status: 'ACTIVE',
      };

      const res = await InventoryService.createListing(storeId, payload);
      expect(apiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.INVENTORY.SELLER_LISTINGS(storeId),
        payload,
      );
      expect(res).toEqual(mockCreated);
    });

    it('updateListingPrice sends PATCH request to update selling price', async () => {
      const mockUpdated = { id: listingId, sellingPrice: 52 };
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockUpdated });

      const res = await InventoryService.updateListingPrice(storeId, listingId, {
        sellingPrice: 52,
      });
      expect(apiClient.patch).toHaveBeenCalledWith(
        ENDPOINTS.INVENTORY.SELLER_LISTING_PRICE(storeId, listingId),
        { sellingPrice: 52 },
      );
      expect(res.sellingPrice).toBe(52);
    });

    it('updateListingStatus sends PATCH request to toggle listing status', async () => {
      const mockUpdated = { id: listingId, status: 'PAUSED' };
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockUpdated });

      const res = await InventoryService.updateListingStatus(storeId, listingId, {
        status: 'PAUSED',
      });
      expect(apiClient.patch).toHaveBeenCalledWith(
        ENDPOINTS.INVENTORY.SELLER_LISTING_STATUS(storeId, listingId),
        { status: 'PAUSED' },
      );
      expect(res.status).toBe('PAUSED');
    });

    it('adjustStock sends POST request with operational note and delta', async () => {
      const mockAdjusted = {
        success: true,
        stockOnHand: 50,
        availableStock: 48,
        reservedStock: 2,
        message: 'Stock adjusted successfully',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockAdjusted });

      const payload = {
        operation: 'RESTOCK' as const,
        quantity: 10,
        note: 'Supplier delivery batch #99',
      };

      const res = await InventoryService.adjustStock(storeId, listingId, payload);
      expect(apiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.INVENTORY.ADJUST_STOCK(storeId, listingId),
        payload,
      );
      expect(res.success).toBe(true);
      expect(res.stockOnHand).toBe(50);
    });

    it('getHistory retrieves paginated audit ledger records', async () => {
      const mockHistory = {
        items: [
          {
            id: 'tx-1',
            inventoryId: 'inv-1',
            type: 'RESTOCK',
            quantity: 10,
            stockBefore: 40,
            stockAfter: 50,
            note: 'Vendor shipment',
            createdAt: '2026-11-20T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockHistory });

      const res = await InventoryService.getHistory(storeId, listingId, 1, 10);
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.INVENTORY.HISTORY(storeId, listingId), {
        params: { page: 1, limit: 10 },
      });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].stockAfter).toBe(50);
    });

    it('reconcile verifies physical inventory matches audit transactions', async () => {
      const mockReconciliation = [
        {
          inventoryId: 'inv-1',
          sellerProductId: listingId,
          productName: 'Organic Whole Milk',
          variantName: '1L Pouch',
          currentStockOnHand: 50,
          calculatedStockFromLedger: 50,
          discrepancy: 0,
          isReconciled: true,
          totalStockIn: 50,
          totalStockOut: 0,
          totalWriteOffs: 0,
        },
      ];
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockReconciliation });

      const res = await InventoryService.reconcile(storeId, listingId);
      expect(apiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.INVENTORY.RECONCILE(storeId),
        {},
        { params: { listingId } },
      );
      expect(res[0].isReconciled).toBe(true);
      expect(res[0].discrepancy).toBe(0);
    });

    it('browseMasterCatalog retrieves platform master products', async () => {
      const mockCatalog = [
        {
          id: 'prod-1',
          name: 'Amul Butter',
          slug: 'amul-butter',
          category: { id: 'cat-1', name: 'Dairy' },
          brand: { id: 'brand-1', name: 'Amul' },
          status: 'ACTIVE',
          variants: [
            {
              id: 'var-1',
              name: '500g Block',
              packSize: '500g',
              sku: 'AMUL-BUTTER-500G',
              mrp: 275,
              imageUrl: null,
              isActive: true,
              isAlreadyListed: false,
            },
          ],
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockCatalog });

      const res = await InventoryService.browseMasterCatalog({ search: 'butter', storeId });
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.SELLER_CATALOG.BROWSE, {
        params: { search: 'butter', storeId },
      });
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Amul Butter');
    });
  });

  describe('CartRevalidationService', () => {
    it('revalidates cart items against live store prices and stock without premature locking', async () => {
      const mockRevalidation = {
        isOrderable: true,
        hasPriceChanges: false,
        hasQuantityAdjustments: false,
        items: [
          {
            variantId: 'var-1',
            listingId: listingId,
            productName: 'Organic Whole Milk',
            packSize: '1L Pouch',
            requestedQuantity: 2,
            availableQuantity: 38,
            adjustedQuantity: 2,
            originalUnitPrice: 65,
            currentUnitPrice: 65,
            priceChanged: false,
            isAvailable: true,
            status: 'ACTIVE',
          },
        ],
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockRevalidation });

      const cartItems = [{ variantId: 'var-1', quantity: 2, unitPrice: 65 }];
      const res = await CartRevalidationService.revalidateCustomerCart(cartItems, storeId);

      expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.INVENTORY.REVALIDATE_CART, {
        storeId,
        items: cartItems,
      });
      expect(res.isOrderable).toBe(true);
      expect(res.items[0].adjustedQuantity).toBe(2);
    });
  });
});
