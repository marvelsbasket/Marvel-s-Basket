'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Grid, Search, Sparkles } from 'lucide-react';
import { CategoryTreeItem } from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { CatalogService } from '@/features/catalog/services/catalog.service';

/**
 * Returns a fallback emoji/icon for categories or subcategories lacking an iconUrl.
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

export default function AllCategoriesPage() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSearch, setMobileSearch] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const tree = await CatalogService.getCategoriesTree();
        setCategories(tree);
      } catch (err) {
        console.error('Failed to load categories tree:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Filter categories on mobile search if typed
  const filteredCategories = mobileSearch.trim()
    ? (categories
        .map((cat) => {
          const matchParent = cat.name.toLowerCase().includes(mobileSearch.toLowerCase());
          const matchedSubs = (cat.subcategories || []).filter((sub) =>
            sub.name.toLowerCase().includes(mobileSearch.toLowerCase()),
          );
          if (matchParent) return cat;
          if (matchedSubs.length > 0) return { ...cat, subcategories: matchedSubs };
          return null;
        })
        .filter(Boolean) as CategoryTreeItem[])
    : categories;

  return (
    <StorefrontLayout cartItemCount={2}>
      {/* =================================================================== */}
      {/* 1. MOBILE CATEGORIES DIRECTORY (< md breakpoint, Reference A style) */}
      {/* =================================================================== */}
      <div className="block md:hidden bg-[#FBFDFB] min-h-[calc(100dvh-120px)] pb-28">
        {/* Sticky Mobile Search Header */}
        <div className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-md shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-black tracking-tight text-stone-900">Categories</h1>
              <p className="text-[11px] font-semibold text-stone-500">
                Explore fresh groceries & daily essentials
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 border border-emerald-200/60">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              10-30 mins
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Search in all categories..."
              className="h-9 w-full rounded-full border border-stone-200 bg-[#F6F8F5] pl-9 pr-4 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Mobile Category Group Sections */}
        <div className="px-3.5 py-4 space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((section) => (
                <div
                  key={section}
                  className="rounded-2xl bg-white p-3.5 border border-stone-200/70 shadow-2xs"
                >
                  <div className="h-4 w-32 rounded-md bg-stone-200 animate-pulse mb-3" />
                  <div className="grid grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map((tile) => (
                      <div key={tile} className="flex flex-col items-center gap-1.5">
                        <div className="aspect-square w-full rounded-2xl bg-stone-100 animate-pulse border border-stone-200/50" />
                        <div className="h-2.5 w-12 rounded bg-stone-200 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center mt-6">
              <Grid className="mx-auto h-10 w-10 text-stone-300" />
              <p className="mt-2 text-sm font-bold text-stone-900">
                No categories matching "{mobileSearch}"
              </p>
              <button
                type="button"
                onClick={() => setMobileSearch('')}
                className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const subs = cat.subcategories || [];

              return (
                <section
                  key={cat.id}
                  className="rounded-3xl border border-stone-200/80 bg-white p-3.5 shadow-2xs"
                >
                  {/* Category Section Header */}
                  <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryVisual(cat.slug, cat.name)}</span>
                      <h2 className="text-sm font-black text-stone-900 leading-tight">
                        {cat.name}
                      </h2>
                    </div>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="flex items-center gap-0.5 text-xs font-extrabold text-emerald-700 hover:text-emerald-800"
                    >
                      <span>See All</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* 4-Column Subcategory Tiles Grid (Reference A) */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {subs.length > 0 ? (
                      subs.map((sub) => {
                        const iconEmoji = getCategoryVisual(sub.slug, sub.name);

                        return (
                          <Link
                            key={sub.id}
                            href={`/categories/${cat.slug}?sub=${sub.slug}`}
                            className="group flex flex-col items-center text-center focus-visible:outline-none"
                          >
                            {/* Visual Thumbnail Box */}
                            <div className="aspect-square w-full rounded-2xl bg-[#F6F8F5] border border-stone-200/70 p-2 flex items-center justify-center transition-all group-hover:border-emerald-300 group-hover:bg-emerald-50/40 group-active:scale-95 shadow-2xs">
                              {sub.iconUrl ? (
                                <img
                                  src={sub.iconUrl}
                                  alt={sub.name}
                                  className="h-full w-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-2xl sm:text-3xl select-none group-hover:scale-110 transition-transform">
                                  {iconEmoji}
                                </span>
                              )}
                            </div>

                            {/* Subcategory Label */}
                            <span className="mt-1.5 line-clamp-2 text-[11px] font-bold text-stone-800 leading-tight group-hover:text-emerald-700">
                              {sub.name}
                            </span>
                          </Link>
                        );
                      })
                    ) : (
                      /* Fallback tile for single category without subcategories */
                      <Link
                        href={`/categories/${cat.slug}`}
                        className="group flex flex-col items-center text-center focus-visible:outline-none"
                      >
                        <div className="aspect-square w-full rounded-2xl bg-[#F6F8F5] border border-stone-200/70 p-2 flex items-center justify-center transition-all group-hover:border-emerald-300 group-hover:bg-emerald-50/40 group-active:scale-95 shadow-2xs">
                          {cat.iconUrl ? (
                            <img
                              src={cat.iconUrl}
                              alt={cat.name}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-2xl select-none">
                              {getCategoryVisual(cat.slug, cat.name)}
                            </span>
                          )}
                        </div>
                        <span className="mt-1.5 line-clamp-2 text-[11px] font-bold text-stone-800 leading-tight group-hover:text-emerald-700">
                          All {cat.name}
                        </span>
                      </Link>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. DESKTOP ALL CATEGORIES VIEW (>= md breakpoint, 100% UNCHANGED)   */}
      {/* =================================================================== */}
      <div className="hidden md:block mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-xs font-medium text-stone-500"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="font-semibold text-stone-900">All Categories</span>
        </nav>

        {/* Section Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
              Explore All Categories
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Browse farm-fresh fruits, dairy, kitchen staples, snacks, and daily household needs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full self-start sm:self-auto">
            <Sparkles className="h-4 w-4" />
            <span>Hyperlocal Express Delivery</span>
          </div>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-stone-100 border border-stone-200/60"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-12 text-center">
            <Grid className="mx-auto h-12 w-12 text-stone-400" />
            <h3 className="mt-4 text-base font-bold text-stone-900">No categories found</h3>
            <p className="mt-1 text-sm text-stone-500">
              Please check back shortly or explore our featured products on the homepage.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group flex flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
              >
                {/* Category Header Link */}
                <Link
                  href={`/categories/${category.slug}`}
                  className="flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 transition-transform group-hover:scale-105">
                    {category.iconUrl ? (
                      <img
                        src={category.iconUrl}
                        alt={category.name}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <Grid className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                      {category.name}
                    </h2>
                    <span className="text-xs font-semibold text-stone-500">
                      {category.productCount} {category.productCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </Link>

                {/* Subcategories Pill List */}
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-stone-100">
                    {category.subcategories.slice(0, 5).map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/categories/${category.slug}?sub=${sub.slug}`}
                        className="rounded-lg bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                    {category.subcategories.length > 5 && (
                      <Link
                        href={`/categories/${category.slug}`}
                        className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-bold text-stone-500 hover:bg-stone-200 transition-colors"
                      >
                        +{category.subcategories.length - 5} more
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
