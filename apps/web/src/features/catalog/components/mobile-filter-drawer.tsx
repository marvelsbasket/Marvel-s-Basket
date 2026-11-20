'use client';

import React, { useEffect } from 'react';
import { ArrowUpDown, Check, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest';

export interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  foodPreference: string;
  onFoodPreferenceChange: (pref: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  inStockOnly?: boolean;
  onInStockChange?: (inStock: boolean) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { id: SortOption; label: string; description: string }[] = [
  { id: 'relevance', label: 'Relevance', description: "Recommended by Marvel's Basket" },
  { id: 'price_asc', label: 'Price: Low to High', description: 'Cheapest products first' },
  { id: 'price_desc', label: 'Price: High to Low', description: 'Premium products first' },
  { id: 'discount_desc', label: 'Discount: High to Low', description: 'Biggest savings first' },
  { id: 'newest', label: 'New Arrivals', description: 'Freshly added items' },
];

export function MobileFilterDrawer({
  isOpen,
  onClose,
  foodPreference,
  onFoodPreferenceChange,
  sortBy,
  onSortChange,
  inStockOnly = false,
  onInStockChange,
  onReset,
}: MobileFilterDrawerProps) {
  // Lock body scroll and handle Escape key
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

  if (!isOpen) return null;

  const hasActiveFilters = foodPreference !== 'ALL' || sortBy !== 'relevance' || inStockOnly;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div className="relative z-10 w-full max-h-[85vh] flex flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-250">
        {/* Drawer Pull Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
            <h2 className="text-base font-black text-stone-900">Filters & Sort</h2>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                Reset All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Section: Food Preference */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2.5">
              Dietary Preference
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onFoodPreferenceChange('ALL')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-bold transition-all',
                  foodPreference === 'ALL'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-2xs font-extrabold'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                )}
              >
                <span>All Items</span>
              </button>
              <button
                type="button"
                onClick={() => onFoodPreferenceChange('VEG')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-bold transition-all',
                  foodPreference === 'VEG'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-2xs font-extrabold'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                )}
              >
                <div className="flex h-3 w-3 items-center justify-center rounded-xs border border-emerald-600 bg-white">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </div>
                <span>Veg Only</span>
              </button>
              <button
                type="button"
                onClick={() => onFoodPreferenceChange('NON_VEG')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-bold transition-all',
                  foodPreference === 'NON_VEG'
                    ? 'border-red-600 bg-red-50/70 text-red-900 shadow-2xs font-extrabold'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                )}
              >
                <div className="flex h-3 w-3 items-center justify-center rounded-xs border border-red-600 bg-white">
                  <div className="h-0 w-0 border-x-2 border-x-transparent border-b-4 border-b-red-600" />
                </div>
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Section: Availability Toggle */}
          {onInStockChange && (
            <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-stone-50/60 p-3.5">
              <div>
                <p className="text-xs font-bold text-stone-900">In-Stock Only</p>
                <p className="text-[11px] text-stone-500">Hide products currently out of stock</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={inStockOnly}
                onClick={() => onInStockChange(!inStockOnly)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  inStockOnly ? 'bg-emerald-600' : 'bg-stone-300',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    inStockOnly ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          )}

          {/* Section: Sort By */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2.5">
              Sort By
            </h3>
            <div className="space-y-1.5">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSortChange(opt.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl p-3 text-left transition-all',
                      isSelected
                        ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-950 font-bold'
                        : 'border border-stone-100 hover:bg-stone-50 text-stone-700',
                    )}
                  >
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[11px] text-stone-500 font-normal">{opt.description}</p>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Apply Bar */}
        <div className="border-t border-stone-100 p-4 pb-6 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-700 py-3 text-center text-sm font-extrabold text-white shadow-xs transition-transform active:scale-[0.99] hover:bg-emerald-800"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
