import React from 'react';
import {
  ShoppingBasket,
  MapPin,
  Search,
  ShoppingCart,
  User,
  ChevronDown,
  CheckCircle2,
  Server,
  Database,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { APP_NAME, CART_RESERVATION_TIMEOUT_MINUTES } from '@marvels-basket/shared';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ================================================================== */}
      {/* 1. DUAL-TIER TOP NAVIGATION BAR (PROJECT_DESIGN_SYSTEM.md §2.1)     */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
        {/* Tier A: Primary Utility Bar */}
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-3.5">
          {/* Brand Identity */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <ShoppingBasket className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-forest">
                MARVEL&apos;S BASKET
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Hyperlocal Marketplace
              </span>
            </div>
          </div>

          {/* Hyperlocal Delivery Location Selector */}
          <div className="hidden cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-surface md:flex">
            <MapPin className="h-4 w-4 text-brand" />
            <div className="text-left text-xs">
              <span className="block text-[10px] text-muted">Deliver to</span>
              <span className="font-bold text-ink">Azamgarh, UP</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </div>

          {/* Global Search Bar */}
          <div className="relative max-w-md flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-muted" />
            </div>
            <input
              type="text"
              readOnly
              placeholder="Search for groceries, fruits, milk and more..."
              className="w-full rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-xs font-medium text-ink placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand md:text-sm"
            />
          </div>

          {/* Account & Cart Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface md:text-sm"
            >
              <User className="h-4 w-4 text-ink" />
              <span>Login</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-forest md:text-sm"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
              <span className="ml-1 rounded-full bg-cta px-1.5 py-0.5 text-[10px] font-black text-ink">
                0
              </span>
            </button>
          </div>
        </div>

        {/* Tier B: Secondary Category & Trust Strip */}
        <div className="border-t border-border/60 bg-white">
          <div className="mx-auto flex max-w-container items-center gap-6 px-6 py-2 text-xs font-semibold text-secondary">
            <div className="flex cursor-pointer items-center gap-1 text-brand font-bold">
              <span>All Categories</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
            <span className="cursor-pointer hover:text-brand">Offers</span>
            <span className="cursor-pointer hover:text-brand">Become a Seller</span>
            <span className="cursor-pointer hover:text-brand">Track Order</span>
            <span className="cursor-pointer hover:text-brand">Help</span>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. HERO BANNER (PROJECT_DESIGN_SYSTEM.md §2.2)                     */}
      {/* ================================================================== */}
      <main className="mx-auto w-full max-w-container flex-1 px-6 py-8">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest via-[#116932] to-brand p-8 text-white shadow-md md:p-12">
          {/* Background Lime Wave Accent */}
          <div
            className="pointer-events-none absolute -bottom-16 right-0 h-64 w-96 rounded-full bg-brand-lime/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl">
            {/* Trust Badges */}
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-highlight px-3 py-1 text-[11px] font-bold text-forest shadow-sm">
                Multiple Sellers
              </span>
              <span className="rounded-full bg-highlight px-3 py-1 text-[11px] font-bold text-forest shadow-sm">
                Best Prices
              </span>
              <span className="rounded-full bg-highlight px-3 py-1 text-[11px] font-bold text-forest shadow-sm">
                Quick Delivery
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Groceries &amp; Daily Essentials Delivered Fast!
            </h1>

            <p className="mb-6 text-sm text-white/90 md:text-base font-normal">
              Fresh produce, dairy, household staples, and snacks delivered right to your doorstep
              from verified neighborhood stores in your area.
            </p>

            {/* Primary CTA */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-cta px-6 py-3 text-sm font-bold text-ink shadow-md transition hover:bg-[#e2ce1c] active:scale-95"
              >
                <span>Shop Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-xs text-white/80">
                Cart hold duration: {CART_RESERVATION_TIMEOUT_MINUTES} mins
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 3. PHASE 01 ENVIRONMENT & ARCHITECTURE STATUS CARD                  */}
        {/* ================================================================== */}
        <section className="mt-10 rounded-xl border border-border bg-surface/50 p-6 md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-2 border-b border-border pb-4 md:flex-row md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Foundation Milestone Verified
              </span>
              <h2 className="text-xl font-bold text-ink">
                Phase 01 — Monorepo &amp; Development Environment
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Environment Ready
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Frontend Card */}
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">Next.js Web App</h3>
              <p className="mt-1 text-xs text-muted">
                Port 3000 • Customer experience with Design System compliance.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-blue-600">apps/web • Running</div>
            </div>

            {/* Backend Card */}
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">NestJS Backend API</h3>
              <p className="mt-1 text-xs text-muted">
                Port 4000 • Modular monolith foundation with global /api/v1 prefix.
              </p>
              <div className="mt-3">
                <a
                  href="http://localhost:4000/api/v1/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                >
                  Verify Health Endpoint &rarr;
                </a>
              </div>
            </div>

            {/* PostgreSQL Card */}
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">PostgreSQL 16</h3>
              <p className="mt-1 text-xs text-muted">
                Port 5432 • Containerized with persistent volume &amp; healthchecks.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-indigo-600">
                marvels_basket_postgres_data
              </div>
            </div>

            {/* Redis Card */}
            <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-ink">Redis 7 Cache</h3>
              <p className="mt-1 text-xs text-muted">
                Port 6379 • AOF persistence, session store &amp; cart reservations.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-rose-600">
                marvels_basket_redis_data
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-white p-4 text-xs text-secondary border border-border">
            <span className="font-bold text-ink">Centralized Orchestration Note: </span>
            All Docker dependencies, development servers, linting, formatting, and builds are
            controlled from the repository root via npm scripts (e.g.{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-ink">
              npm run docker:up
            </code>
            ,{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-ink">npm run dev</code>
            ,{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-ink">
              npm run check
            </code>
            ).
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface py-6 text-center text-xs text-muted">
        <div className="mx-auto max-w-container px-6">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME} by Marvel&apos;s Techworks. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
