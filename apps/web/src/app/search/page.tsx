'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpDown,
  MapPin,
  MapPinOff,
  Search as SearchIcon,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { BrandItem, CategoryTreeItem, ProductCardItem } from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { ProductCard } from '@/features/catalog/components/product-card';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { useLocation } from '@/features/location/context/location-context';
import { Button } from '@/components/ui/button';

type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest' | 'popular';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isHydrated,
    location,
    activeStore,
    hasLocationContext,
    isServiceable,
    openLocationModal,
  } = useLocation();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialBrand = searchParams.get('brand') || '';
  const initialFood = searchParams.get('food') || 'ALL';
  const initialInStock = searchParams.get('inStock') === 'true';
  const initialMinDiscount = searchParams.get('minDiscount')
    ? Number(searchParams.get('minDiscount'))
    : null;
  const initialMinPrice = searchParams.get('minPrice')
    ? Number(searchParams.get('minPrice'))
    : null;
  const initialMaxPrice = searchParams.get('maxPrice')
    ? Number(searchParams.get('maxPrice'))
    : null;
  const initialSort = (searchParams.get('sort') as SearchSort) || 'relevance';
  const initialPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  const [queryText, setQueryText] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [foodPreference, setFoodPreference] = useState(initialFood);
  const [inStockOnly, setInStockOnly] = useState(initialInStock);
  const [minDiscount, setMinDiscount] = useState<number | null>(initialMinDiscount);
  const [minPrice, setMinPrice] = useState<number | null>(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState<number | null>(initialMaxPrice);
  const [sortBy, setSortBy] = useState<SearchSort>(initialSort);
  const [page, setPage] = useState(initialPage);

  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [catalogTotalCount, setCatalogTotalCount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setQueryText(searchParams.get('q') || '');
    setSelectedCategory(searchParams.get('category') || '');
    setSelectedBrand(searchParams.get('brand') || '');
    setFoodPreference(searchParams.get('food') || 'ALL');
    setInStockOnly(searchParams.get('inStock') === 'true');
    setMinDiscount(
      searchParams.get('minDiscount') ? Number(searchParams.get('minDiscount')) : null,
    );
    setSortBy((searchParams.get('sort') as SearchSort) || 'relevance');
    setPage(searchParams.get('page') ? Number(searchParams.get('page')) : 1);
  }, [searchParams]);

  useEffect(() => {
    CatalogService.getCategoriesTree()
      .then((c) => setCategories(c))
      .catch(() => setCategories([]));
    CatalogService.getActiveBrands()
      .then((b) => setBrands(b))
      .catch(() => setBrands([]));
  }, []);

  // Sync URL query params cleanly
  const updateUrlParams = (overrides: Partial<Record<string, string | null>>) => {
    const qp = new URLSearchParams();
    const state: Record<string, string | null> = {
      q: queryText || null,
      category: selectedCategory || null,
      brand: selectedBrand || null,
      food: foodPreference !== 'ALL' ? foodPreference : null,
      inStock: inStockOnly ? 'true' : null,
      minDiscount: minDiscount ? String(minDiscount) : null,
      minPrice: minPrice !== null ? String(minPrice) : null,
      maxPrice: maxPrice !== null ? String(maxPrice) : null,
      sort: sortBy !== 'relevance' ? sortBy : null,
      page: page > 1 ? String(page) : null,
      ...overrides,
    };

    Object.entries(state).forEach(([k, v]) => {
      if (v) qp.set(k, v);
    });

    const qs = qp.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  };

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    async function loadResults() {
      setIsLoading(true);
      try {
        const res = await CatalogService.getProducts({
          q: queryText.trim() || undefined,
          category: selectedCategory || undefined,
          brand: selectedBrand || undefined,
          foodPreference: foodPreference !== 'ALL' ? foodPreference : undefined,
          inStockOnly: inStockOnly || undefined,
          minDiscount: minDiscount ?? undefined,
          minPrice: minPrice ?? undefined,
          maxPrice: maxPrice ?? undefined,
          sort: sortBy,
          page,
          limit: 20,
          storeId: activeStore?.id,
          postalCode: location?.postalCode ?? undefined,
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
        });
        if (!cancelled) {
          setProducts(res.items || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
          setCatalogTotalCount(res.metaInfo?.catalogTotalCount);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadResults();
    return () => {
      cancelled = true;
    };
  }, [
    isHydrated,
    queryText,
    selectedCategory,
    selectedBrand,
    foodPreference,
    inStockOnly,
    minDiscount,
    minPrice,
    maxPrice,
    sortBy,
    page,
    activeStore?.id,
    location?.postalCode,
    location?.latitude,
    location?.longitude,
  ]);

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setFoodPreference('ALL');
    setInStockOnly(false);
    setMinDiscount(null);
    setMinPrice(null);
    setMaxPrice(null);
    setSortBy('relevance');
    setPage(1);
    updateUrlParams({
      category: null,
      brand: null,
      food: null,
      inStock: null,
      minDiscount: null,
      minPrice: null,
      maxPrice: null,
      sort: null,
      page: null,
    });
  };

  const hasActiveFilters = Boolean(
    selectedCategory ||
    selectedBrand ||
    foodPreference !== 'ALL' ||
    inStockOnly ||
    minDiscount ||
    minPrice !== null ||
    maxPrice !== null,
  );

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Location & Query Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-surface-tile px-4 py-3.5">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-ink">
              {queryText ? (
                <>
                  Search results for &ldquo;<span className="text-brand">{queryText}</span>&rdquo;
                </>
              ) : (
                'Browse Catalog'
              )}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {activeStore ? (
                <>
                  Priced from <strong>{activeStore.name}</strong> ({total} products)
                </>
              ) : location && !isServiceable ? (
                <span className="text-amber-700 font-medium">
                  Area ({location.displayLocation}) not yet serviceable — showing read-only catalog
                  MRP ({total} products)
                </span>
              ) : (
                `Showing ${total} catalog products (set location for local prices & stock)`
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openLocationModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-ink hover:border-brand self-start sm:self-center"
          >
            <MapPin className="h-3.5 w-3.5 text-brand" />
            <span>{location?.displayLocation || 'Set Location'}</span>
          </button>
        </div>

        {/* Inline Filter & Sort Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border pb-4">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
              updateUrlParams({ category: e.target.value || null, page: null });
            }}
            aria-label="Filter by category"
            className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-ink focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
              updateUrlParams({ brand: e.target.value || null, page: null });
            }}
            aria-label="Filter by brand"
            className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-ink focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={foodPreference}
            onChange={(e) => {
              setFoodPreference(e.target.value);
              setPage(1);
              updateUrlParams({
                food: e.target.value === 'ALL' ? null : e.target.value,
                page: null,
              });
            }}
            aria-label="Filter by dietary preference"
            className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-ink focus:outline-none"
          >
            <option value="ALL">All Dietary</option>
            <option value="VEG">Veg Only</option>
            <option value="NON_VEG">Non-Veg</option>
          </select>

          {activeStore && (
            <button
              type="button"
              onClick={() => {
                const next = !inStockOnly;
                setInStockOnly(next);
                setPage(1);
                updateUrlParams({ inStock: next ? 'true' : null, page: null });
              }}
              className={`h-9 rounded-xl border px-3 text-xs font-bold transition-colors ${
                inStockOnly
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-white text-ink-secondary hover:border-brand'
              }`}
            >
              In Stock Only
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const next = minDiscount ? null : 10;
              setMinDiscount(next);
              setPage(1);
              updateUrlParams({ minDiscount: next ? String(next) : null, page: null });
            }}
            className={`h-9 rounded-xl border px-3 text-xs font-bold transition-colors ${
              minDiscount
                ? 'border-brand bg-brand-tint text-brand'
                : 'border-border bg-white text-ink-secondary hover:border-brand'
            }`}
          >
            10%+ OFF
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-white px-3 h-9">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted mr-1.5" />
              <select
                value={sortBy}
                onChange={(e) => {
                  const next = e.target.value as SearchSort;
                  setSortBy(next);
                  setPage(1);
                  updateUrlParams({ sort: next === 'relevance' ? null : next, page: null });
                }}
                aria-label="Sort search results"
                className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount_desc">Discount: High to Low</option>
                <option value="popular">Popular</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {selectedCategory && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('');
                  updateUrlParams({ category: null });
                }}
                className="rounded-full bg-brand-tint px-3 py-1 font-semibold text-brand"
              >
                Category: {selectedCategory} ×
              </button>
            )}
            {selectedBrand && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('');
                  updateUrlParams({ brand: null });
                }}
                className="rounded-full bg-brand-tint px-3 py-1 font-semibold text-brand"
              >
                Brand: {selectedBrand} ×
              </button>
            )}
            {foodPreference !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setFoodPreference('ALL');
                  updateUrlParams({ food: null });
                }}
                className="rounded-full bg-brand-tint px-3 py-1 font-semibold text-brand"
              >
                {foodPreference} ×
              </button>
            )}
            {inStockOnly && (
              <button
                type="button"
                onClick={() => {
                  setInStockOnly(false);
                  updateUrlParams({ inStock: null });
                }}
                className="rounded-full bg-brand-tint px-3 py-1 font-semibold text-brand"
              >
                In Stock Only ×
              </button>
            )}
            {minDiscount && (
              <button
                type="button"
                onClick={() => {
                  setMinDiscount(null);
                  updateUrlParams({ minDiscount: null });
                }}
                className="rounded-full bg-brand-tint px-3 py-1 font-semibold text-brand"
              >
                {minDiscount}%+ OFF ×
              </button>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="font-bold text-red-600 hover:underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Grid OR Explicit 3 Zero-Result States */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center space-y-4">
            {/* Case 1: Active location is unserviceable */}
            {hasLocationContext &&
            !isServiceable &&
            (!hasActiveFilters || catalogTotalCount === 0) ? (
              <>
                <MapPinOff className="mx-auto h-12 w-12 text-amber-600" />
                <h2 className="text-lg font-bold text-ink">
                  We&apos;re coming soon to {location?.displayLocation}!
                </h2>
                <p className="text-sm text-muted max-w-md mx-auto">
                  Local store delivery isn&apos;t available in your selected area yet. Change your
                  location to check store stock in nearby serviceable zones.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={openLocationModal}
                    className="bg-brand hover:bg-forest text-white"
                  >
                    Change Delivery Location
                  </Button>
                </div>
              </>
            ) : hasActiveFilters && (catalogTotalCount === undefined || catalogTotalCount > 0) ? (
              /* Case 2: Matches catalog, but active filters excluded everything */
              <>
                <ShoppingBag className="mx-auto h-12 w-12 text-stone-300" />
                <h2 className="text-lg font-bold text-ink">No items match your selected filters</h2>
                <p className="text-sm text-muted max-w-md mx-auto">
                  We found products in our catalog, but your current category, brand, price, or
                  in-stock filters narrowed the results to zero.
                </p>
                <Button onClick={clearAllFilters} className="bg-brand hover:bg-forest text-white">
                  Clear All Filters
                </Button>
              </>
            ) : (
              /* Case 3: Search term itself has no matches in the catalog */
              <>
                <SearchIcon className="mx-auto h-12 w-12 text-stone-300" />
                <h2 className="text-lg font-bold text-ink">
                  No products found for &ldquo;{queryText}&rdquo;
                </h2>
                <p className="text-sm text-muted max-w-md mx-auto">
                  Check the spelling or try searching popular staples like &ldquo;doodh&rdquo;,
                  &ldquo;atta&rdquo;, &ldquo;potato&rdquo;, &ldquo;sugar&rdquo;, or
                  &ldquo;tea&rdquo;.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {['milk', 'atta', 'aloo', 'cheeni', 'chai'].map((term) => (
                    <Link
                      key={term}
                      href={`/search?q=${term}`}
                      className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-brand hover:bg-brand-tint"
                    >
                      Search &ldquo;{term}&rdquo;
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = page - 1;
                    setPage(next);
                    updateUrlParams({ page: next > 1 ? String(next) : null });
                  }}
                >
                  Previous
                </Button>
                <span className="text-xs font-semibold text-ink-secondary">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    updateUrlParams({ page: String(next) });
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </StorefrontLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <StorefrontLayout>
          <div className="mx-auto max-w-container px-4 py-10">
            <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />
          </div>
        </StorefrontLayout>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
