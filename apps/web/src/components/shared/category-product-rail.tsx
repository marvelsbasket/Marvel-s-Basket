'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCardItem } from '@marvels-basket/shared';
import { ProductCard } from '@/features/catalog/components/product-card';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { useLocation } from '@/features/location/context/location-context';

export interface CategoryProductRailProps {
  title: string;
  subtitle?: string;
  categorySlug?: string;
  minDiscount?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest' | 'popular';
  seeAllHref?: string;
}

export function CategoryProductRail({
  title,
  subtitle,
  categorySlug,
  minDiscount,
  sort = 'relevance',
  seeAllHref,
}: CategoryProductRailProps) {
  const { isHydrated, activeStore, location } = useLocation();
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    async function loadItems() {
      try {
        setLoading(true);
        const res = await CatalogService.getProducts({
          category: categorySlug,
          minDiscount,
          sort,
          limit: 4,
          storeId: activeStore?.id,
          postalCode: location?.postalCode ?? undefined,
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
        });
        if (!cancelled) {
          setProducts(res.items || []);
        }
      } catch {
        // Silently hide section if load fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadItems();

    return () => {
      cancelled = true;
    };
  }, [
    isHydrated,
    categorySlug,
    minDiscount,
    sort,
    activeStore?.id,
    location?.postalCode,
    location?.latitude,
    location?.longitude,
  ]);

  if (!loading && products.length === 0) {
    return null;
  }

  const targetHref = seeAllHref || (categorySlug ? `/categories/${categorySlug}` : '/search');

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink sm:text-xl tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        <Link
          href={targetHref}
          className="group flex items-center gap-1 text-xs font-bold text-brand hover:text-forest transition-colors shrink-0"
        >
          <span>See All</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-stone-100 border border-stone-200/60"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
