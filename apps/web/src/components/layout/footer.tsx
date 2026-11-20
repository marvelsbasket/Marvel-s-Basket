'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { ShieldCheck, Truck, Clock, RefreshCcw } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface-subtle text-ink">
      {/* Platform Value Highlights Strip */}
      <div className="border-b border-border bg-white py-8">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-brand">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">Superfast Delivery</h4>
                <p className="text-xs text-ink-muted">10–30 mins to your doorstep</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">Verified Sellers</h4>
                <p className="text-xs text-ink-muted">Trusted local supermarkets</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-brand">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">Best Prices & Deals</h4>
                <p className="text-xs text-ink-muted">Direct neighborhood prices</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-brand">
                <RefreshCcw className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">Hassle-Free Returns</h4>
                <p className="text-xs text-ink-muted">Quick dispute resolution</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Logo variant="footer" priority={false} />
            <p className="max-w-sm text-xs text-ink-muted leading-relaxed">
              Marvel&apos;s Basket is an online quick-commerce aggregator connecting you with
              trusted local supermarkets and grocery shops for fast, reliable doorstep delivery.
            </p>
            <div className="pt-2 text-[11px] text-ink-muted">
              © {new Date().getFullYear()} Marvel&apos;s Techworks. All rights reserved.
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h5 className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink">
              Categories
            </h5>
            <ul className="space-y-2 text-xs text-ink-secondary">
              <li>
                <Link href="/categories/groceries" className="hover:text-brand transition-colors">
                  Groceries & Staples
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/fruits-vegetables"
                  className="hover:text-brand transition-colors"
                >
                  Fruits & Vegetables
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/dairy-bakery"
                  className="hover:text-brand transition-colors"
                >
                  Dairy & Bakery
                </Link>
              </li>
              <li>
                <Link href="/categories/snacks" className="hover:text-brand transition-colors">
                  Snacks & Beverages
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/personal-care"
                  className="hover:text-brand transition-colors"
                >
                  Personal Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Partner with Us */}
          <div>
            <h5 className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink">Partner</h5>
            <ul className="space-y-2 text-xs text-ink-secondary">
              <li>
                <Link
                  href="/sell-on-marvels-basket"
                  className="hover:text-brand transition-colors font-semibold text-brand"
                >
                  Sell on Marvel&apos;s Basket
                </Link>
              </li>
              <li>
                <Link href="/seller/application" className="hover:text-brand transition-colors">
                  Application Status
                </Link>
              </li>
              <li>
                <Link href="/seller/profile" className="hover:text-brand transition-colors">
                  Store Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Legal */}
          <div>
            <h5 className="mb-3.5 text-xs font-bold uppercase tracking-wider text-ink">
              Help & Legal
            </h5>
            <ul className="space-y-2 text-xs text-ink-secondary">
              <li>
                <Link href="/help" className="hover:text-brand transition-colors">
                  Help Center & FAQ
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-brand transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cancellation-refunds" className="hover:text-brand transition-colors">
                  Cancellation & Refunds
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
