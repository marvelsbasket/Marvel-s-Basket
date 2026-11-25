import { apiClient } from '@/lib/api';
import { CatalogService } from './catalog.service';
import { AdminCatalogService } from './admin-catalog.service';

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('CatalogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCategoriesTree should return category tree list', async () => {
    const mockTree = [{ id: 'cat-1', name: 'Dairy', slug: 'dairy', subcategories: [] }];
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockTree });

    const result = await CatalogService.getCategoriesTree();
    expect(result).toEqual(mockTree);
    expect(apiClient.get).toHaveBeenCalledWith('/categories');
  });

  it('getProducts should pass valid query parameters', async () => {
    const mockPaginated = { items: [], total: 0, page: 1, pageSize: 20 };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockPaginated });

    const result = await CatalogService.getProducts({
      q: 'milk',
      storeId: 'store-1',
      page: 2,
    });

    expect(result).toEqual(mockPaginated);
    expect(apiClient.get).toHaveBeenCalledWith('/products', {
      params: { q: 'milk', storeId: 'store-1', page: 2 },
    });
  });

  it('getProductBySlug should fetch product by slug with store query', async () => {
    const mockDetail = { id: 'p1', name: 'Milk', slug: 'milk' };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDetail });

    const result = await CatalogService.getProductBySlug('milk', { storeId: 'store-1' });
    expect(result).toEqual(mockDetail);
    expect(apiClient.get).toHaveBeenCalledWith('/products/milk', {
      params: { storeId: 'store-1' },
    });
  });

  it('getSearchSuggestions passes location context alongside search query', async () => {
    const mockSuggestions = { products: [], categories: [], brands: [] };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSuggestions });

    await CatalogService.getSearchSuggestions('doodh', {
      storeId: 'store-1',
      postalCode: '560038',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/products/search/suggestions', {
      params: { q: 'doodh', storeId: 'store-1', postalCode: '560038' },
    });
  });
});

describe('AdminCatalogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createCategory should post payload to admin endpoint', async () => {
    const payload = { name: 'Snacks', slug: 'snacks', displayOrder: 1, isActive: true };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'cat-new', ...payload } });

    const result = await AdminCatalogService.createCategory(payload);
    expect(result.id).toBe('cat-new');
    expect(apiClient.post).toHaveBeenCalledWith('/admin/categories', payload);
  });

  it('updateProductStatus should patch status', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ data: { id: 'prod-1', status: 'ACTIVE' } });

    const result = await AdminCatalogService.updateProductStatus('prod-1', {
      status: 'ACTIVE' as any,
    });
    expect(result.status).toBe('ACTIVE');
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/prod-1/status', {
      status: 'ACTIVE',
    });
  });

  it('getStoreListings should fetch store mappings for product', async () => {
    const mockStores = [
      { storeId: 's1', storeName: 'Store 1', sellingPrice: 30, availableStock: 100 },
    ];
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStores });

    const result = await AdminCatalogService.getStoreListings('prod-1');
    expect(result).toEqual(mockStores);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/products/prod-1/store-listings');
  });
});
