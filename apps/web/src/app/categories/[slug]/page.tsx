'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Filter,
  MapPin,
  Search,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { CategoryTreeItem, ProductCardItem } from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { ProductCard } from '@/features/catalog/components/product-card';
import { MobileSplitPaneProductCard } from '@/features/catalog/components/mobile-split-pane-card';
import { MobileFilterDrawer, SortOption } from '@/features/catalog/components/mobile-filter-drawer';
import { MobileVariantDrawer } from '@/features/catalog/components/mobile-variant-drawer';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { cn } from '@/lib/utils';

/**
 * Fallback icon/emoji for categories or subcategories lacking an iconUrl.
 */
function getCategoryVisual(slug: string, name: string) {
  const s = (slug + ' ' + name).toLowerCase();
  if (s.includes('veg') || s.includes('salad') || s.includes('greens')) return '🥦';
  if (s.includes('fruit') || s.includes('apple') || s.includes('berry')) return '🍎';
  if (s.includes('milk') || s.includes('dairy') || s.includes('curd') || s.includes('paneer'))
    return '🥛';
  if (s.includes('bread') || s.includes('bakery') || s.includes('bun') || s.includes('toast'))
    return '🍞';
  if (s.includes('oil') || s.includes('ghee')) return '🫒';
  if (
    s.includes('atta') ||
    s.includes('flour') ||
    s.includes('dal') ||
    s.includes('rice') ||
    s.includes('grain') ||
    s.includes('staple')
  )
    return '🌾';
  if (s.includes('biscuit') || s.includes('cookie') || s.includes('snack') || s.includes('namkeen'))
    return '🍪';
  if (
    s.includes('drink') ||
    s.includes('juice') ||
    s.includes('beverage') ||
    s.includes('tea') ||
    s.includes('coffee') ||
    s.includes('soda')
  )
    return '🧃';
  if (
    s.includes('bath') ||
    s.includes('soap') ||
    s.includes('clean') ||
    s.includes('care') ||
    s.includes('oral')
  )
    return '🧼';
  if (s.includes('meat') || s.includes('fish') || s.includes('egg')) return '🥚';
  if (s.includes('spice') || s.includes('masala')) return '🌶️';
  return '🛍️';
}

