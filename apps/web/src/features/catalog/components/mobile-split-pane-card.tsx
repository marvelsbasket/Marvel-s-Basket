'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin, Minus, Plus } from 'lucide-react';
import { ProductCardItem, ProductVariantItem } from '@marvels-basket/shared';
import { useLocation } from '@/features/location/context/location-context';
import { useBasket } from '@/features/basket/context/basket-context';
import { calculateDiscountPercent, calculateSavings, formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';
import { cn } from '@/lib/utils';

export interface MobileSplitPaneProductCardProps {
  product: ProductCardItem;
  onOpenVariantDrawer?: (product: ProductCardItem) => void;
}

export function MobileSplitPaneProductCard({
  product,
  onOpenVariantDrawer,
}: MobileSplitPaneProductCardProps) {
  const { openLocationModal, hasLocationContext, activeStore } = useLocation();
  const { addItem, updateQuantity, getItemQuantity } = useBasket();

  const initialVariantId = useMemo(() => {
    if (product.defaultVariant?.id) return product.defaultVariant.id;
    const firstAvail = product.variants?.find(
      (v) => v.isAvailable !== false && (v.availableQuantity ?? 0) > 0,
    );
    return firstAvail?.id || product.variants[0]?.id || '';
  }, [product.defaultVariant?.id, product.variants]);

  const [selectedVariantId] = useState<string>(initialVariantId);
  const [imageError, setImageError] = useState(false);

  const activeVariant: ProductVariantItem | undefined =
    product.variants.find((v) => v.id === selectedVariantId) ||
    product.defaultVariant ||
    product.variants[0];

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
  const availableQuantity = activeVariant?.availableQuantity ?? 0;
  const lowStockThreshold = activeVariant?.lowStockThreshold ?? product.lowStockThreshold ?? 5;
  const isAvailable =
    hasStoreOffer && activeVariant?.isAvailable !== false && availableQuantity > 0;
  const isLowStock =
    isAvailable && (activeVariant?.isLowStock || availableQuantity <= lowStockThreshold);

  const quantity = activeVariant
    ? getItemQuantity(activeVariant.sellerProductId, activeVariant.id)
    : 0;

  const rawImg = activeVariant?.primaryImageUrl || product.primaryImageUrl;
  const imageUrl = !imageError ? getOptimizedProductImage(rawImg, 'card') : null;
  const hasMultipleVariants = product.variants && product.variants.length > 1;

  const handleIncrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!resolvedStore || !activeVariant?.sellerProductId) {
      openLocationModal();
      return;
    }
    if (!isAvailable || quantity >= availableQuantity) return;

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
        availableQuantity,
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
        availableQuantity,
      });
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeVariant?.sellerProductId || quantity <= 0) return;
    await updateQuantity(activeVariant.sellerProductId, quantity - 1, {
      availableQuantity,
    });
  };

  const handlePackSizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMultipleVariants && onOpenVariantDrawer) {
      onOpenVariantDrawer(product);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-2 sm:p-2.5 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs">
      {/* Product Image Box with Floating ADD Button */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F8FAF7] border border-stone-100 flex items-center justify-center p-2">
        {discountPercent > 0 && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-2xs">
            {discountPercent}% OFF
          </span>
        )}

        {product.foodPreference && product.foodPreference !== 'NA' && (
          <div className="absolute right-1.5 top-1.5 z-10">
            {product.foodPreference === 'VEG' ? (
              <div
                className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-emerald-600 bg-white shadow-2xs"
                title="Vegetarian"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              </div>
            ) : product.foodPreference === 'NON_VEG' ? (
              <div
                className="flex h-3.5 w-3.5 items-center justify-center rounded-xs border border-red-600 bg-white shadow-2xs"
                title="Non-Vegetarian"
              >
                <div className="h-0 w-0 border-x-2.5 border-x-transparent border-b-5 border-b-red-600" />
              </div>
            ) : null}
          </div>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="flex h-full w-full items-center justify-center focus-visible:outline-none"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageError(true)}
              className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <span className="text-2xl">🛍️</span>
            </div>
          )}
        </Link>

        {/* Floating ADD Button / Stepper */}
        <div className="absolute bottom-1.5 right-1.5 z-20">
          {!resolvedStore ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openLocationModal();
              }}
              className="flex items-center gap-0.5 rounded-lg border border-brand/40 bg-white/95 px-2 py-1 text-[10px] font-bold text-brand shadow-xs"
            >
              <MapPin className="h-2.5 w-2.5" />
              <span>{hasLocationContext ? 'N/A' : 'Location'}</span>
            </button>
          ) : !isAvailable ? (
            <span className="rounded-md bg-stone-100/95 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-stone-500 border border-stone-200">
              Out of Stock
            </span>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={handleIncrement}
              aria-label={`Add ${product.name} to basket`}
              className="flex items-center gap-0.5 rounded-lg border border-emerald-600 bg-white/95 px-2.5 py-1 text-[11px] font-black tracking-tight text-emerald-700 shadow-xs backdrop-blur-xs transition-all hover:bg-emerald-600 hover:text-white active:scale-95"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
              <span>ADD</span>
            </button>
          ) : (
            <div className="flex items-center rounded-lg bg-emerald-700 text-white shadow-xs">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
                className="flex h-6 w-6 items-center justify-center rounded-l-lg hover:bg-emerald-800 transition-colors active:scale-90"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="px-1 text-[11px] font-extrabold">{quantity}</span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= availableQuantity}
                aria-label="Increase quantity"
                className="flex h-6 w-6 items-center justify-center rounded-r-lg hover:bg-emerald-800 transition-colors active:scale-90 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="mt-2 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span className="text-xs font-black text-stone-950 sm:text-sm">
              {formatINR(sellingPrice)}
            </span>
            {mrp > sellingPrice && (
              <span className="text-[10px] text-stone-400 line-through">{formatINR(mrp)}</span>
            )}
            {savingsAmount > 0 && (
              <span className="text-[9px] font-bold text-emerald-700">
                {formatINR(savingsAmount)} OFF
              </span>
            )}
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="block mt-0.5 focus-visible:outline-none"
          >
            <h3
              className="line-clamp-2 text-xs font-bold text-stone-900 group-hover:text-emerald-700 leading-snug"
              title={product.name}
            >
              {product.name}
            </h3>
          </Link>

          {isLowStock && (
            <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
              Only {availableQuantity} left
            </p>
          )}
        </div>

        {/* Pack Size / Variant Selector Trigger */}
        <div className="mt-1.5 pt-1 border-t border-stone-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePackSizeClick}
            disabled={!hasMultipleVariants}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
              hasMultipleVariants
                ? 'bg-stone-100 text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer border border-stone-200/60'
                : 'text-stone-500 cursor-default',
            )}
          >
            <span className="line-clamp-1 max-w-[85px]">
              {activeVariant?.packSize || activeVariant?.name || 'Standard'}
            </span>
            {hasMultipleVariants && <ChevronDown className="h-2.5 w-2.5 text-stone-500 shrink-0" />}
          </button>
        </div>
      </div>
    </div>
  );
}
