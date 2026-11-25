'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  BasketItem,
  BasketStateResponse,
  BasketStoreInfo,
  DeliveryLocation,
  PublicStoreItem,
  StoreSwitchComparison,
} from '@marvels-basket/shared';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from '@/features/auth/context/auth-context';
import { useLocation } from '@/features/location/context/location-context';
import { LocationSwitchModal } from '@/features/location/components/location-switch-modal';
import { calculateDiscountPercent, multiplyCurrency, roundCurrency } from '@/lib/utils/currency';
import { BasketService } from '../services/basket.service';
import { StoreSwitchDialog } from '../components/store-switch-dialog';

const GUEST_BASKET_STORAGE_KEY = 'mb_guest_basket_v1';

const EMPTY_BASKET: BasketStateResponse = {
  cartId: null,
  sellerId: null,
  store: null,
  items: [],
  itemCount: 0,
  totalUnits: 0,
  subtotal: 0,
  totalMrp: 0,
  totalSavings: 0,
  hasUnavailableItems: false,
};

export interface AddToBasketInput {
  sellerProductId: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  brand?: string | null;
  packSize?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  mrp: number;
  availableQuantity: number;
  store: BasketStoreInfo;
  quantity?: number;
}

interface PendingStoreSwitchState {
  input: AddToBasketInput;
  currentStore: BasketStoreInfo | null;
}

interface PendingLocationSwitchState {
  targetLocation: DeliveryLocation;
  preferredStoreId?: string | null;
  comparison: StoreSwitchComparison;
}

interface BasketToast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface BasketContextValue {
  basket: BasketStateResponse;
  isLoading: boolean;
  isUpdating: boolean;
  addItem: (input: AddToBasketInput) => Promise<boolean>;
  updateQuantity: (
    sellerProductId: string,
    nextQuantity: number,
    options?: { itemId?: string; availableQuantity?: number },
  ) => Promise<boolean>;
  removeItem: (sellerProductIdOrItemId: string) => Promise<void>;
  clearBasket: () => Promise<void>;
  refreshBasket: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  getItemQuantity: (sellerProductId?: string | null, variantId?: string | null) => number;
  requestLocationSwitch: (
    nextLocation: DeliveryLocation,
    preferredStoreId?: string | null,
  ) => Promise<boolean>;
  requestStoreSwitch: (store: PublicStoreItem) => Promise<boolean>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const BasketContext = createContext<BasketContextValue | undefined>(undefined);

function recomputeBasketTotals(
  store: BasketStoreInfo | null,
  items: BasketItem[],
  cartId: string | null = null,
): BasketStateResponse {
  if (!items || items.length === 0) {
    return { ...EMPTY_BASKET, cartId };
  }

  let totalUnits = 0;
  let subtotal = 0;
  let totalMrp = 0;
  let hasUnavailableItems = false;

  for (const item of items) {
    totalUnits += item.quantity;
    subtotal = roundCurrency(subtotal + multiplyCurrency(item.unitPrice, item.quantity));
    const effectiveMrp = item.mrp > item.unitPrice ? item.mrp : item.unitPrice;
    totalMrp = roundCurrency(totalMrp + multiplyCurrency(effectiveMrp, item.quantity));
    if (!item.isAvailable || item.availableQuantity < item.quantity) {
      hasUnavailableItems = true;
    }
  }

  return {
    cartId,
    sellerId: store?.id || null,
    store,
    items,
    itemCount: items.length,
    totalUnits,
    subtotal,
    totalMrp,
    totalSavings: Math.max(0, roundCurrency(totalMrp - subtotal)),
    hasUnavailableItems,
  };
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { location, applyLocationDirect, selectPreferredStore } = useLocation();

  const [basket, setBasket] = useState<BasketStateResponse>(EMPTY_BASKET);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toasts, setToasts] = useState<BasketToast[]>([]);
  const toastIdRef = useRef(0);