export default function CategoryProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const subSlug = searchParams.get('sub');

  const [category, setCategory] = useState<CategoryTreeItem | null>(null);
  const [selectedSubSlug, setSelectedSubSlug] = useState<string | null>(subSlug);
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Sort States
  const [foodPreference, setFoodPreference] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Mobile Drawer States
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [variantDrawerProduct, setVariantDrawerProduct] = useState<ProductCardItem | null>(null);

  // Reference to right content pane for auto-scroll to top on subcategory change
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Sync state if subSlug search param changes externally
  useEffect(() => {
    setSelectedSubSlug(subSlug);
  }, [subSlug]);

  useEffect(() => {
    async function fetchCategoryAndProducts() {
      setIsLoading(true);
      try {
        // 1. Fetch category details & hierarchy tree
        const cat = await CatalogService.getCategoryBySlug(slug);
        setCategory(cat);

        // 2. Determine target category ID (parent or specific subcategory)
        let targetCategoryId = cat.id;
        if (selectedSubSlug && cat.subcategories) {
          const matchedSub = cat.subcategories.find((s) => s.slug === selectedSubSlug);
          if (matchedSub) {
            targetCategoryId = matchedSub.id;
          }
        }

        // 3. Fetch products matching category & filters
        const res = await CatalogService.getProducts({
          categoryId: targetCategoryId,
          foodPreference: foodPreference !== 'ALL' ? foodPreference : undefined,
          sort: sortBy,
        });

        let items = res.items || [];
        if (inStockOnly) {
          items = items.filter(
            (p) => (p.availableQuantity ?? 0) > 0 && p.defaultVariant?.isAvailable !== false,
          );
        }

        setProducts(items);
        setTotalProducts(inStockOnly ? items.length : res.total || 0);
      } catch (err) {
        console.error('Failed to load category products:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategoryAndProducts();
  }, [slug, selectedSubSlug, foodPreference, sortBy, inStockOnly]);

  // Determine active subcategory name
  const activeSubcategory =
    selectedSubSlug && category?.subcategories
      ? category.subcategories.find((s) => s.slug === selectedSubSlug)
      : null;

  const handleSubcategorySelect = (subSlugToSelect: string | null) => {
    setSelectedSubSlug(subSlugToSelect);
    const newUrl = subSlugToSelect
      ? `/categories/${category?.slug || slug}?sub=${subSlugToSelect}`
      : `/categories/${category?.slug || slug}`;
    window.history.replaceState(null, '', newUrl);
    rightPaneRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setFoodPreference('ALL');
    setSortBy('relevance');
    setInStockOnly(false);
  };

  const activeFilterCount =
    (foodPreference !== 'ALL' ? 1 : 0) + (sortBy !== 'relevance' ? 1 : 0) + (inStockOnly ? 1 : 0);

  return (
    <StorefrontLayout cartItemCount={2} hideMobileHeader={true} hideMobileFooter={true}>
      {/* =================================================================== */}
      {/* 1. MOBILE VIEW: ZEPTO-STYLE SPLIT-PANE LISTING (< md breakpoint)     */}
      {/* =================================================================== */}
      <div className="block md:hidden flex flex-col h-[calc(100dvh-64px)] overflow-hidden bg-white">
        {/* Mobile Category Top Bar (Reference B) */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-stone-200/90 bg-white px-3 shadow-2xs">
          {/* Back Button + Category Name & Delivery Location */}
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <button
              type="button"
              onClick={() => router.push('/categories')}
              aria-label="Back to categories"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-stone-900 truncate leading-snug">
                {activeSubcategory ? activeSubcategory.name : category?.name || 'Category'}
              </h1>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 leading-none">
                <MapPin className="h-3 w-3 text-emerald-700 shrink-0" />
                <span className="truncate max-w-[130px]">Azamgarh, UP</span>
                <ChevronDown className="h-2.5 w-2.5 text-stone-400" />
              </div>
            </div>
          </div>

          {/* Quick Search & Basket Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/"
              aria-label="Search items"
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100"
            >
              <Search className="h-4 w-4" />
            </Link>
            <Link
              href="/basket"
              aria-label="View basket"
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 hover:bg-emerald-50"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cta px-1 text-[9px] font-black text-stone-900 shadow-2xs">
                2
              </span>
            </Link>
          </div>
        </header>

        {/* Split-Pane Body Container */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Vertical Subcategory Rail (Reference B: ~80px width) */}
          <aside
            aria-label="Subcategory Rail"
            className="w-[82px] shrink-0 h-full overflow-y-auto no-scrollbar border-r border-stone-200/80 bg-[#F6F8F5] pb-10"
          >
            <div className="flex flex-col py-1.5 space-y-1">
              {/* "All" / Category Root Item */}
              <button
                type="button"
                onClick={() => handleSubcategorySelect(null)}
                className={cn(
                  'group relative flex flex-col items-center py-2 px-1 text-center transition-all focus-visible:outline-none',
                  selectedSubSlug === null
                    ? 'bg-white font-extrabold shadow-2xs'
                    : 'hover:bg-stone-100/70',
                )}
              >
                {/* Active Indicator Left Bar */}
                {selectedSubSlug === null && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-md bg-emerald-600" />
                )}

                {/* Visual Icon */}
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform',
                    selectedSubSlug === null
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 scale-105 shadow-2xs'
                      : 'border-stone-200/80 bg-white text-stone-600 group-hover:scale-105',
                  )}
                >
                  <span className="text-xl">
                    {category ? getCategoryVisual(category.slug, category.name) : '🛍️'}
                  </span>
                </div>

                <span
                  className={cn(
                    'mt-1 line-clamp-2 text-[10px] leading-tight px-1',
                    selectedSubSlug === null
                      ? 'font-black text-emerald-900'
                      : 'font-bold text-stone-700',
                  )}
                >
                  All Items
                </span>
              </button>

              {/* Sibling Subcategories */}
              {category?.subcategories?.map((sub) => {
                const isSelected = selectedSubSlug === sub.slug;
                const visual = getCategoryVisual(sub.slug, sub.name);

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubcategorySelect(sub.slug)}
                    className={cn(
                      'group relative flex flex-col items-center py-2 px-1 text-center transition-all focus-visible:outline-none',
                      isSelected ? 'bg-white font-extrabold shadow-2xs' : 'hover:bg-stone-100/70',
                    )}
                  >
                    {/* Active Indicator Left Bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-md bg-emerald-600" />
                    )}

                    {/* Visual Icon */}
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform p-1',
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 scale-105 shadow-2xs'
                          : 'border-stone-200/80 bg-white text-stone-600 group-hover:scale-105',
                      )}
                    >
                      {sub.iconUrl ? (
                        <img
                          src={sub.iconUrl}
                          alt={sub.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xl">{visual}</span>
                      )}
                    </div>

                    <span
                      className={cn(
                        'mt-1 line-clamp-2 text-[10px] leading-tight px-1',
                        isSelected ? 'font-black text-emerald-900' : 'font-bold text-stone-700',
                      )}
                    >
                      {sub.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Content Pane: Filters Bar + 2-Column Product Grid */}
          <main ref={rightPaneRef} className="flex-1 h-full overflow-y-auto bg-[#FAFBF9] pb-12">
            {/* Sticky Breadcrumb & Filter Bar */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-stone-200/80 px-2.5 py-2 shadow-2xs">
              {/* Breadcrumb path */}
              <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-500 truncate mb-1.5">
                <Link href="/" className="hover:text-emerald-700 shrink-0">
                  Home
                </Link>
                <ChevronRight className="h-2.5 w-2.5 text-stone-400 shrink-0" />
                <span className="truncate">{category?.name || 'Category'}</span>
                {activeSubcategory && (
                  <>
                    <ChevronRight className="h-2.5 w-2.5 text-stone-400 shrink-0" />
                    <span className="font-bold text-stone-900 truncate">
                      {activeSubcategory.name}
                    </span>
                  </>
                )}
              </div>

              {/* Horizontal Scrollable Filter Chips (Reference B) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {/* 1. All Filters Drawer Trigger */}
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={cn(
                    'flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold shrink-0 transition-colors shadow-2xs',
                    activeFilterCount > 0
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-black'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                  )}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* 2. Sort Chip */}
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={cn(
                    'flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold shrink-0 transition-colors shadow-2xs',
                    sortBy !== 'relevance'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                  )}
                >
                  <ArrowUpDown className="h-3 w-3 text-stone-500" />
                  <span>
                    {sortBy === 'price_asc'
                      ? 'Price: Low'
                      : sortBy === 'price_desc'
                        ? 'Price: High'
                        : sortBy === 'discount_desc'
                          ? 'Discount'
                          : sortBy === 'newest'
                            ? 'New'
                            : 'Sort'}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 text-stone-400" />
                </button>

                {/* 3. Veg Quick Pill */}
                <button
                  type="button"
                  onClick={() => setFoodPreference((prev) => (prev === 'VEG' ? 'ALL' : 'VEG'))}
                  className={cn(
                    'flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold shrink-0 transition-colors shadow-2xs',
                    foodPreference === 'VEG'
                      ? 'border-emerald-600 bg-emerald-600 text-white font-extrabold'
                      : 'border-stone-200 bg-white text-emerald-800 hover:bg-emerald-50/50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-2.5 w-2.5 items-center justify-center rounded-xs border',
                      foodPreference === 'VEG'
                        ? 'border-white bg-white'
                        : 'border-emerald-600 bg-white',
                    )}
                  >
                    <div className="h-1 w-1 rounded-full bg-emerald-600" />
                  </div>
                  <span>Veg</span>
                </button>

                {/* 4. In Stock Quick Pill */}
                <button
                  type="button"
                  onClick={() => setInStockOnly((prev) => !prev)}
                  className={cn(
                    'rounded-xl border px-2 py-1 text-[11px] font-bold shrink-0 transition-colors shadow-2xs',
                    inStockOnly
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-extrabold'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50',
                  )}
                >
                  In Stock
                </button>
              </div>
            </div>

            {/* Product Count Strip */}
            <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[11px] font-bold text-stone-500">
              <span>
                {totalProducts} {totalProducts === 1 ? 'Product' : 'Products'}
              </span>
              <span className="text-emerald-700 font-extrabold">Express 10-30m</span>
            </div>

            {/* 2-Column Compact Product Grid (Reference B) */}
            <div className="p-2">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-60 rounded-2xl bg-white border border-stone-200/70 p-2 animate-pulse shadow-2xs"
                    >
                      <div className="aspect-square w-full rounded-xl bg-stone-100 mb-2" />
                      <div className="h-3 w-16 bg-stone-200 rounded mb-1.5" />
                      <div className="h-3 w-28 bg-stone-200 rounded mb-2" />
                      <div className="h-5 w-20 bg-stone-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center my-4">
                  <ShoppingBag className="mx-auto h-9 w-9 text-stone-300" />
                  <p className="mt-2 text-xs font-bold text-stone-800">No products found</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Try changing your filters or browse another subcategory.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-3 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {products.map((product) => (
                    <MobileSplitPaneProductCard
                      key={product.id}
                      product={product}
                      onOpenVariantDrawer={(prod) => setVariantDrawerProduct(prod)}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => setIsFilterDrawerOpen(false)}
          foodPreference={foodPreference}
          onFoodPreferenceChange={(pref) => setFoodPreference(pref)}
          sortBy={sortBy}
          onSortChange={(sort) => setSortBy(sort)}
          inStockOnly={inStockOnly}
          onInStockChange={(val) => setInStockOnly(val)}
          onReset={handleResetFilters}
        />

        {/* Mobile Variant Drawer */}
        <MobileVariantDrawer
          isOpen={Boolean(variantDrawerProduct)}
          onClose={() => setVariantDrawerProduct(null)}
          product={variantDrawerProduct}
        />
      </div>

      {/* =================================================================== */}
      {/* 2. DESKTOP VIEW (>= md breakpoint, 100% UNCHANGED AND INTACT)       */}
      {/* =================================================================== */}
      <div className="hidden md:block mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-stone-500 overflow-x-auto no-scrollbar"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors shrink-0">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
          <Link href="/categories" className="hover:text-emerald-700 transition-colors shrink-0">
            Categories
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
          {category ? (
            <button
              onClick={() => setSelectedSubSlug(null)}
              className={cn(
                'hover:text-emerald-700 transition-colors shrink-0',
                !selectedSubSlug ? 'font-bold text-stone-900' : 'text-stone-500',
              )}
            >
              {category.name}
            </button>
          ) : (
            <span className="shrink-0">{slug}</span>
          )}
          {activeSubcategory && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
              <span className="font-bold text-stone-900 shrink-0">{activeSubcategory.name}</span>
            </>
          )}
        </nav>

        {/* Main Content Layout with Desktop Left Subcategory Rail */}
        <div className="flex gap-8">
          {/* Desktop Vertical Subcategory Rail (Zepto / BigBasket Reference Style) */}
          {category?.subcategories && category.subcategories.length > 0 && (
            <aside className="w-56 shrink-0">
              <div className="sticky top-24 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-xs">
                <div className="mb-2 px-2 py-1 text-xs font-black uppercase tracking-wider text-stone-400">
                  Subcategories
                </div>
                <div className="space-y-1">
                  {/* "All" button */}
                  <button
                    onClick={() => setSelectedSubSlug(null)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left',
                      selectedSubSlug === null
                        ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-stone-700 hover:bg-stone-50',
                    )}
                  >
                    <span>All Products</span>
                    <span className="text-[11px] font-semibold text-stone-400">
                      {category.productCount}
                    </span>
                  </button>

                  {/* Individual subcategory items */}
                  {category.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubSlug(sub.slug)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left',
                        selectedSubSlug === sub.slug
                          ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-extrabold'
                          : 'text-stone-700 hover:bg-stone-50',
                      )}
                    >
                      <span className="line-clamp-1">{sub.name}</span>
                      <span className="text-[11px] font-semibold text-stone-400">
                        {sub.productCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Right Product Grid Area */}
          <main className="flex-1">
            {/* Header & Filter Controls Bar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-4">
              <div>
                <h1 className="text-xl font-black text-stone-900 sm:text-2xl tracking-tight">
                  {activeSubcategory ? activeSubcategory.name : category?.name || 'Category'}
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-stone-500">
                  Showing {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
                </p>
              </div>

              {/* Filter & Sort Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Food Preference Filter Pills */}
                <div className="flex items-center rounded-xl border border-stone-200 bg-white p-1 shadow-2xs">
                  <button
                    onClick={() => setFoodPreference('ALL')}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
                      foodPreference === 'ALL'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900',
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFoodPreference('VEG')}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
                      foodPreference === 'VEG'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-700 hover:bg-emerald-50',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Veg</span>
                  </button>
                  <button
                    onClick={() => setFoodPreference('NON_VEG')}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
                      foodPreference === 'NON_VEG'
                        ? 'bg-red-600 text-white'
                        : 'text-red-700 hover:bg-red-50',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span>Non-Veg</span>
                  </button>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1 shadow-2xs">
                  <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 mr-1.5" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sort products"
                    className="bg-transparent text-xs font-bold text-stone-700 focus:outline-none cursor-pointer"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="discount_desc">Discount: High to Low</option>
                    <option value="newest">New Arrivals</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="h-80 animate-pulse rounded-2xl bg-stone-100 border border-stone-200/60"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 p-12 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-stone-400" />
                <h3 className="mt-4 text-base font-bold text-stone-900">
                  No products found in this category
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Try adjusting your filters or browse other categories.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setFoodPreference('ALL');
                      setSelectedSubSlug(null);
                    }}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
                  >
                    Clear Filters
                  </button>
                  <Link
                    href="/categories"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Browse All Categories
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </StorefrontLayout>
  );
}
