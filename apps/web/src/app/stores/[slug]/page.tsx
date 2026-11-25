'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react';
import { ProductCardItem, PublicStoreItem } from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { ProductCard } from '@/features/catalog/components/product-card';
import { LocationService } from '@/features/location/services/location.service';
import { useLocation } from '@/features/location/context/location-context';
import { useBasket } from '@/features/basket/context/basket-context';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils/currency';

export default function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { isHydrated, location, activeStore } = useLocation();
  const { requestStoreSwitch } = useBasket();

  const [store, setStore] = useState<PublicStoreItem | null>(null);
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest'
  >('relevance');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    async function loadStore() {
      setIsLoadingStore(true);
      try {
        const s = await LocationService.getStoreBySlug(slug, {
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
        });
        if (!cancelled) setStore(s);
      } catch {
        if (!cancelled) setStore(null);
      } finally {
        if (!cancelled) setIsLoadingStore(false);
      }
    }
    loadStore();
    return () => {
      cancelled = true;
    };
  }, [slug, isHydrated, location?.latitude, location?.longitude]);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    async function loadStoreProducts() {
      setIsLoadingProducts(true);
      try {
        const res = await LocationService.getStoreProducts(slug, {
          category: selectedCategorySlug || undefined,
          q: searchQuery.trim() || undefined,
          sort: sortBy,
          inStockOnly: inStockOnly || undefined,
          limit: 24,
        });
        if (!cancelled) {
          setProducts(res.items || []);
          setTotal(res.total || 0);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }

    const timer = setTimeout(loadStoreProducts, searchQuery ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, isHydrated, selectedCategorySlug, searchQuery, sortBy, inStockOnly]);

  if (isLoadingStore) {
    return (
      <StorefrontLayout>
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-44 animate-pulse rounded-3xl bg-stone-100" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!store) {
    return (
      <StorefrontLayout>
        <div className="mx-auto max-w-container px-4 py-16 text-center space-y-4">
          <Store className="mx-auto h-14 w-14 text-stone-300" />
          <h1 className="text-xl font-bold text-ink">Store Not Found</h1>
          <p className="text-sm text-muted">
            This store is either suspended, unavailable, or does not exist.
          </p>
          <Link
            href="/stores"
            className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-forest"
          >
            Browse Nearby Stores
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const isSelectedActive = activeStore?.id === store.id;

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link
          href="/stores"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-secondary hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Nearby Stores
        </Link>

        {/* Store Header Banner */}
        <section className="rounded-3xl border border-border bg-gradient-to-br from-forest via-emerald-900 to-emerald-950 p-6 sm:p-8 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                    store.isAcceptingOrders
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {store.operationalStatusLabel}
                </span>
                {store.openingTime && store.closingTime && (
                  <span className="text-xs text-white/80">
                    Hours: {store.openingTime} – {store.closingTime} IST
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{store.name}</h1>

              <p className="text-sm text-white/85 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-cta shrink-0" />
                <span>
                  {[store.addressLine1, store.city, store.state, store.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </p>

              {store.description && (
                <p className="text-xs sm:text-sm text-white/80 max-w-2xl">{store.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold">
                {store.deliveryEtaLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                    <Clock className="h-3.5 w-3.5 text-cta" />
                    Delivery in {store.deliveryEtaLabel}
                  </span>
                )}
                {store.distanceKm !== null && (
                  <span className="rounded-full bg-white/15 px-3 py-1">
                    {store.distanceKm} km from you
                  </span>
                )}
                {store.rating !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                    <Star className="h-3.5 w-3.5 fill-cta text-cta" />
                    {store.rating.toFixed(1)} ({store.reviewCount} reviews)
                  </span>
                )}
                {store.minimumOrderValue !== null && (
                  <span className="rounded-full bg-white/15 px-3 py-1">
                    Min. Order {formatINR(store.minimumOrderValue)}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {isSelectedActive ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-cta px-4 py-2.5 text-xs font-extrabold text-forest shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Active Storefront</span>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => requestStoreSwitch(store)}
                  className="bg-cta hover:bg-highlight text-forest font-extrabold rounded-xl px-5 py-2.5"
                >
                  Shop From This Store
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Store Closed Alert */}
        {!store.isAcceptingOrders && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>{store.name}</strong> is currently{' '}
            <strong>{store.operationalStatusLabel.toLowerCase()}</strong>. You can browse this
            store&apos;s catalog now, and place items in your basket once the store reopens.
          </div>
        )}

        {/* Store Category Chips & In-Store Search / Sort */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategorySlug('')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategorySlug === ''
                  ? 'bg-brand text-white'
                  : 'border border-border bg-white text-ink-secondary hover:border-brand'
              }`}
            >
              All Items ({store.activeProductCount})
            </button>
            {store.categories?.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategorySlug === cat.slug
                    ? 'bg-brand text-white'
                    : 'border border-border bg-white text-ink-secondary hover:border-brand'
                }`}
              >
                {cat.name} ({cat.productCount})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${store.name}...`}
                aria-label="Search within store"
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-border text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={`h-9 rounded-xl border px-3 text-xs font-bold transition-colors ${
                inStockOnly
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-white text-ink-secondary hover:border-brand'
              }`}
            >
              In Stock Only
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort store products"
              className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-bold text-ink focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount_desc">Highest Discount</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Store Product Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <ShoppingBag className="mx-auto h-12 w-12 text-stone-300" />
            <h2 className="text-base font-bold text-ink">No matching items in this store</h2>
            <p className="text-xs text-muted">
              Try clearing your search or category filter within {store.name}.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategorySlug('');
                setSearchQuery('');
                setInStockOnly(false);
              }}
            >
              Reset Store Filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted">
              Showing {products.length} of {total} listed products at {store.name}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </StorefrontLayout>
  );
}
