'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Minus, Plus, ShoppingBag, Zap } from 'lucide-react';
import { FoodPreference, ProductCardItem, ProductVariantItem } from '@marvels-basket/shared';
import { useLocation } from '@/features/location/context/location-context';
import { useBasket } from '@/features/basket/context/basket-context';
import { calculateDiscountPercent, calculateSavings, formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';
import { cn } from '@/lib/utils';

export interface ProductCardProps {
  product: ProductCardItem;
  className?: string;
  onAddToCart?: (variant: ProductVariantItem, quantity: number) => void;
  deliveryTimeText?: string;
}

export function ProductCard({
  product,
  className,
  onAddToCart,
  deliveryTimeText,
}: ProductCardProps) {
  const { openLocationModal, hasLocationContext, activeStore } = useLocation();
  const { addItem, updateQuantity, getItemQuantity } = useBasket();

  const variants = useMemo(
    () => (product.variants && product.variants.length > 0 ? product.variants : []),
    [product.variants],
  );

  // Pick first available variant as default
  const initialVariantId = useMemo(() => {
    if (product.defaultVariant?.id) return product.defaultVariant.id;
    const firstAvail = variants.find(
      (v) => v.isAvailable !== false && (v.availableQuantity ?? 0) > 0,
    );
    return firstAvail?.id || variants[0]?.id || '';
  }, [product.defaultVariant?.id, variants]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(initialVariantId);
  const [imageError, setImageError] = useState(false);

  const activeVariant: ProductVariantItem | undefined =
    variants.find((v) => v.id === selectedVariantId) || product.defaultVariant || variants[0];

  const mrp = activeVariant?.mrp ?? product.mrp;
  const sellingPrice = activeVariant?.sellingPrice ?? product.sellingPrice;
  const discountPercent =
    activeVariant?.discountPercent ?? calculateDiscountPercent(mrp, sellingPrice);
  const savingsAmount = calculateSavings(mrp, sellingPrice);

  const resolvedStore =
    product.store ??
    (activeStore
      ? {
          id: activeStore.id,
          name: activeStore.name,
          slug: activeStore.slug,
          deliveryEtaLabel: activeStore.deliveryEtaLabel,
          deliveryTimeMinutes: activeStore.deliveryTimeMinutes,
          isOpen: activeStore.isOpen,
          isAcceptingOrders: activeStore.isAcceptingOrders,
          minimumOrderValue: activeStore.minimumOrderValue,
        }
      : null);

  const hasStoreOffer = Boolean(resolvedStore && activeVariant?.sellerProductId);
  const availableStock = activeVariant?.availableQuantity ?? 0;
  const lowStockThreshold = activeVariant?.lowStockThreshold ?? product.lowStockThreshold ?? 5;
  const isAvailable = hasStoreOffer && activeVariant?.isAvailable !== false && availableStock > 0;
  const isLowStock =
    isAvailable && (activeVariant?.isLowStock || availableStock <= lowStockThreshold);

  const quantity = activeVariant
    ? getItemQuantity(activeVariant.sellerProductId, activeVariant.id)
    : 0;

  const rawImg = activeVariant?.primaryImageUrl || product.primaryImageUrl;
  const imageUrl = !imageError ? getOptimizedProductImage(rawImg, 'card') : null;

  const etaBadgeText = deliveryTimeText || resolvedStore?.deliveryEtaLabel || null;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!resolvedStore || !activeVariant?.sellerProductId) {
      openLocationModal();
      return;
    }
    if (!isAvailable || quantity >= availableStock) return;

    if (onAddToCart) {
      onAddToCart(activeVariant, quantity + 1);
      return;
    }

    if (quantity === 0) {
      await addItem({
        sellerProductId: activeVariant.sellerProductId,
        productId: product.id,
        variantId: activeVariant.id,
        productName: product.name,
        productSlug: product.slug,
        brand: product.brand,
        packSize: activeVariant.packSize || activeVariant.name,
        imageUrl: rawImg,
        unitPrice: sellingPrice,
        mrp,
        availableQuantity: availableStock,
        store: {
          id: resolvedStore.id,
          name: resolvedStore.name,
          slug: resolvedStore.slug || '',
          deliveryEtaLabel: resolvedStore.deliveryEtaLabel ?? null,
          deliveryTimeMinutes: resolvedStore.deliveryTimeMinutes ?? null,
          isOpen: resolvedStore.isOpen ?? true,
          isAcceptingOrders: resolvedStore.isAcceptingOrders ?? true,
          minimumOrderValue: resolvedStore.minimumOrderValue ?? null,
        },
        quantity: 1,
      });
    } else {
      await updateQuantity(activeVariant.sellerProductId, quantity + 1, {
        availableQuantity: availableStock,
      });
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeVariant || quantity <= 0) return;

    if (onAddToCart) {
      onAddToCart(activeVariant, quantity - 1);
      return;
    }
    if (activeVariant.sellerProductId) {
      await updateQuantity(activeVariant.sellerProductId, quantity - 1, {
        availableQuantity: availableStock,
      });
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md sm:p-3.5',
        !isAvailable && hasStoreOffer && 'opacity-85',
        className,
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
      >
        {/* Top Badges & Image Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-stone-50 p-2 flex items-center justify-center">
          {/* Discount Tag (Top-Left) */}
          {discountPercent > 0 && (
            <div className="absolute left-2 top-2 z-10 flex items-center rounded-md bg-emerald-700 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              {discountPercent}% OFF
            </div>
          )}

          {/* Food Preference Indicator (Top-Right) */}
          {product.foodPreference &&
            product.foodPreference !== 'NA' &&
            product.foodPreference !== FoodPreference.NA && (
              <div className="absolute right-2 top-2 z-10">
                {product.foodPreference === 'VEG' ||
                product.foodPreference === FoodPreference.VEG ? (
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-xs border border-emerald-600 bg-white"
                    title="Vegetarian"
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-600" />
                  </div>
                ) : product.foodPreference === 'NON_VEG' ||
                  product.foodPreference === FoodPreference.NON_VEG ? (
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-xs border border-red-600 bg-white"
                    title="Non-Vegetarian"
                  >
                    <div className="h-0 w-0 border-x-3 border-x-transparent border-b-6 border-b-red-600" />
                  </div>
                ) : null}
              </div>
            )}

          {/* Product Image */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <ShoppingBag className="h-12 w-12" />
            </div>
          )}

          {/* Hyperlocal ETA Pill (only shown when a serviceable store ETA exists) */}
          {etaBadgeText && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-xs backdrop-blur-xs">
              <Zap className="h-3 w-3 fill-amber-400 text-amber-500" />
              <span>{etaBadgeText}</span>
            </div>
          )}
        </div>

        {/* Product Meta */}
        <div className="mt-2.5 flex flex-col flex-grow">
          {product.brand && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {product.brand}
            </span>
          )}

          <h3
            className="mt-0.5 line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>
      </Link>

      {/* Variant Selector / Pack Size */}
      <div className="mt-2 space-y-1">
        {variants.length > 1 ? (
          <select
            value={selectedVariantId}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedVariantId(e.target.value);
              setImageError(false);
            }}
            aria-label="Select pack size"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.packSize || v.name} — {formatINR(v.sellingPrice ?? v.mrp)}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs font-medium text-stone-500">
            {activeVariant?.packSize || activeVariant?.name || 'Standard Pack'}
          </div>
        )}

        {isLowStock && (
          <p className="text-[11px] font-semibold text-amber-700">Only {availableStock} left!</p>
        )}
      </div>

      {/* Price & Add to Basket Controls */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-stone-950">
              {formatINR(sellingPrice)}
            </span>
            {mrp > sellingPrice && (
              <span className="text-xs text-stone-400 line-through">{formatINR(mrp)}</span>
            )}
          </div>
          {savingsAmount > 0 ? (
            <span className="text-[10px] font-semibold text-emerald-600">
              Save {formatINR(savingsAmount)}
            </span>
          ) : !hasStoreOffer && !hasLocationContext ? (
            <span className="text-[10px] font-medium text-stone-400">Catalog MRP</span>
          ) : null}
        </div>

        {/* CTA Button */}
        <div>
          {!resolvedStore ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openLocationModal();
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-brand-tint px-2.5 py-1.5 text-[11px] font-bold text-brand hover:bg-brand hover:text-white transition-colors"
            >
              <MapPin className="h-3 w-3" />
              <span>{hasLocationContext ? 'Unavailable' : 'Set Area'}</span>
            </button>
          ) : !isAvailable ? (
            <span className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-500">
              Sold Out
            </span>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1 rounded-lg border-2 border-emerald-600 bg-emerald-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 shadow-2xs transition-all hover:bg-emerald-600 hover:text-white active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>ADD</span>
            </button>
          ) : (
            <div className="flex items-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
                className="flex h-7 w-7 items-center justify-center rounded-l-lg hover:bg-emerald-700 transition-colors active:scale-95"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-extrabold">{quantity}</span>
              <button
                type="button"
                onClick={handleAdd}
                disabled={quantity >= availableStock}
                aria-label="Increase quantity"
                className="flex h-7 w-7 items-center justify-center rounded-r-lg hover:bg-emerald-700 transition-colors active:scale-95 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
