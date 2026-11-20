import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/endpoints';
import {
  AdjustStockRequest,
  CartItemRevalidationInput,
  CartItemRevalidationResult,
  CreateSellerListingRequest,
  InventoryAdjustmentHistoryItem,
  InventoryOverviewMetrics,
  InventoryReconciliationResult,
  PaginatedResponse,
  SellerListingItem,
  UpdateListingPriceRequest,
  UpdateListingStatusRequest,
  UpdateSellerListingRequest,
} from '@marvels-basket/shared';

export interface SellerListingsQuery {
  search?: string;
  categoryId?: string;
  status?: string;
  isLowStock?: boolean;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface MasterCatalogProductVariantItem {
  id: string;
  name: string;
  packSize: string | null;
  sku: string;
  mrp: number;
  imageUrl: string | null;
  isActive: boolean;
  isAlreadyListed: boolean;
  existingListingId?: string;
}

export interface MasterCatalogBrowseItem {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string };
  brand: { id: string; name: string } | null;
  status: string;
  variants: MasterCatalogProductVariantItem[];
}

export class InventoryService {
  /**
   * Fetch aggregate inventory health metrics for the store
   */
  static async getOverview(storeId: string): Promise<InventoryOverviewMetrics> {
    const res = await apiClient.get<InventoryOverviewMetrics>(
      ENDPOINTS.INVENTORY.SELLER_OVERVIEW(storeId),
    );
    return res.data!;
  }

  /**
   * List products mapped to the seller store with search & filters
   */
  static async getListings(
    storeId: string,
    query?: SellerListingsQuery,
  ): Promise<PaginatedResponse<SellerListingItem>> {
    const res = await apiClient.get<PaginatedResponse<SellerListingItem>>(
      ENDPOINTS.INVENTORY.SELLER_LISTINGS(storeId),
      { params: query },
    );
    return (
      res.data || {
        items: [],
        total: 0,
        page: query?.page || 1,
        pageSize: query?.limit || 20,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      }
    );
  }

  /**
   * Get listing details by ID
   */
  static async getListingById(storeId: string, listingId: string): Promise<SellerListingItem> {
    const res = await apiClient.get<SellerListingItem>(
      ENDPOINTS.INVENTORY.SELLER_LISTING_DETAIL(storeId, listingId),
    );
    return res.data!;
  }

  /**
   * Map a master catalog product variant to the seller store
   */
  static async createListing(
    storeId: string,
    data: CreateSellerListingRequest,
  ): Promise<SellerListingItem> {
    const res = await apiClient.post<SellerListingItem>(
      ENDPOINTS.INVENTORY.SELLER_LISTINGS(storeId),
      data,
    );
    return res.data!;
  }

  /**
   * Update listing details (SKU, threshold, price, status)
   */
  static async updateListing(
    storeId: string,
    listingId: string,
    data: UpdateSellerListingRequest,
  ): Promise<SellerListingItem> {
    const res = await apiClient.patch<SellerListingItem>(
      ENDPOINTS.INVENTORY.SELLER_LISTING_DETAIL(storeId, listingId),
      data,
    );
    return res.data!;
  }

  /**
   * Update listing selling price with MRP validation
   */
  static async updateListingPrice(
    storeId: string,
    listingId: string,
    data: UpdateListingPriceRequest,
  ): Promise<SellerListingItem> {
    const res = await apiClient.patch<SellerListingItem>(
      ENDPOINTS.INVENTORY.SELLER_LISTING_PRICE(storeId, listingId),
      data,
    );
    return res.data!;
  }

  /**
   * Toggle or update listing status (ACTIVE, PAUSED, OUT_OF_STOCK)
   */
  static async updateListingStatus(
    storeId: string,
    listingId: string,
    data: UpdateListingStatusRequest,
  ): Promise<SellerListingItem> {
    const res = await apiClient.patch<SellerListingItem>(
      ENDPOINTS.INVENTORY.SELLER_LISTING_STATUS(storeId, listingId),
      data,
    );
    return res.data!;
  }

  /**
   * Apply an auditable stock adjustment (restock, deduction, write-off)
   */
  static async adjustStock(
    storeId: string,
    listingId: string,
    data: AdjustStockRequest,
  ): Promise<{
    success: boolean;
    stockOnHand: number;
    availableStock: number;
    reservedStock: number;
    message: string;
  }> {
    const res = await apiClient.post<{
      success: boolean;
      stockOnHand: number;
      availableStock: number;
      reservedStock: number;
      message: string;
    }>(ENDPOINTS.INVENTORY.ADJUST_STOCK(storeId, listingId), data);
    return res.data!;
  }

  /**
   * Retrieve immutable inventory adjustment audit ledger
   */
  static async getHistory(
    storeId: string,
    listingId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<InventoryAdjustmentHistoryItem>> {
    const res = await apiClient.get<PaginatedResponse<InventoryAdjustmentHistoryItem>>(
      ENDPOINTS.INVENTORY.HISTORY(storeId, listingId),
      { params: { page, limit } },
    );
    return (
      res.data || {
        items: [],
        total: 0,
        page,
        pageSize: limit,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      }
    );
  }

  /**
   * Reconcile physical stock against ledger sum
   */
  static async reconcile(
    storeId: string,
    listingId?: string,
  ): Promise<InventoryReconciliationResult[]> {
    const res = await apiClient.post<InventoryReconciliationResult[]>(
      ENDPOINTS.INVENTORY.RECONCILE(storeId),
      {},
      { params: listingId ? { listingId } : undefined },
    );
    return res.data || [];
  }

  /**
   * Browse platform-approved master catalog products and variants
   */
  static async browseMasterCatalog(params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    storeId?: string;
  }): Promise<MasterCatalogBrowseItem[]> {
    const res = await apiClient.get<MasterCatalogBrowseItem[]>(ENDPOINTS.SELLER_CATALOG.BROWSE, {
      params,
    });
    return res.data || [];
  }

  /**
   * Customer cart revalidation contract at checkout
   */
  static async revalidateCart(
    items: CartItemRevalidationInput[],
    storeId?: string,
  ): Promise<{
    isOrderable: boolean;
    hasPriceChanges: boolean;
    hasQuantityAdjustments: boolean;
    items: CartItemRevalidationResult[];
  }> {
    const res = await apiClient.post<{
      isOrderable: boolean;
      hasPriceChanges: boolean;
      hasQuantityAdjustments: boolean;
      items: CartItemRevalidationResult[];
    }>(ENDPOINTS.INVENTORY.REVALIDATE_CART, { storeId, items });
    return res.data!;
  }
}
