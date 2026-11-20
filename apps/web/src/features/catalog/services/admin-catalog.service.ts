import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/endpoints';
import {
  BrandItem,
  CatalogStoreMappingItem,
  CategoryTreeItem,
  CreateBrandRequest,
  CreateCategoryRequest,
  CreateProductRequest,
  PaginatedResponse,
  ProductDetailItem,
  ProductStatus,
  UpdateBrandRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdateProductStatusRequest,
  UpdateProductVariantRequest,
} from '@marvels-basket/shared';

export interface AdminProductListQuery {
  q?: string;
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export class AdminCatalogService {
  // ===========================================================================
  // Categories Administration
  // ===========================================================================

  static async listCategories(): Promise<CategoryTreeItem[]> {
    const res = await apiClient.get<CategoryTreeItem[]>(ENDPOINTS.ADMIN_CATEGORIES.LIST);
    return res.data || [];
  }

  static async createCategory(data: CreateCategoryRequest): Promise<CategoryTreeItem> {
    const res = await apiClient.post<CategoryTreeItem>(ENDPOINTS.ADMIN_CATEGORIES.CREATE, data);
    return res.data!;
  }

  static async updateCategory(id: string, data: UpdateCategoryRequest): Promise<CategoryTreeItem> {
    const res = await apiClient.patch<CategoryTreeItem>(
      ENDPOINTS.ADMIN_CATEGORIES.UPDATE(id),
      data,
    );
    return res.data!;
  }

  static async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      ENDPOINTS.ADMIN_CATEGORIES.DELETE(id),
    );
    return res.data!;
  }

  static async reorderCategories(
    items: { id: string; displayOrder: number }[],
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.patch<{ success: boolean; message: string }>(
      ENDPOINTS.ADMIN_CATEGORIES.REORDER,
      { items },
    );
    return res.data!;
  }

  static async uploadCategoryIcon(id: string, file: File): Promise<CategoryTreeItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<CategoryTreeItem>(
      ENDPOINTS.ADMIN_CATEGORIES.UPLOAD_ICON(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data!;
  }

  static async uploadCategoryBanner(id: string, file: File): Promise<CategoryTreeItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<CategoryTreeItem>(
      ENDPOINTS.ADMIN_CATEGORIES.UPLOAD_IMAGE(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data!;
  }

  // ===========================================================================
  // Brands Administration
  // ===========================================================================

  static async listBrands(): Promise<BrandItem[]> {
    const res = await apiClient.get<BrandItem[]>(ENDPOINTS.ADMIN_BRANDS.LIST);
    return res.data || [];
  }

  static async createBrand(data: CreateBrandRequest): Promise<BrandItem> {
    const res = await apiClient.post<BrandItem>(ENDPOINTS.ADMIN_BRANDS.CREATE, data);
    return res.data!;
  }

  static async updateBrand(id: string, data: UpdateBrandRequest): Promise<BrandItem> {
    const res = await apiClient.patch<BrandItem>(ENDPOINTS.ADMIN_BRANDS.UPDATE(id), data);
    return res.data!;
  }

  static async deleteBrand(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      ENDPOINTS.ADMIN_BRANDS.DELETE(id),
    );
    return res.data!;
  }

  static async uploadBrandLogo(id: string, file: File): Promise<BrandItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<BrandItem>(ENDPOINTS.ADMIN_BRANDS.UPLOAD_LOGO(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data!;
  }

  // ===========================================================================
  // Master Products Administration
  // ===========================================================================

  static async listProducts(
    query?: AdminProductListQuery,
  ): Promise<PaginatedResponse<ProductDetailItem>> {
    const params: Record<string, string | number | undefined> = {};
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params[k] = v;
        }
      });
    }
    const res = await apiClient.get<PaginatedResponse<ProductDetailItem>>(
      ENDPOINTS.ADMIN_PRODUCTS.LIST,
      { params },
    );
    return res.data!;
  }

  static async getProduct(id: string): Promise<ProductDetailItem> {
    const res = await apiClient.get<ProductDetailItem>(ENDPOINTS.ADMIN_PRODUCTS.DETAIL(id));
    return res.data!;
  }

  static async createProduct(data: CreateProductRequest): Promise<ProductDetailItem> {
    const res = await apiClient.post<ProductDetailItem>(ENDPOINTS.ADMIN_PRODUCTS.CREATE, data);
    return res.data!;
  }

  static async updateProduct(id: string, data: UpdateProductRequest): Promise<ProductDetailItem> {
    const res = await apiClient.patch<ProductDetailItem>(ENDPOINTS.ADMIN_PRODUCTS.UPDATE(id), data);
    return res.data!;
  }

  static async updateProductStatus(
    id: string,
    data: UpdateProductStatusRequest,
  ): Promise<ProductDetailItem> {
    const res = await apiClient.patch<ProductDetailItem>(ENDPOINTS.ADMIN_PRODUCTS.STATUS(id), data);
    return res.data!;
  }

  static async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      ENDPOINTS.ADMIN_PRODUCTS.DELETE(id),
    );
    return res.data!;
  }

  static async addVariant(productId: string, data: any): Promise<ProductDetailItem> {
    const res = await apiClient.post<ProductDetailItem>(
      ENDPOINTS.ADMIN_PRODUCTS.ADD_VARIANT(productId),
      data,
    );
    return res.data!;
  }

  static async updateVariant(
    productId: string,
    variantId: string,
    data: UpdateProductVariantRequest,
  ): Promise<ProductDetailItem> {
    const res = await apiClient.patch<ProductDetailItem>(
      ENDPOINTS.ADMIN_PRODUCTS.UPDATE_VARIANT(productId, variantId),
      data,
    );
    return res.data!;
  }

  static async deleteVariant(productId: string, variantId: string): Promise<ProductDetailItem> {
    const res = await apiClient.delete<ProductDetailItem>(
      ENDPOINTS.ADMIN_PRODUCTS.DELETE_VARIANT(productId, variantId),
    );
    return res.data!;
  }

  static async uploadVariantImage(
    productId: string,
    variantId: string,
    file: File,
    isPrimary = false,
  ): Promise<ProductDetailItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrimary', String(isPrimary));
    const res = await apiClient.post<ProductDetailItem>(
      ENDPOINTS.ADMIN_PRODUCTS.UPLOAD_VARIANT_IMAGE(productId, variantId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data!;
  }

  static async deleteVariantImage(
    productId: string,
    variantId: string,
    imageId: string,
  ): Promise<ProductDetailItem> {
    const res = await apiClient.delete<ProductDetailItem>(
      ENDPOINTS.ADMIN_PRODUCTS.DELETE_VARIANT_IMAGE(productId, variantId, imageId),
    );
    return res.data!;
  }

  static async getStoreListings(productId: string): Promise<CatalogStoreMappingItem[]> {
    const res = await apiClient.get<CatalogStoreMappingItem[]>(
      ENDPOINTS.ADMIN_PRODUCTS.STORE_LISTINGS(productId),
    );
    return res.data || [];
  }
}
