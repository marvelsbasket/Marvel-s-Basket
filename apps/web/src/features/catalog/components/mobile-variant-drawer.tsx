'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { ProductCardItem, ProductVariantItem } from '@marvels-basket/shared';
import { cn } from '@/lib/utils';

export interface MobileVariantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCardItem | null;
}

export function MobileVariantDrawer({ isOpen, onClose, product }: MobileVariantDrawerProps) {
  // Quantities tracked per variant ID
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const handleIncrement = (variantId: string, maxQty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.min((prev[variantId] || 0) + 1, maxQty),
    }));
  };

  const handleDecrement = (variantId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(0, (prev[variantId] || 0) - 1),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Surface */}
      <div className="relative z-10 w-full max-h-[85vh] flex flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-250">
        {/* Pull Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-[#F8FAF7] p-1 flex items-center justify-center">
              {product.primaryImageUrl ? (
                <img
                  src={product.primaryImageUrl}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xl">🛍️</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-stone-900 truncate">{product.name}</h2>
              <p className="text-[11px] font-semibold text-stone-500">
                Choose pack size ({product.variants?.length || 1} available)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pack size drawer"
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Variants List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {product.variants?.map((variant) => {
            const mrp = variant.mrp ?? 0;
            const sellingPrice = variant.sellingPrice ?? 0;
            const discountPercent =
              variant.discountPercent ??
              (mrp > sellingPrice && mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);

            const availableQty = variant.availableQuantity ?? 99;
            const isOutOfStock = availableQty <= 0 || variant.isAvailable === false;
            const currentQty = quantities[variant.id] || 0;

            return (
              <div
                key={variant.id}
                className="flex items-center justify-between rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-2xs hover:border-emerald-300 transition-colors"
              >
                {/* Variant Info */}
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {variant.packSize || variant.name}
                    </span>
                    {discountPercent > 0 && (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200/60">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xs font-black text-stone-950 sm:text-sm">
                      ₹{sellingPrice}
                    </span>
                    {mrp > sellingPrice && (
                      <span className="text-[10px] text-stone-400 line-through">₹{mrp}</span>
                    )}
                  </div>
                </div>

                {/* Variant Action Button */}
                <div className="shrink-0">
                  {isOutOfStock ? (
                    <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-500 border border-stone-200">
                      Out of Stock
                    </span>
                  ) : currentQty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleIncrement(variant.id, availableQty)}
                      className="flex items-center gap-0.5 rounded-xl border border-emerald-600 bg-white px-3 py-1.5 text-xs font-black tracking-tight text-emerald-700 shadow-2xs transition-all hover:bg-emerald-600 hover:text-white active:scale-95"
                    >
                      <Plus className="h-3 w-3 stroke-[3]" />
                      <span>ADD</span>
                    </button>
                  ) : (
                    <div className="flex items-center rounded-xl bg-emerald-700 text-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleDecrement(variant.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-l-xl hover:bg-emerald-800 transition-colors active:scale-90"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 text-xs font-black">{currentQty}</span>
                      <button
                        type="button"
                        onClick={() => handleIncrement(variant.id, availableQty)}
                        className="flex h-7 w-7 items-center justify-center rounded-r-xl hover:bg-emerald-800 transition-colors active:scale-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Done Button */}
        <div className="border-t border-stone-100 p-4 pb-6 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-700 py-3 text-center text-sm font-extrabold text-white shadow-xs transition-transform active:scale-[0.99] hover:bg-emerald-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
