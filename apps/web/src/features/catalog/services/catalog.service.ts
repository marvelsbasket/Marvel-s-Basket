import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/endpoints';
import {
  BrandItem,
  CategoryTreeItem,
  PaginatedResponse,
  ProductCardItem,
  ProductDetailItem,
  SearchSuggestionsResponse,
} from '@marvels-basket/shared';

export type SearchSuggestionsResult = SearchSuggestionsResponse;

export interface CatalogQueryOptions {
  q?: string;
  category?: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
  brand?: string;
  brandId?: string;
  foodPreference?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  isFeatured?: boolean;
  inStockOnly?: boolean;
  onlyStoreListed?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
  storeId?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export class CatalogService {
  /**
   * Retrieves the full nested category tree with subcategories and live product counts.
   */
  static async getCategoriesTree(): Promise<CategoryTreeItem[]> {
    const res = await apiClient.get<CategoryTreeItem[]>(ENDPOINTS.CATEGORIES.TREE);
    return res.data || [];
  }

  /**
   * Retrieves a category by its unique URL slug.
   */
  static async getCategoryBySlug(slug: string): Promise<CategoryTreeItem> {
    const res = await apiClient.get<CategoryTreeItem>(ENDPOINTS.CATEGORIES.BY_SLUG(slug));
    return res.data!;
  }

  /**
   * Retrieves all active brands for filter chips and carousels.
   */
  static async getActiveBrands(): Promise<BrandItem[]> {
    const res = await apiClient.get<BrandItem[]>(ENDPOINTS.BRANDS.LIST);
    return res.data || [];
  }

  /**
   * Discovers products based on filters, search query, and matched serviceable store.
   */
  static async getProducts(
    options?: CatalogQueryOptions,
  ): Promise<PaginatedResponse<ProductCardItem>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          if (k === 'foodPreference' && v === 'ALL') return;
          params[k] = v;
        }
      });
    }

    const res = await apiClient.get<PaginatedResponse<ProductCardItem>>(ENDPOINTS.PRODUCTS.LIST, {
      params,
    });
    return res.data!;
  }

  /**
   * Retrieves full product detail by URL slug, including variants, specifications,
   * nutrition, and resolved store pricing.
   */
  static async getProductBySlug(
    slug: string,
    options?: {
      storeId?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<ProductDetailItem> {
    const params: Record<string, string | number> = {};
    if (options?.storeId) params.storeId = options.storeId;
    if (options?.postalCode) params.postalCode = options.postalCode;
    if (options?.latitude !== undefined) params.latitude = options.latitude;
    if (options?.longitude !== undefined) params.longitude = options.longitude;

    const res = await apiClient.get<ProductDetailItem>(ENDPOINTS.PRODUCTS.BY_SLUG(slug), {
      params,
    });
    return res.data!;
  }

  /**
   * Autocomplete search suggestions across products, categories, and brands.
   */
  static async getSearchSuggestions(
    q: string,
    options?: {
      storeId?: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<SearchSuggestionsResponse> {
    if (!q || q.trim().length < 2) {
      return { products: [], categories: [], brands: [] };
    }
    const params: Record<string, string | number> = { q: q.trim() };
    if (options?.storeId) params.storeId = options.storeId;
    if (options?.postalCode) params.postalCode = options.postalCode;
    if (options?.latitude !== undefined) params.latitude = options.latitude;
    if (options?.longitude !== undefined) params.longitude = options.longitude;

    const res = await apiClient.get<SearchSuggestionsResponse>(
      ENDPOINTS.PRODUCTS.SEARCH_SUGGESTIONS,
      { params },
    );
    return res.data || { products: [], categories: [], brands: [] };
  }
}
