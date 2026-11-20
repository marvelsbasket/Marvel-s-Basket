'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { ProductCardItem, ProductVariantItem } from '@marvels-basket/shared';
import { cn } from '@/lib/utils';

export interface MobileSplitPaneProductCardProps {
  product: ProductCardItem;
  onOpenVariantDrawer?: (product: ProductCardItem) => void;
}

export function MobileSplitPaneProductCard({
  product,
  onOpenVariantDrawer,
}: MobileSplitPaneProductCardProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.defaultVariant?.id || product.variants[0]?.id || '',
  );
  const [quantity, setQuantity] = useState(0);
  const [imageError, setImageError] = useState(false);

  const activeVariant: ProductVariantItem | undefined =
    product.variants.find((v) => v.id === selectedVariantId) ||
    product.defaultVariant ||
    product.variants[0];

  const mrp = activeVariant?.mrp ?? product.mrp;
  const sellingPrice = activeVariant?.sellingPrice ?? product.sellingPrice;
  const discountPercent =
    activeVariant?.discountPercent ??
    product.discountPercent ??
    (mrp > sellingPrice && mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);

  const availableQuantity = activeVariant?.availableQuantity ?? product.availableQuantity ?? 99;
  const isOutOfStock = availableQuantity <= 0 || activeVariant?.isAvailable === false;

  const imageUrl =
    !imageError && (activeVariant?.primaryImageUrl || product.primaryImageUrl)
      ? activeVariant?.primaryImageUrl || product.primaryImageUrl
      : '/placeholder-product.png';

  const hasMultipleVariants = product.variants && product.variants.length > 1;

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setQuantity((prev) => Math.min(prev + 1, availableQuantity));
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity((prev) => Math.max(0, prev - 1));
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
        {/* Discount Badge (Top-Left) */}
        {discountPercent > 0 && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-2xs">
            {discountPercent}% OFF
          </span>
        )}

        {/* Dietary Veg / Non-Veg Indicator (Top-Right) */}
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

        {/* Product Image with Link to PDP */}
        <Link
          href={`/products/${product.slug}`}
          className="flex h-full w-full items-center justify-center focus-visible:outline-none"
        >
          {imageUrl && imageUrl !== '/placeholder-product.png' ? (
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

        {/* Floating ADD Button / Stepper (Bottom-Right corner of image) */}
        <div className="absolute bottom-1.5 right-1.5 z-20">
          {isOutOfStock ? (
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
                aria-label="Increase quantity"
                className="flex h-6 w-6 items-center justify-center rounded-r-lg hover:bg-emerald-800 transition-colors active:scale-90"
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
          {/* Price Row: Selling Price + Strikethrough MRP + Savings */}
          <div className="flex items-baseline flex-wrap gap-1.5">
            <span className="text-xs font-black text-stone-950 sm:text-sm">₹{sellingPrice}</span>
            {mrp > sellingPrice && (
              <span className="text-[10px] text-stone-400 line-through">₹{mrp}</span>
            )}
            {mrp > sellingPrice && (
              <span className="text-[9px] font-bold text-emerald-700">
                ₹{Math.round(mrp - sellingPrice)} OFF
              </span>
            )}
          </div>

          {/* Product Title */}
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
