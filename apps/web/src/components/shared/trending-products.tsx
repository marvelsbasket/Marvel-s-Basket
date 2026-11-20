'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductCardItem } from '@marvels-basket/shared';
import { ProductCard } from '@/features/catalog/components/product-card';
import { CatalogService } from '@/features/catalog/services/catalog.service';

export function TrendingProducts() {
  const [products, setProducts] = useState<ProductCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrending() {
      try {
        const res = await CatalogService.getProducts({ limit: 8 });
        setProducts(res.items || []);
      } catch {
        // Fall back gracefully
      } finally {
        setLoading(false);
      }
    }
    loadTrending();
  }, []);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="trending-heading" className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Hyperlocal Express</span>
          </div>
          <h2
            id="trending-heading"
            className="text-lg font-black text-stone-900 sm:text-xl tracking-tight"
          >
            Trending Daily Essentials
          </h2>
        </div>
        <Link
          href="/categories"
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
