'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Timer,
  XCircle,
} from 'lucide-react';
import { CheckoutSummaryResponse, CustomerAddressResponse } from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useBasket } from '@/features/basket/context/basket-context';
import { addressService } from '@/features/addresses/services/address.service';
import { CheckoutService } from '@/features/checkout/services/checkout.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';

interface PriceChangeDelta {
  sellerProductId: string;
  productName: string;
  oldUnitPrice: number;
  newUnitPrice: number;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function CheckoutContent() {
  const router = useRouter();
  const { basket, refreshBasket, notify } = useBasket();

  const [addresses, setAddresses] = useState<CustomerAddressResponse[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [summary, setSummary] = useState<CheckoutSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [priceChanges, setPriceChanges] = useState<PriceChangeDelta[] | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Offset between server clock and local browser clock (ms)
  const serverClockOffsetRef = useRef<number>(0);

  const syncCountdownFromSummary = useCallback((res: CheckoutSummaryResponse) => {
    const serverMs = new Date(res.serverTime).getTime();
    const localMs = Date.now();
    serverClockOffsetRef.current = serverMs - localMs;
    const expiresMs = new Date(res.expiresAt).getTime();
    const secs = Math.max(
      0,
      Math.floor((expiresMs - (Date.now() + serverClockOffsetRef.current)) / 1000),
    );
    setRemainingSeconds(res.isExpired ? 0 : secs);
  }, []);

  const prepareForAddress = useCallback(
    async (addressId: string, skipExpectedPrices = false) => {
      if (!addressId) return;
      setIsPreparing(true);
      setErrorMsg(null);
      setPriceChanges(null);

      try {
        const expectedItemPrices =
          !skipExpectedPrices && basket.items.length > 0
            ? basket.items.map((item) => ({
                sellerProductId: item.sellerProductId,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
              }))
            : undefined;

        const res = await CheckoutService.prepareCheckout({
          addressId,
          expectedItemPrices,
        });
        setSummary(res);
        syncCountdownFromSummary(res);
      } catch (err) {
        if (err instanceof ApiError) {
          const payload = err.data as { changedItems?: PriceChangeDelta[] } | undefined;
          if (err.code === 'PRICE_CHANGE_DETECTED' && Array.isArray(payload?.changedItems)) {
            setPriceChanges(payload.changedItems);
          } else {
            setErrorMsg(err.message);
          }
        } else {
          setErrorMsg('Unable to prepare checkout. Please try again.');
        }
      } finally {
        setIsPreparing(false);
      }
    },
    [basket.items, syncCountdownFromSummary],
  );

  // Initial load: fetch addresses and prepare or resume checkout
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setIsLoading(true);
      try {
        const list = await addressService.list();
        if (cancelled) return;
        setAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          await prepareForAddress(defaultAddr.id);
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Failed to load your saved delivery addresses.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick countdown derived from server-synced expiresAt
  useEffect(() => {
    if (!summary || summary.isExpired || summary.status !== 'RESERVATION_ACTIVE') {
      return;
    }

    const interval = setInterval(() => {
      const expiresMs = new Date(summary.expiresAt).getTime();
      const serverNow = Date.now() + serverClockOffsetRef.current;
      const secs = Math.max(0, Math.floor((expiresMs - serverNow) / 1000));
      setRemainingSeconds(secs);
      if (secs <= 0) {
        setSummary((prev) => (prev ? { ...prev, isExpired: true, status: 'EXPIRED' } : prev));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [summary]);

  // Reconcile with backend when tab regains visibility
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || !summary?.checkoutSessionId) return;
      try {
        const fresh = await CheckoutService.getSummary(summary.checkoutSessionId);
        setSummary(fresh);
        syncCountdownFromSummary(fresh);
      } catch {
        // Ignore transient network errors on focus
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [summary?.checkoutSessionId, syncCountdownFromSummary]);

  const handleCancelCheckout = async () => {
    setIsCancelling(true);
    try {
      await CheckoutService.cancelCheckout(summary?.checkoutSessionId);
      notify('Checkout cancelled and reserved items released.', 'info');
      await refreshBasket();
      router.push('/basket');
    } catch {
      notify('Could not cancel checkout. Returning to basket.', 'error');
      router.push('/basket');
    } finally {
      setIsCancelling(false);
    }
  };

  const isExpired = useMemo(
    () =>
      Boolean(
        summary && (summary.isExpired || remainingSeconds <= 0 || summary.status === 'EXPIRED'),
      ),
    [summary, remainingSeconds],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-stone-100" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 animate-pulse rounded-2xl bg-stone-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-stone-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/basket"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink hover:bg-surface"
            aria-label="Back to basket"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Checkout Summary</h1>
            <p className="text-xs text-muted">
              Server-validated pricing &amp; 15-minute atomic inventory reservation
            </p>
          </div>
        </div>

        {summary && summary.status === 'RESERVATION_ACTIVE' && !isExpired && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
            <Timer className="h-4 w-4 text-brand animate-pulse" />
            <span>Items reserved for {formatCountdown(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Price Change Confirmation Banner */}
      {priceChanges && priceChanges.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Store prices updated since you added items
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Please review the updated prices below before reserving your basket.
              </p>
            </div>
          </div>
          <div className="divide-y divide-amber-200 rounded-xl border border-amber-200 bg-white">
            {priceChanges.map((pc) => (
              <div
                key={pc.sellerProductId}
                className="flex items-center justify-between px-4 py-2.5 text-xs"
              >
                <span className="font-semibold text-ink">{pc.productName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted line-through">{formatINR(pc.oldUnitPrice)}</span>
                  <span className="font-bold text-brand">{formatINR(pc.newUnitPrice)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={async () => {
                await refreshBasket();
                await prepareForAddress(selectedAddressId, true);
              }}
              isLoading={isPreparing}
              className="bg-brand hover:bg-forest text-white text-xs font-bold"
            >
              Accept Updated Prices &amp; Reserve
            </Button>
            <Link
              href="/basket"
              className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
            >
              Return to Basket
            </Link>
          </div>
        </div>
      )}

      {/* Expired Reservation Banner */}
      {isExpired && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-red-900">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Your 15-minute inventory reservation has expired</p>
              <p className="text-xs mt-0.5">
                Reserved stock has been released back to the store. Reserve your items again to
                continue.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => prepareForAddress(selectedAddressId, true)}
            isLoading={isPreparing}
            className="bg-brand hover:bg-forest text-white text-xs font-bold shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reserve Items Again
          </Button>
        </div>
      )}

      {/* Generic Error Banner */}
      {errorMsg && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-3 text-sm text-red-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cannot prepare checkout</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <Link
            href="/basket"
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 shrink-0"
          >
            Edit Basket
          </Link>
        </div>
      )}

      {/* No Saved Addresses */}
      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
          <MapPin className="mx-auto h-10 w-10 text-stone-300" />
          <h2 className="text-base font-bold text-ink">No delivery address saved</h2>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Add a delivery address with map pin coordinates so we can validate store serviceability
            and calculate your delivery fee.
          </p>
          <Link
            href="/addresses"
            className="inline-flex items-center rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-forest"
          >
            Add Delivery Address
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT COLUMN: Address, Store, Items */}
          <div className="lg:col-span-2 space-y-5">
            {/* 1. Delivery Address Selector */}
            <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand" />
                  Delivery Address
                </h2>
                <Link href="/addresses" className="text-xs font-bold text-brand hover:underline">
                  Manage Addresses
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const selected = addr.id === selectedAddressId;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      disabled={isPreparing}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        prepareForAddress(addr.id, true);
                      }}
                      className={`text-left rounded-xl border p-3.5 transition-all ${
                        selected
                          ? 'border-brand bg-brand-tint/40 ring-1 ring-brand'
                          : 'border-border bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-2 mt-1 line-clamp-2">
                        {addr.addressLine1}, {addr.city} - {addr.postalCode}
                      </p>
                      <p className="text-[11px] text-muted mt-1">{addr.phone}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Store & Delivery Info */}
            {summary && (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-brand-tint/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{summary.store.name}</p>
                      <p className="text-xs text-brand font-semibold flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {summary.store.deliveryEtaLabel || '15–30 mins'}
                          {summary.distanceKm !== null ? ` • ${summary.distanceKm} km away` : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                    <span>{isExpired ? 'Reservation Expired' : 'Stock Reserved'}</span>
                  </div>
                </div>

                {/* 3. Reserved Basket Items Snapshot */}
                <div className="rounded-2xl border border-border bg-white divide-y divide-border">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-ink">
                      Reserved Items ({summary.items.length})
                    </h2>
                    <span className="text-[11px] text-muted">Prices locked for 15 mins</span>
                  </div>
                  {summary.items.map((item) => {
                    const thumb = getOptimizedProductImage(item.imageUrl, 'thumb');
                    return (
                      <div
                        key={item.sellerProductId}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-xl border border-border bg-surface-tile flex items-center justify-center p-1 shrink-0 overflow-hidden">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={item.productName}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <ShoppingBag className="h-5 w-5 text-stone-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink line-clamp-1">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted">
                              {item.packSize ? `${item.packSize} • ` : ''}Qty: {item.quantity} ×{' '}
                              {formatINR(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-ink">{formatINR(item.lineTotal)}</p>
                          {item.mrp > item.unitPrice && (
                            <p className="text-[11px] text-muted line-through">
                              {formatINR(item.mrp * item.quantity)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Price Breakdown & Actions */}
          <div className="space-y-4">
            {summary && (
              <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4 sticky top-24">
                <h2 className="text-base font-bold text-ink">Bill Details</h2>

                {summary.couponCode && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      {summary.couponCode}
                    </span>
                    <span>-{formatINR(summary.priceBreakdown.couponDiscount)}</span>
                  </div>
                )}

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-ink-secondary">
                    <span>Item Subtotal</span>
                    <span>{formatINR(summary.priceBreakdown.itemSubtotal)}</span>
                  </div>
                  {summary.priceBreakdown.productDiscount > 0 && (
                    <div className="flex justify-between text-brand font-semibold">
                      <span>Product Discounts</span>
                      <span>-{formatINR(summary.priceBreakdown.productDiscount)}</span>
                    </div>
                  )}
                  {summary.priceBreakdown.couponDiscount > 0 && (
                    <div className="flex justify-between text-brand font-semibold">
                      <span>Coupon Discount</span>
                      <span>-{formatINR(summary.priceBreakdown.couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-ink-secondary">
                    <span>Delivery Fee</span>
                    <span>
                      {summary.priceBreakdown.deliveryFee === 0 ? (
                        <span className="font-bold text-brand">FREE</span>
                      ) : (
                        formatINR(summary.priceBreakdown.deliveryFee)
                      )}
                    </span>
                  </div>
                  {summary.priceBreakdown.taxAmount > 0 && (
                    <div className="flex justify-between text-ink-secondary">
                      <span>Applicable Taxes</span>
                      <span>{formatINR(summary.priceBreakdown.taxAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2.5 flex justify-between text-base font-black text-ink">
                    <span>Grand Total</span>
                    <span>{formatINR(summary.priceBreakdown.grandTotal)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-brand/20 bg-brand-tint/60 p-3 text-xs text-ink space-y-1">
                  <p className="font-bold text-brand flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Checkout Ready for Order &amp; Payment
                  </p>
                  <p className="text-ink-secondary">
                    Your inventory is atomically reserved. Order placement and Razorpay / COD
                    payment integration connect here in Phases 12 &amp; 13.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCheckout}
                  isLoading={isCancelling}
                  disabled={isPreparing}
                  className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                >
                  Cancel Checkout &amp; Release Reservation
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <StorefrontLayout>
      <AuthGuard>
        <CheckoutContent />
      </AuthGuard>
    </StorefrontLayout>
  );
}
