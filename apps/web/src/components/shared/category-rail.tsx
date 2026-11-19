'use client';

import React from 'react';
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
import { cn } from '@/lib/utils';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  bgGradient: string;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: '1',
    name: 'Groceries',
    slug: 'groceries',
    icon: <ShoppingBag className="h-7 w-7 text-amber-600" />,
    bgGradient: 'from-amber-100 to-orange-50',
  },
  {
    id: '2',
    name: 'Fruits & Vegetables',
    slug: 'fruits-vegetables',
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
    name: 'Snacks & Beverages',
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
    name: 'Home & Cleaning',
    slug: 'home-cleaning',
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
    name: 'More',
    slug: 'all-categories',
    icon: <MoreHorizontal className="h-7 w-7 text-brand" />,
    bgGradient: 'from-emerald-100 to-lime-50',
  },
];

export function CategoryRail() {
  return (
    <section aria-label="Product Categories" className="w-full">
      {/* Responsive Grid on desktop, horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar sm:grid sm:grid-cols-4 md:grid-cols-8 sm:overflow-visible sm:pb-0">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
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
                  'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner transition-transform group-hover:rotate-3',
                  category.bgGradient,
                )}
              >
                {category.icon}
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
