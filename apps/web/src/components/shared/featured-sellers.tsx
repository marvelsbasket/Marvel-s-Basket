'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, MapPinOff, Star, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/features/location/context/location-context';

const STORE_GRADIENTS = [
  'from-forest via-emerald-800 to-emerald-950',
  'from-emerald-700 via-teal-800 to-emerald-950',
  'from-amber-700 via-orange-800 to-amber-950',
  'from-slate-700 via-slate-800 to-slate-950',
];

export function FeaturedSellers() {
  const {
    isHydrated,
    isResolving,
    hasLocationContext,
    isServiceable,
    location,
    nearbyStores,
    activeStore,
    openLocationModal,
  } = useLocation();

  return (
    <section aria-labelledby="featured-sellers-heading" className="w-full">
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2
            id="featured-sellers-heading"
            className="text-lg font-bold text-ink sm:text-xl tracking-tight"
          >
            Neighborhood Stores Near You
          </h2>
          {location && (
            <p className="text-xs text-muted mt-0.5">
              Delivering to{' '}
              <span className="font-semibold text-ink">{location.displayLocation}</span>
            </p>
          )}
        </div>
        <Link
          href="/stores"
          className="group flex items-center gap-1 text-sm font-bold text-brand hover:text-forest transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Loading / Hydrating State */}
      {(!isHydrated || isResolving) && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-border bg-surface-tile"
            />
          ))}
        </div>
      )}

      {/* No Location Selected State */}
      {isHydrated && !isResolving && !hasLocationContext && (
        <div className="rounded-2xl border border-brand/20 bg-brand-tint/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">
                Choose your delivery area to unlock live store prices
              </h3>
              <p className="text-sm text-ink-secondary mt-0.5">
                Discover neighborhood supermarkets and kirana stores delivering in 15–30 minutes to
                your PIN code.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={openLocationModal}
            className="bg-brand hover:bg-forest text-white shrink-0"
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            Set Delivery Location
          </Button>
        </div>
      )}

      {/* Unserviceable Area State ("Coming Soon") */}
      {isHydrated && !isResolving && hasLocationContext && !isServiceable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <MapPinOff className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">We&apos;re coming soon to your area!</h3>
              <p className="text-sm text-amber-900/80 mt-0.5">
                No approved stores currently serve <strong>{location?.displayLocation}</strong>
                {location?.postalCode ? ` (${location.postalCode})` : ''}. Switch to another area or
                browse the master catalog in read-only mode.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={openLocationModal}
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 shrink-0"
          >
            Try Another Location
          </Button>
        </div>
      )}

      {/* Real Nearby Stores Grid */}
      {isHydrated && !isResolving && isServiceable && nearbyStores.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {nearbyStores.slice(0, 4).map((store, idx) => {
            const isSelected = activeStore?.id === store.id;
            const gradient = STORE_GRADIENTS[idx % STORE_GRADIENTS.length];
            return (
              <Link
                key={store.id}
                href={`/stores/${store.slug}`}
                className="group block focus-visible:outline-none"
              >
                <Card
                  hoverable
                  className={`h-full overflow-hidden ${
                    isSelected ? 'ring-2 ring-brand border-brand' : ''
                  }`}
                >
                  {/* Store Visual Header */}
                  <div
                    className={`relative h-32 w-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-black/15" />
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          store.isAcceptingOrders
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {store.operationalStatusLabel}
                      </span>
                      {isSelected && (
                        <span className="rounded-full bg-cta px-2 py-0.5 text-[10px] font-extrabold text-forest">
                          Active Store
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 flex flex-col items-center justify-center text-white">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs transition-transform group-hover:scale-110">
                        <Store className="h-5 w-5 text-white" />
                      </div>
                      <span className="mt-1.5 text-[11px] font-semibold tracking-wide uppercase text-white/90">
                        {store.city}
                      </span>
                    </div>
                  </div>

                  {/* Store Metadata */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                      {store.name}
                    </h3>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {store.activeProductCount} items listed
                      {store.distanceKm !== null ? ` • ${store.distanceKm} km away` : ''}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink-secondary">
                      {store.rating !== null ? (
                        <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-brand font-bold">
                          <Star className="h-3 w-3 fill-brand text-brand" />
                          <span>{store.rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                          Verified Store
                        </span>
                      )}

                      {store.deliveryEtaLabel ? (
                        <div className="flex items-center gap-1 text-brand font-semibold">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{store.deliveryEtaLabel}</span>
                        </div>
                      ) : (
                        <span className="text-ink-muted">{store.operationalStatusLabel}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
