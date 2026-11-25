'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useBasket } from '@/features/basket/context/basket-context';
import { formatINR } from '@/lib/utils/currency';

export function MobileFloatingBasket() {
  const pathname = usePathname();
  const { basket } = useBasket();

  if (
    !basket ||
    basket.totalUnits <= 0 ||
    pathname.startsWith('/basket') ||
    pathname.startsWith('/cart')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-[68px] left-3 right-3 z-30 md:hidden pointer-events-none">
      <Link
        href="/basket"
        className="pointer-events-auto flex items-center justify-between rounded-2xl bg-forest px-4 py-3 text-white shadow-xl ring-1 ring-white/15 active:scale-[0.99] transition-transform"
        aria-label={`View Basket: ${basket.totalUnits} items totaling ${formatINR(basket.subtotal)}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 shrink-0">
            <ShoppingBag className="h-4 w-4 text-cta" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">
              {basket.totalUnits} {basket.totalUnits === 1 ? 'Item' : 'Items'} •{' '}
              {formatINR(basket.subtotal)}
            </p>
            {basket.store?.name && (
              <p className="text-[11px] text-white/80 truncate">{basket.store.name}</p>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-cta px-3 py-1.5 text-xs font-extrabold text-forest shrink-0">
          View Basket
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}
