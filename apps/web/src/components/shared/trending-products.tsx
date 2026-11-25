'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductCardItem } from '@marvels-basket/shared';
import { ProductCard } from '@/features/catalog/components/product-card';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { useLocation } from '@/features/location/context/location-context';

export function TrendingProducts() {
  const { isHydrated, activeStore, location } = useLocation();
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    async function loadTrending() {
      try {
        setLoading(true);
        const res = await CatalogService.getProducts({
          limit: 8,
          isFeatured: true,
          storeId: activeStore?.id,
          postalCode: location?.postalCode ?? undefined,
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
        });
        if (!cancelled) {
          setProducts(res.items || []);
        }
      } catch {
        // Fallback silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTrending();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, activeStore?.id, location?.postalCode, location?.latitude, location?.longitude]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="trending-heading" className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {activeStore?.deliveryEtaLabel
                ? `Express in ${activeStore.deliveryEtaLabel}`
                : 'Hyperlocal Express'}
            </span>
          </div>
          <h2
            id="trending-heading"
            className="text-lg font-black text-stone-900 sm:text-xl tracking-tight"
          >
            Trending Daily Essentials
          </h2>
        </div>
        <Link
          href="/search?sort=popular"
          className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <span>See All</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-stone-100 border border-stone-200/60"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
