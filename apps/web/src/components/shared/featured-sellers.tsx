'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Star, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface Seller {
  id: string;
  name: string;
  slug: string;
  rating: number;
  eta: string;
  imageBg: string;
}

export const FEATURED_SELLERS: Seller[] = [
  {
    id: '1',
    name: 'City Fresh Mart',
    slug: 'city-fresh-mart',
    rating: 4.6,
    eta: '15 min',
    imageBg: 'from-amber-700 via-orange-800 to-amber-950',
  },
  {
    id: '2',
    name: 'Sharma Grocery',
    slug: 'sharma-grocery',
    rating: 4.5,
    eta: '20 min',
    imageBg: 'from-emerald-700 via-green-800 to-emerald-950',
  },
  {
    id: '3',
    name: 'Apna Super Store',
    slug: 'apna-super-store',
    rating: 4.7,
    eta: '18 min',
    imageBg: 'from-blue-700 via-indigo-800 to-blue-950',
  },
  {
    id: '4',
    name: 'Daily Needs Shop',
    slug: 'daily-needs-shop',
    rating: 4.4,
    eta: '25 min',
    imageBg: 'from-purple-700 via-violet-800 to-purple-950',
  },
];

export function FeaturedSellers() {
  return (
    <section aria-labelledby="featured-sellers-heading" className="w-full">
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="featured-sellers-heading"
          className="text-lg font-bold text-ink sm:text-xl tracking-tight"
        >
          Featured Sellers Near You
        </h2>
        <Link
          href="/sellers"
          className="group flex items-center gap-1 text-sm font-bold text-brand hover:text-forest transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* 4-Column Responsive Seller Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED_SELLERS.map((seller) => (
          <Link
            key={seller.id}
            href={`/sellers/${seller.slug}`}
            className="group block focus-visible:outline-none"
          >
            <Card hoverable className="h-full">
              {/* Storefront Visual Banner */}
              <div
                className={`relative h-36 w-full bg-gradient-to-br ${seller.imageBg} flex items-center justify-center overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 flex flex-col items-center justify-center text-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs transition-transform group-hover:scale-110">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <span className="mt-2 text-xs font-semibold tracking-wide uppercase text-white/90">
                    Supermarket
                  </span>
                </div>
              </div>

              {/* Store Metadata Body */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                  {seller.name}
                </h3>

                <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-ink-secondary">
                  {/* Star Rating */}
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{seller.rating.toFixed(1)}</span>
                  </div>

                  {/* Delivery ETA */}
                  <div className="flex items-center gap-1 text-brand">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{seller.eta}</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