  const [pendingStoreSwitch, setPendingStoreSwitch] = useState<PendingStoreSwitchState | null>(
    null,
  );
  const [pendingLocationSwitch, setPendingLocationSwitch] =
    useState<PendingLocationSwitchState | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const persistGuestBasket = useCallback((next: BasketStateResponse) => {
    if (typeof window === 'undefined') return;
    if (!next.items.length) {
      localStorage.removeItem(GUEST_BASKET_STORAGE_KEY);
      return;
    }
    localStorage.setItem(GUEST_BASKET_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const readGuestBasket = useCallback((): BasketStateResponse => {
    if (typeof window === 'undefined') return EMPTY_BASKET;
    try {
      const raw = localStorage.getItem(GUEST_BASKET_STORAGE_KEY);
      if (!raw) return EMPTY_BASKET;
      const parsed = JSON.parse(raw) as BasketStateResponse;
      if (!parsed || !Array.isArray(parsed.items)) return EMPTY_BASKET;
      return recomputeBasketTotals(parsed.store || null, parsed.items, null);
    } catch {
      return EMPTY_BASKET;
    }
  }, []);

  const refreshBasket = useCallback(async () => {
    if (!isAuthenticated) {
      setBasket(readGuestBasket());
      return;
    }
    try {
      setIsLoading(true);
      const serverCart = await BasketService.getCart();
      setBasket(serverCart);
    } catch {
      // Keep current state on transient failure
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, readGuestBasket]);

  // Hydrate basket on mount and merge guest items once logged in
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    async function initBasket() {
      if (!isAuthenticated) {
        setBasket(readGuestBasket());
        return;
      }

      setIsLoading(true);
      try {
        const guest = readGuestBasket();
        if (guest.items.length > 0) {
          try {
            const synced = await BasketService.syncCart(
              guest.items.map((item) => ({
                sellerProductId: item.sellerProductId,
                quantity: item.quantity,
              })),
            );
            localStorage.removeItem(GUEST_BASKET_STORAGE_KEY);
            if (!cancelled) setBasket(synced);
            return;
          } catch {
            // Fall through to fetch server cart if sync conflicts
          }
        }
        const serverCart = await BasketService.getCart();
        if (!cancelled) setBasket(serverCart);
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    initBasket();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, readGuestBasket]);

  const executeAddItem = useCallback(
    async (input: AddToBasketInput, confirmStoreSwitch = false): Promise<boolean> => {
      const qtyToAdd = Math.max(1, input.quantity ?? 1);
      if (input.availableQuantity <= 0) {
        notify(`"${input.productName}" is out of stock.`, 'error');
        return false;
      }

      const previous = basket;

      if (!isAuthenticated) {
        const existingIndex = basket.items.findIndex(
          (i) => i.sellerProductId === input.sellerProductId,
        );
        const baseItems =
          confirmStoreSwitch || !basket.sellerId || basket.sellerId === input.store.id
            ? basket.sellerId && basket.sellerId !== input.store.id
              ? []
              : [...basket.items]
            : [...basket.items];

        if (existingIndex >= 0 && (!basket.sellerId || basket.sellerId === input.store.id)) {
          const current = baseItems[existingIndex];
          const nextQty = current.quantity + qtyToAdd;
          if (nextQty > input.availableQuantity) {
            notify(
              `Only ${input.availableQuantity} unit${input.availableQuantity > 1 ? 's' : ''} available at this store.`,
              'error',
            );
            return false;
          }
          baseItems[existingIndex] = { ...current, quantity: nextQty };
        } else {
          if (qtyToAdd > input.availableQuantity) {
            notify(`Only ${input.availableQuantity} units available.`, 'error');
            return false;
          }
          baseItems.push({
            id: `guest-${input.sellerProductId}`,
            sellerProductId: input.sellerProductId,
            productId: input.productId,
            variantId: input.variantId,
            productName: input.productName,
            productSlug: input.productSlug,
            brand: input.brand ?? null,
            packSize: input.packSize ?? null,
            imageUrl: input.imageUrl ?? null,
            quantity: qtyToAdd,
            unitPrice: input.unitPrice,
            mrp: input.mrp,
            discountPercent: calculateDiscountPercent(input.mrp, input.unitPrice),
            availableQuantity: input.availableQuantity,
            isAvailable: true,
          });
        }

        const nextBasket = recomputeBasketTotals(input.store, baseItems, null);
        setBasket(nextBasket);
        persistGuestBasket(nextBasket);
        notify(`Added ${input.productName} to Basket`, 'success');
        return true;
      }

      // Authenticated optimistic update + server sync
      try {
        setIsUpdating(true);
        const optimisticItems = confirmStoreSwitch ? [] : [...basket.items];
        const idx = optimisticItems.findIndex((i) => i.sellerProductId === input.sellerProductId);
        if (idx >= 0) {
          const nextQty = optimisticItems[idx].quantity + qtyToAdd;
          if (nextQty > input.availableQuantity) {
            notify(`Only ${input.availableQuantity} units available.`, 'error');
            setIsUpdating(false);
            return false;
          }
          optimisticItems[idx] = { ...optimisticItems[idx], quantity: nextQty };
        } else {
          optimisticItems.push({
            sellerProductId: input.sellerProductId,
            productId: input.productId,
            variantId: input.variantId,
            productName: input.productName,
            productSlug: input.productSlug,
            brand: input.brand ?? null,
            packSize: input.packSize ?? null,
            imageUrl: input.imageUrl ?? null,
            quantity: qtyToAdd,
            unitPrice: input.unitPrice,
            mrp: input.mrp,
            discountPercent: calculateDiscountPercent(input.mrp, input.unitPrice),
            availableQuantity: input.availableQuantity,
            isAvailable: true,
          });
        }
        setBasket(recomputeBasketTotals(input.store, optimisticItems, basket.cartId));

        const updated = await BasketService.addItem({
          sellerProductId: input.sellerProductId,
          quantity: qtyToAdd,
          confirmStoreSwitch,
        });
        setBasket(updated);
        notify(`Added ${input.productName} to Basket`, 'success');
        return true;
      } catch (err) {
        setBasket(previous);
        if (err instanceof ApiError && err.code === 'STORE_SWITCH_REQUIRED') {
          setPendingStoreSwitch({
            input,
            currentStore: previous.store,
          });
          return false;
        }
        notify(err instanceof Error ? err.message : 'Unable to add item to basket.', 'error');
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [basket, isAuthenticated, notify, persistGuestBasket],
  );

  const addItem = useCallback(
    async (input: AddToBasketInput): Promise<boolean> => {
      if (basket.items.length > 0 && basket.sellerId && basket.sellerId !== input.store.id) {
        setPendingStoreSwitch({
          input,
          currentStore: basket.store,
        });
        return false;
      }
      return executeAddItem(input, false);
    },
    [basket.items.length, basket.sellerId, basket.store, executeAddItem],
  );

  const updateQuantity = useCallback(
    async (
      sellerProductId: string,
      nextQuantity: number,
      options?: { itemId?: string; availableQuantity?: number },
    ): Promise<boolean> => {
      const target = basket.items.find(
        (i) => i.sellerProductId === sellerProductId || i.id === options?.itemId,
      );
      if (!target) return false;

      const maxStock = options?.availableQuantity ?? target.availableQuantity;
      if (nextQuantity > maxStock && nextQuantity > target.quantity) {
        notify(
          `Only ${maxStock} unit${maxStock === 1 ? '' : 's'} left in stock at this store.`,
          'error',
        );
        return false;
      }

      const previous = basket;
      const nextItems =
        nextQuantity <= 0
          ? basket.items.filter((i) => i.sellerProductId !== target.sellerProductId)
          : basket.items.map((i) =>
              i.sellerProductId === target.sellerProductId ? { ...i, quantity: nextQuantity } : i,
            );

      const nextBasket = recomputeBasketTotals(
        nextItems.length > 0 ? basket.store : null,
        nextItems,
        basket.cartId,
      );
      setBasket(nextBasket);

      if (!isAuthenticated) {
        persistGuestBasket(nextBasket);
        if (nextQuantity <= 0) {
          notify(`Removed ${target.productName} from Basket`, 'info');
        }
        return true;
      }

      try {
        setIsUpdating(true);
        if (!target.id) {
          const fresh = await BasketService.getCart();
          setBasket(fresh);
          return true;
        }
        const serverCart =
          nextQuantity <= 0
            ? await BasketService.removeItem(target.id)
            : await BasketService.updateItem(target.id, nextQuantity);
        setBasket(serverCart);
        return true;
      } catch (err) {
        setBasket(previous);
        notify(err instanceof Error ? err.message : 'Unable to update item quantity.', 'error');
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [basket, isAuthenticated, notify, persistGuestBasket],
  );

  const removeItem = useCallback(
    async (sellerProductIdOrItemId: string) => {
      const item = basket.items.find(
        (i) => i.sellerProductId === sellerProductIdOrItemId || i.id === sellerProductIdOrItemId,
      );
      if (!item) return;
      await updateQuantity(item.sellerProductId, 0, { itemId: item.id });
    },
    [basket.items, updateQuantity],
  );

  const clearBasket = useCallback(async () => {
    const previous = basket;
    setBasket(EMPTY_BASKET);
    if (!isAuthenticated) {
      persistGuestBasket(EMPTY_BASKET);
      return;
    }
    try {
      setIsUpdating(true);
      const cleared = await BasketService.clearCart();
      setBasket(cleared);
    } catch {
      setBasket(previous);
    } finally {
      setIsUpdating(false);
    }
  }, [basket, isAuthenticated, persistGuestBasket]);

  const removeCoupon = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsUpdating(true);
    try {
      const updated = await BasketService.removeCoupon();
      setBasket(updated);
      notify('Coupon removed.', 'info');
    } catch {
      notify('Failed to remove coupon.', 'error');
    } finally {
      setIsUpdating(false);
    }
  }, [isAuthenticated, notify]);

  const applyCoupon = useCallback(
    async (code: string): Promise<boolean> => {
      if (!isAuthenticated) {
        notify('Please sign in to apply a coupon.', 'info');
        return false;
      }
      setIsUpdating(true);
      try {
        const updated = await BasketService.applyCoupon(code);
        setBasket(updated);
        notify(`Coupon ${updated.appliedCouponCode || code.toUpperCase()} applied!`, 'success');
        return true;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Unable to apply coupon.';
        notify(msg, 'error');
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, notify],
  );

  const getItemQuantity = useCallback(
    (sellerProductId?: string | null, variantId?: string | null): number => {
      if (sellerProductId) {
        const match = basket.items.find((i) => i.sellerProductId === sellerProductId);
        if (match) return match.quantity;
      }
      if (variantId) {
        const match = basket.items.find((i) => i.variantId === variantId);
        if (match) return match.quantity;
      }
      return 0;
    },
    [basket.items],
  );

  /**
   * Guards location switches when the customer has items in their basket:
   * checks `compare-store` before applying if the resolved store changes or disappears.
   */
  const requestLocationSwitch = useCallback(
    async (nextLocation: DeliveryLocation, preferredStoreId?: string | null): Promise<boolean> => {
      if (basket.items.length === 0 || !basket.sellerId) {
        await applyLocationDirect(nextLocation, preferredStoreId);
        return true;
      }

      try {
        setIsUpdating(true);
        const comparison = await BasketService.compareStoreSwitch({
          currentStoreId: basket.sellerId,
          targetStoreId: preferredStoreId || undefined,
          postalCode: nextLocation.postalCode ?? undefined,
          latitude: nextLocation.latitude ?? undefined,
          longitude: nextLocation.longitude ?? undefined,
          items: basket.items.map((item) => ({
            sellerProductId: item.sellerProductId,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            packSize: item.packSize || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });

        // Same serviceable store -> apply location seamlessly without clearing basket
        if (comparison.isServiceable && comparison.newStore?.id === basket.sellerId) {
          await applyLocationDirect(nextLocation, comparison.newStore.id);
          return true;
        }

        setPendingLocationSwitch({
          targetLocation: nextLocation,
          preferredStoreId: comparison.newStore?.id ?? preferredStoreId,
          comparison,
        });
        return false;
      } catch {
        // Fallback to direct location update if compare-store check fails transiently
        await applyLocationDirect(nextLocation, preferredStoreId);
        return true;
      } finally {
        setIsUpdating(false);
      }
    },
    [applyLocationDirect, basket.items, basket.sellerId],
  );

  const requestStoreSwitch = useCallback(
    async (targetStore: PublicStoreItem): Promise<boolean> => {
      const targetLoc: DeliveryLocation = location ?? {
        label: targetStore.city,
        displayLocation: targetStore.name,
        city: targetStore.city,
        state: targetStore.state,
        postalCode: targetStore.postalCode,
        latitude: targetStore.latitude ?? null,
        longitude: targetStore.longitude ?? null,
        source: 'QUICK_CITY',
      };

      if (basket.items.length === 0 || !basket.sellerId || basket.sellerId === targetStore.id) {
        if (location) {
          selectPreferredStore(targetStore);
        } else {
          await applyLocationDirect(targetLoc, targetStore.id);
        }
        return true;
      }

      return requestLocationSwitch(targetLoc, targetStore.id);
    },
    [
      applyLocationDirect,
      basket.items.length,
      basket.sellerId,
      location,
      requestLocationSwitch,
      selectPreferredStore,
    ],
  );

  const value: BasketContextValue = {
    basket,
    isLoading,
    isUpdating,
    addItem,
    updateQuantity,
    removeItem,
    clearBasket,
    refreshBasket,
    applyCoupon,
    removeCoupon,
    getItemQuantity,
    requestLocationSwitch,
    requestStoreSwitch,
    notify,
  };

  return (
    <BasketContext.Provider value={value}>
      {children}

      {/* Single-store conflict confirmation dialog */}
      <StoreSwitchDialog
        isOpen={Boolean(pendingStoreSwitch)}
        onClose={() => setPendingStoreSwitch(null)}
        currentStore={pendingStoreSwitch?.currentStore || basket.store}
        currentItemCount={basket.totalUnits}
        targetStoreName={pendingStoreSwitch?.input.store.name || 'New Store'}
        itemName={pendingStoreSwitch?.input.productName || 'this item'}
        isSubmitting={isUpdating}
        onConfirmSwitch={async () => {
          if (!pendingStoreSwitch) return;
          const req = pendingStoreSwitch;
          setPendingStoreSwitch(null);
          await executeAddItem(req.input, true);
        }}
      />

      {/* Location / store switch comparison confirmation dialog */}
      <LocationSwitchModal
        isOpen={Boolean(pendingLocationSwitch)}
        onClose={() => setPendingLocationSwitch(null)}
        comparison={pendingLocationSwitch?.comparison || null}
        targetLocationLabel={
          pendingLocationSwitch?.targetLocation.displayLocation || 'New Location'
        }
        isSubmitting={isUpdating}
        onClearAndSwitch={async () => {
          if (!pendingLocationSwitch) return;
          const pending = pendingLocationSwitch;
          await clearBasket();
          await applyLocationDirect(pending.targetLocation, pending.preferredStoreId);
          setPendingLocationSwitch(null);
          notify('Location updated and basket cleared.', 'info');
        }}
        onSwitchKeepingCompatible={async () => {
          if (!pendingLocationSwitch) return;
          const pending = pendingLocationSwitch;
          const newStore = pending.comparison.newStore;
          if (!newStore) return;

          setIsUpdating(true);
          try {
            if (isAuthenticated) {
              const switched = await BasketService.applyStoreSwitch(newStore.id);
              setBasket(switched);
            } else {
              const keptItems: BasketItem[] = pending.comparison.compatibleItems.map((c) => ({
                ...c.item,
                id: `guest-${c.newSellerProductId}`,
                sellerProductId: c.newSellerProductId,
                unitPrice: c.newUnitPrice,
                mrp: c.newMrp,
                discountPercent: calculateDiscountPercent(c.newMrp, c.newUnitPrice),
                availableQuantity: c.newAvailableQuantity,
                quantity: c.quantityAdjusted,
                isAvailable: true,
              }));
              const storeInfo: BasketStoreInfo = {
                id: newStore.id,
                name: newStore.name,
                slug: newStore.slug,
                deliveryEtaLabel: newStore.deliveryEtaLabel,
                deliveryTimeMinutes: newStore.deliveryTimeMinutes,
                isOpen: newStore.isOpen,
                isAcceptingOrders: newStore.isAcceptingOrders,
                minimumOrderValue: newStore.minimumOrderValue,
              };
              const updated = recomputeBasketTotals(storeInfo, keptItems, null);
              setBasket(updated);
              persistGuestBasket(updated);
            }

            await applyLocationDirect(pending.targetLocation, newStore.id);
            setPendingLocationSwitch(null);
            notify(`Updated basket for ${newStore.name}`, 'success');
          } finally {
            setIsUpdating(false);
          }
        }}
      />

      {/* Accessible toast region */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-[60] flex flex-col gap-2 max-w-xs w-full pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg border transition-all ${
                toast.type === 'error'
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : toast.type === 'success'
                    ? 'bg-forest text-white border-brand'
                    : 'bg-ink text-white border-gray-700'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </BasketContext.Provider>
  );
}

export function useBasket(): BasketContextValue {
  const ctx = useContext(BasketContext);
  if (!ctx) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return ctx;
}
