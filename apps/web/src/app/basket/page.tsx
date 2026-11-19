'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { Button } from '@/components/ui/button';

export default function BasketPage() {
  return (
    <StorefrontLayout basketItemCount={0}>
      <div className="bg-surface-subtle min-h-[calc(100vh-140px)] py-6 sm:py-10">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
              aria-label="Continue Shopping"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-ink sm:text-2xl">My Basket</h1>
              <p className="text-xs text-ink-muted">Review fresh grocery items before checkout</p>
            </div>
          </div>

          {/* Empty Basket Card */}
          <div className="rounded-2xl border border-border bg-white p-8 sm:p-12 shadow-card text-center max-w-md mx-auto">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-4 ring-brand/5">
              <ShoppingBag className="h-10 w-10" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-ink sm:text-xl">Your Basket is Empty</h2>
            <p className="mt-2 text-xs text-ink-muted leading-relaxed sm:text-sm">
              You haven&apos;t added any fresh groceries or daily essentials yet. Explore nearby
              verified supermarkets to fill your basket!
            </p>

            <div className="mt-6 flex justify-center">
              <Link href="/">
                <Button variant="brand" size="md">
                  Explore Groceries
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
