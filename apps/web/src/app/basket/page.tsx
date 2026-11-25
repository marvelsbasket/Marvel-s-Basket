'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import { CartRevalidationResponse } from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { useAuth } from '@/features/auth/context/auth-context';
import { useBasket } from '@/features/basket/context/basket-context';
import { BasketService } from '@/features/basket/services/basket.service';
import { Button } from '@/components/ui/button';
import { formatINR, multiplyCurrency } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';

export default function BasketPage() {
  const { isAuthenticated } = useAuth();
  const { basket, isLoading, isUpdating, updateQuantity, removeItem, clearBasket, refreshBasket } =
    useBasket();

  const [revalidation, setRevalidation] = useState<CartRevalidationResponse | null>(null);
  const [showCheckoutPreviewNotice, setShowCheckoutPreviewNotice] = useState(false);

  // Live stock & price revalidation whenever basket items load
  useEffect(() => {
    if (!basket.sellerId || basket.items.length === 0) {
      setRevalidation(null);
      return;
    }

    let cancelled = false;
    async function checkLiveInventory() {
      try {
        const res = await BasketService.revalidateCart({
          storeId: basket.sellerId!,
          items: basket.items.map((item) => ({
            listingId: item.sellerProductId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });
        if (!cancelled) {
          setRevalidation(res);
        }
      } catch {
        // Ignore transient network failure
      }
    }

    checkLiveInventory();
    return () => {
      cancelled = true;
    };
  }, [basket.sellerId, basket.items]);

  const mov = basket.store?.minimumOrderValue ?? null;
  const belowMov = mov !== null && basket.subtotal < mov;
  const storeClosed =
    basket.store !== null &&
    (basket.store.isOpen === false || basket.store.isAcceptingOrders === false);
  const hasStockProblems =
    basket.hasUnavailableItems ||
    Boolean(
      revalidation &&
      (revalidation.hasQuantityAdjustments ||
        !revalidation.isOrderable ||
        revalidation.items.some((i) => !i.isAvailable)),
    );

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Your Basket</h1>
            {basket.items.length > 0 && (
              <p className="text-xs text-muted mt-0.5">
                {basket.totalUnits} item{basket.totalUnits === 1 ? '' : 's'} • Single-store
                hyperlocal basket
              </p>
            )}
          </div>
          {basket.items.length > 0 && (
            <button
              type="button"
              onClick={clearBasket}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Basket
            </button>
          )}
        </div>

        {isLoading && basket.items.length === 0 ? (
          <div className="h-64 animate-pulse rounded-3xl bg-stone-100" />
        ) : basket.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
            <ShoppingBag className="mx-auto h-14 w-14 text-stone-300" />
            <div className="max-w-sm mx-auto">
              <h2 className="text-lg font-bold text-ink">Your basket is empty</h2>
              <p className="text-sm text-muted mt-1">
                Explore fresh vegetables, dairy, and pantry staples delivered from neighborhood
                stores in minutes.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-forest"
              >
                Start Shopping
              </Link>
              <Link
                href="/categories"
                className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-ink hover:bg-surface"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* LEFT: Store Banner + Basket Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Single-Store Attribution Banner */}
              {basket.store && (
                <div className="rounded-2xl border border-emerald-200 bg-brand-tint/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stores/${basket.store.slug}`}
                          className="text-sm font-bold text-ink hover:text-brand"
                        >
                          {basket.store.name}
                        </Link>
                        {!basket.store.isAcceptingOrders && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Currently Closed
                          </span>
                        )}
                      </div>
                      {basket.store.deliveryEtaLabel && basket.store.isAcceptingOrders && (
                        <p className="text-xs text-brand font-semibold flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          Express delivery in {basket.store.deliveryEtaLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/stores/${basket.store.slug}`}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    + Add more items from store
                  </Link>
                </div>
              )}

              {/* Store Closed or Revalidation Alerts */}
              {storeClosed && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-sm text-amber-900">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Store is currently closed</p>
                    <p className="text-xs mt-0.5">
                      {basket.store?.name} is not accepting orders right now. You can wait until
                      store hours resume or switch to an open nearby store.
                    </p>
                  </div>
                </div>
              )}

              {(revalidation?.hasPriceChanges ||
                revalidation?.hasQuantityAdjustments ||
                (revalidation && !revalidation.isOrderable)) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Live store prices or inventory changed for one or more items in your basket.
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={refreshBasket}
                    className="shrink-0 bg-white"
                  >
                    Refresh
                  </Button>
                </div>
              )}

              {/* Item List */}
              <div className="divide-y divide-border rounded-2xl border border-border bg-white shadow-xs">
                {basket.items.map((item) => {
                  const revalItem = revalidation?.items?.find(
                    (r) => r.listingId === item.sellerProductId,
                  );
                  const livePrice = revalItem?.currentUnitPrice ?? item.unitPrice;
                  const liveStock = revalItem?.availableQuantity ?? item.availableQuantity;
                  const itemUnavailable =
                    !item.isAvailable ||
                    liveStock <= 0 ||
                    revalItem?.status === 'OUT_OF_STOCK' ||
                    revalItem?.status === 'UNAVAILABLE';
                  const overStock = liveStock > 0 && item.quantity > liveStock;
                  const lineTotal = multiplyCurrency(livePrice, item.quantity);
                  const thumb = getOptimizedProductImage(item.imageUrl, 'thumb');

                  return (
                    <div
                      key={item.sellerProductId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Link
                          href={item.productSlug ? `/products/${item.productSlug}` : '#'}
                          className="h-16 w-16 rounded-xl border border-border bg-surface-tile flex items-center justify-center p-1 shrink-0 overflow-hidden"
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={item.productName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ShoppingBag className="h-6 w-6 text-stone-300" />
                          )}
                        </Link>

                        <div className="min-w-0">
                          {item.brand && (
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                              {item.brand}
                            </p>
                          )}
                          <Link
                            href={item.productSlug ? `/products/${item.productSlug}` : '#'}
                            className="text-sm font-bold text-ink hover:text-brand line-clamp-1"
                          >
                            {item.productName}
                          </Link>
                          {item.packSize && <p className="text-xs text-muted">{item.packSize}</p>}
                          {itemUnavailable && (
                            <p className="mt-1 text-xs font-bold text-red-600">
                              Currently out of stock — please remove
                            </p>
                          )}
                          {overStock && !itemUnavailable && (
                            <p className="mt-1 text-xs font-bold text-amber-700">
                              Only {liveStock} available — adjust quantity
                            </p>
                          )}
                          {revalItem?.priceChanged && !itemUnavailable && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Price updated from {formatINR(item.unitPrice)} to{' '}
                              {formatINR(livePrice)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        {/* Stepper */}
                        <div className="flex items-center gap-2">
                          {!itemUnavailable && (
                            <div className="flex items-center rounded-xl border border-brand bg-brand text-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.sellerProductId, item.quantity - 1, {
                                    itemId: item.id,
                                    availableQuantity: liveStock,
                                  })
                                }
                                aria-label={`Decrease quantity of ${item.productName}`}
                                className="flex h-8 w-8 items-center justify-center rounded-l-xl hover:bg-forest"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="px-2.5 text-xs font-extrabold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.sellerProductId, item.quantity + 1, {
                                    itemId: item.id,
                                    availableQuantity: liveStock,
                                  })
                                }
                                disabled={item.quantity >= liveStock}
                                aria-label={`Increase quantity of ${item.productName}`}
                                className="flex h-8 w-8 items-center justify-center rounded-r-xl hover:bg-forest disabled:opacity-50"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => removeItem(item.id || item.sellerProductId)}
                            aria-label={`Remove ${item.productName}`}
                            className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Line Price */}
                        <div className="text-right min-w-[72px]">
                          <p className="text-sm font-black text-ink">{formatINR(lineTotal)}</p>
                          {item.mrp > livePrice && (
                            <p className="text-[11px] text-muted line-through">
                              {formatINR(multiplyCurrency(item.mrp, item.quantity))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Bill Summary */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4 sticky top-24">
                <h2 className="text-base font-bold text-ink">Basket Summary</h2>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-ink-secondary">
                    <span>Total MRP</span>
                    <span>{formatINR(basket.totalMrp)}</span>
                  </div>
                  {basket.totalSavings > 0 && (
                    <div className="flex justify-between text-brand font-semibold">
                      <span>Product Savings</span>
                      <span>-{formatINR(basket.totalSavings)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2.5 flex justify-between text-base font-black text-ink">
                    <span>Subtotal</span>
                    <span>{formatINR(basket.subtotal)}</span>
                  </div>
                </div>

                {basket.totalSavings > 0 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>You save {formatINR(basket.totalSavings)} on this basket!</span>
                  </div>
                )}

                {belowMov && mov !== null && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-900">
                    Add <strong>{formatINR(mov - basket.subtotal)}</strong> more to meet this
                    store&apos;s minimum order of {formatINR(mov)}.
                  </div>
                )}

                {!isAuthenticated ? (
                  <Link
                    href="/login?redirect=/basket"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-black text-white hover:bg-forest transition-colors"
                  >
                    <span>Login to Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Button
                    type="button"
                    disabled={storeClosed || hasStockProblems || belowMov}
                    onClick={() => setShowCheckoutPreviewNotice(true)}
                    className="w-full py-3.5 rounded-2xl bg-brand hover:bg-forest text-white font-black"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                )}

                {showCheckoutPreviewNotice && (
                  <div className="rounded-xl border border-brand/25 bg-brand-tint p-3 text-xs text-ink">
                    <p className="font-bold text-brand">Ready for Phase 11 Checkout</p>
                    <p className="mt-0.5 text-ink-secondary">
                      Your basket is synced with live store inventory. Order placement, delivery
                      fees, coupons, and payments will connect here in Phase 11.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
