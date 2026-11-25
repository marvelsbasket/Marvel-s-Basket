'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, MapPin, MapPinOff, Star, Store } from 'lucide-react';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { useLocation } from '@/features/location/context/location-context';
import { useBasket } from '@/features/basket/context/basket-context';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils/currency';

export default function NearbyStoresPage() {
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
  const { requestStoreSwitch } = useBasket();

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface-tile p-5">
          <div>
            <h1 className="text-xl font-black text-ink sm:text-2xl tracking-tight">
              Neighborhood Stores Near You
            </h1>
            <p className="text-sm text-ink-secondary mt-1">
              {location ? (
                <>
                  Showing approved stores serving{' '}
                  <strong className="text-ink">{location.displayLocation}</strong>
                  {location.postalCode ? ` (${location.postalCode})` : ''}.
                </>
              ) : (
                'Set your delivery PIN code or GPS location to discover nearby stores.'
              )}
            </p>
          </div>
          <Button
            type="button"
            onClick={openLocationModal}
            className="bg-brand hover:bg-forest text-white shrink-0"
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            {location ? 'Change Location' : 'Select Location'}
          </Button>
        </div>

        {/* Loading State */}
        {(!isHydrated || isResolving) && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl border border-border bg-stone-100"
              />
            ))}
          </div>
        )}

        {/* No Location Selected */}
        {isHydrated && !isResolving && !hasLocationContext && (
          <div className="rounded-3xl border border-dashed border-brand/30 bg-brand-tint/40 p-10 text-center space-y-4">
            <MapPin className="mx-auto h-12 w-12 text-brand" />
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-bold text-ink">Where should we deliver?</h2>
              <p className="text-sm text-ink-secondary mt-1">
                We match stores by your neighborhood PIN code and service radius so you always see
                real inventory and fast ETAs.
              </p>
            </div>
            <Button
              type="button"
              onClick={openLocationModal}
              className="bg-brand hover:bg-forest text-white"
            >
              Choose Delivery Location
            </Button>
          </div>
        )}

        {/* Unserviceable Area */}
        {isHydrated && !isResolving && hasLocationContext && !isServiceable && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-10 text-center space-y-4">
            <MapPinOff className="mx-auto h-12 w-12 text-amber-600" />
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-bold text-ink">We&apos;re coming soon to your area!</h2>
              <p className="text-sm text-amber-900/80 mt-1">
                None of our partner stores currently deliver to{' '}
                <strong>{location?.displayLocation}</strong>. Switch to an alternate address or
                supported PIN code.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                onClick={openLocationModal}
                className="bg-brand hover:bg-forest text-white"
              >
                Select Another Location
              </Button>
              <Link
                href="/categories"
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
              >
                Browse Read-Only Catalog
              </Link>
            </div>
          </div>
        )}

        {/* Eligible Stores Grid */}
        {isHydrated && !isResolving && isServiceable && nearbyStores.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyStores.map((store) => {
              const isSelected = activeStore?.id === store.id;
              return (
                <div
                  key={store.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                    isSelected
                      ? 'border-brand ring-2 ring-brand/20'
                      : 'border-border hover:border-brand/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand shrink-0">
                          <Store className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/stores/${store.slug}`}
                            className="text-base font-bold text-ink hover:text-brand line-clamp-1"
                          >
                            {store.name}
                          </Link>
                          <p className="text-xs text-muted truncate">
                            {[store.addressLine1, store.city, store.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                          store.isAcceptingOrders
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {store.operationalStatusLabel}
                      </span>
                    </div>

                    {store.description && (
                      <p className="mt-3 text-xs text-ink-secondary line-clamp-2">
                        {store.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                      {store.deliveryEtaLabel && (
                        <span className="inline-flex items-center gap-1 font-semibold text-brand">
                          <Clock className="h-3.5 w-3.5" />
                          {store.deliveryEtaLabel}
                        </span>
                      )}
                      {store.distanceKm !== null && <span>{store.distanceKm} km away</span>}
                      {store.rating !== null && (
                        <span className="inline-flex items-center gap-1 font-bold text-ink">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {store.rating.toFixed(1)} ({store.reviewCount})
                        </span>
                      )}
                      <span>{store.activeProductCount} listed items</span>
                      {store.minimumOrderValue !== null && (
                        <span>Min. {formatINR(store.minimumOrderValue)}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-brand">
                        <CheckCircle2 className="h-4 w-4" />
                        Active Store
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestStoreSwitch(store)}
                        className="text-xs font-bold text-brand hover:underline"
                      >
                        Shop from this store
                      </button>
                    )}

                    <Link
                      href={`/stores/${store.slug}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-forest transition-colors"
                    >
                      <span>View Catalog</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
