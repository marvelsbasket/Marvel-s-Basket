'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, MapPin, ShieldCheck, Store, Truck, Zap } from 'lucide-react';
import {
  CategoryProductRail,
  CategoryRail,
  FeaturedSellers,
  HeroBanner,
  TrendingProducts,
} from '@/components/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { useLocation } from '@/features/location/context/location-context';

export default function HomePage() {
  const { activeStore, location, isServiceable, openLocationModal } = useLocation();

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        {/* 1. Location & Store Context Strip */}
        <section
          aria-label="Active delivery context"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-surface-tile px-4 py-3 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            {activeStore ? (
              <p className="text-ink-secondary truncate">
                Shopping from{' '}
                <Link
                  href={`/stores/${activeStore.slug}`}
                  className="font-bold text-ink hover:text-brand"
                >
                  {activeStore.name}
                </Link>
                {activeStore.deliveryEtaLabel && (
                  <span className="ml-2 inline-flex items-center gap-1 font-bold text-brand">
                    <Clock className="h-3.5 w-3.5" />
                    {activeStore.deliveryEtaLabel}
                  </span>
                )}
              </p>
            ) : location && !isServiceable ? (
              <p className="text-amber-800 font-medium">
                We&apos;re coming soon to <strong>{location.displayLocation}</strong> — showing
                read-only master catalog MRP.
              </p>
            ) : (
              <p className="text-ink-secondary">
                Select your PIN code or GPS location to view live store prices and 15–30 min
                delivery ETAs.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={openLocationModal}
            className="text-xs font-bold text-brand hover:underline self-start sm:self-center shrink-0"
          >
            {location ? 'Change Location' : 'Select Location'} →
          </button>
        </section>

        {/* 2. Hero Promotional Banner */}
        <HeroBanner />

        {/* 3. Quick-Access Shop by Category Rail */}
        <CategoryRail />

        {/* 4. Featured Neighborhood Stores */}
        <FeaturedSellers />

        {/* 5. Trending Daily Essentials */}
        <TrendingProducts />

        {/* 6. Deals & Maximum Savings Rail */}
        <CategoryProductRail
          title="Super Saver Deals & Offers"
          subtitle="Best value discounts on everyday staples from neighborhood stores"
          minDiscount={5}
          sort="discount_desc"
          seeAllHref="/search?minDiscount=5&sort=discount_desc"
        />

        {/* 7. Fresh Fruits & Vegetables Rail */}
        <CategoryProductRail
          title="Fresh Produce & Daily Vegetables"
          subtitle="Farm-sorted vegetables and crisp seasonal fruits"
          categorySlug="fresh-produce"
        />

        {/* 8. Dairy, Milk & Bakery Rail */}
        <CategoryProductRail
          title="Morning Dairy, Milk & Bread"
          subtitle="Chilled milk pouches, curd, butter, and sourdough loaves"
          categorySlug="dairy-bakery"
        />

        {/* 9. Kitchen Staples & Cooking Oils Rail */}
        <CategoryProductRail
          title="Atta, Rice, Dals & Cooking Oils"
          subtitle="Pantry essentials packed hygienically for everyday Indian cooking"
          categorySlug="groceries-kitchen"
        />

        {/* 10. Hyperlocal Marketplace Trust & Quality Strip */}
        <section
          aria-label="Marvel's Basket Marketplace Promise"
          className="rounded-3xl border border-border bg-gradient-to-br from-brand-tint/70 via-white to-emerald-50/40 p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Hyperlocal Express Delivery</h3>
                <p className="text-xs text-ink-secondary mt-1">
                  Dispatched directly from verified stores within your neighborhood PIN radius.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Single-Store Freshness</h3>
                <p className="text-xs text-ink-secondary mt-1">
                  Every basket ships from one approved local seller with real-time stock checks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Verified Store Catalog</h3>
                <p className="text-xs text-ink-secondary mt-1">
                  Standardized pack sizes, transparent MRP savings, and quality assurance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Want to Sell Locally?</h3>
                <Link
                  href="/sell-on-marvels-basket"
                  className="inline-block text-xs font-bold text-brand hover:underline mt-1"
                >
                  Partner with Marvel&apos;s Basket →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StorefrontLayout>
  );
}
