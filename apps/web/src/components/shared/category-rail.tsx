'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Apple,
  Baby,
  Coffee,
  Home,
  Milk,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { CategoryTreeItem } from '@marvels-basket/shared';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { cn } from '@/lib/utils';

export interface StaticCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  bgGradient: string;
}

export const FALLBACK_CATEGORIES: StaticCategoryItem[] = [
  {
    id: '1',
    name: 'Groceries',
    slug: 'groceries-staples',
    icon: <ShoppingBag className="h-7 w-7 text-amber-600" />,
    bgGradient: 'from-amber-100 to-orange-50',
  },
  {
    id: '2',
    name: 'Fruits & Veggies',
    slug: 'fresh-produce',
    icon: <Apple className="h-7 w-7 text-emerald-600" />,
    bgGradient: 'from-emerald-100 to-green-50',
  },
  {
    id: '3',
    name: 'Dairy & Bakery',
    slug: 'dairy-bakery',
    icon: <Milk className="h-7 w-7 text-sky-600" />,
    bgGradient: 'from-sky-100 to-blue-50',
  },
  {
    id: '4',
    name: 'Snacks & Drinks',
    slug: 'snacks-beverages',
    icon: <Coffee className="h-7 w-7 text-orange-600" />,
    bgGradient: 'from-orange-100 to-red-50',
  },
  {
    id: '5',
    name: 'Personal Care',
    slug: 'personal-care',
    icon: <Sparkles className="h-7 w-7 text-pink-600" />,
    bgGradient: 'from-pink-100 to-rose-50',
  },
  {
    id: '6',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    icon: <Home className="h-7 w-7 text-cyan-600" />,
    bgGradient: 'from-cyan-100 to-teal-50',
  },
  {
    id: '7',
    name: 'Baby Care',
    slug: 'baby-care',
    icon: <Baby className="h-7 w-7 text-indigo-600" />,
    bgGradient: 'from-indigo-100 to-purple-50',
  },
  {
    id: '8',
    name: 'All Categories',
    slug: 'all',
    icon: <MoreHorizontal className="h-7 w-7 text-brand" />,
    bgGradient: 'from-emerald-100 to-lime-50',
  },
];

export function CategoryRail() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const tree = await CatalogService.getCategoriesTree();
        if (tree && tree.length > 0) {
          setCategories(tree.slice(0, 7));
        }
      } catch {
        // Fall back gracefully
      }
    }
    loadCategories();
  }, []);

  const displayItems =
    categories.length > 0
      ? [
          ...categories.map((c, idx) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            iconUrl: c.iconUrl,
            fallbackIcon: FALLBACK_CATEGORIES[idx % (FALLBACK_CATEGORIES.length - 1)].icon,
            bgGradient: FALLBACK_CATEGORIES[idx % (FALLBACK_CATEGORIES.length - 1)].bgGradient,
            href: `/categories/${c.slug}`,
          })),
          {
            id: 'more-all',
            name: 'All Categories',
            slug: 'categories',
            iconUrl: null,
            fallbackIcon: <MoreHorizontal className="h-7 w-7 text-brand" />,
            bgGradient: 'from-emerald-100 to-lime-50',
            href: '/categories',
          },
        ]
      : FALLBACK_CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          iconUrl: null,
          fallbackIcon: c.icon,
          bgGradient: c.bgGradient,
          href: c.slug === 'all' ? '/categories' : `/categories/${c.slug}`,
        }));

  return (
    <section aria-label="Product Categories" className="w-full">
      {/* Responsive Grid on desktop, horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar sm:grid sm:grid-cols-4 md:grid-cols-8 sm:overflow-visible sm:pb-0">
        {displayItems.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group flex flex-col items-center flex-shrink-0 text-center focus-visible:outline-none"
          >
            {/* Category Icon Tile */}
            <div
              className={cn(
                'flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-tile border border-border-card bg-surface-tile shadow-2xs',
                'transition-all duration-200 group-hover:scale-105 group-hover:shadow-card group-hover:border-brand/40',
              )}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner transition-transform group-hover:rotate-3 overflow-hidden',
                  category.bgGradient,
                )}
              >
                {category.iconUrl ? (
                  <img
                    src={category.iconUrl}
                    alt={category.name}
                    className="h-9 w-9 object-contain"
                  />
                ) : (
                  category.fallbackIcon
                )}
              </div>
            </div>

            {/* Category Name */}
            <span className="mt-2 block w-20 sm:w-22 text-center text-[13px] font-semibold text-ink transition-colors group-hover:text-brand line-clamp-2 leading-tight">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
