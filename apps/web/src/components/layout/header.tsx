'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  HelpCircle,
  LayoutGrid,
  MapPin,
  Menu,
  Percent,
  Search,
  ShoppingCart,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Dialog } from '@/components/ui/dialog';
import { DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  cartItemCount?: number;
  currentLocation?: string;
  onLocationChange?: (location: string) => void;
  onSearch?: (query: string) => void;
}

export function Header({
  cartItemCount = 0,
  currentLocation = 'Azamgarh, UP',
  onLocationChange,
  onSearch,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const handleLocationSelect = (loc: string) => {
    setSelectedLocation(loc);
    onLocationChange?.(loc);
    setIsLocationModalOpen(false);
  };

  const availableLocations = [
    'Azamgarh, UP',
    'Varanasi, UP',
    'Lucknow, UP',
    'Gorakhpur, UP',
    'Prayagraj, UP',
    'Mau, UP',
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-xs">
      {/* =================================================================== */}
      {/* TIER 1: PRIMARY NAVIGATION BAR                                     */}
      {/* =================================================================== */}
      <div className="border-b border-border">
        <div className="mx-auto flex h-20 max-w-container items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* 1. Brand Logo */}
          <div className="flex-shrink-0">
            <Logo variant="compact" />
          </div>

          {/* 2. Hyperlocal Location Selector (Desktop/Tablet) */}
          <div className="hidden md:flex items-center">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="group flex items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`Delivery location: ${selectedLocation}. Click to change.`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium text-ink-muted">Deliver to</span>
                <div className="flex items-center gap-1 font-bold text-ink text-sm">
                  <span>{selectedLocation}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-muted transition-transform group-hover:translate-y-0.5" />
                </div>
              </div>
            </button>
          </div>

          {/* 3. Global Pill Search Bar (Center) */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-xl mx-2">
            <div className="relative flex w-full items-center">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for groceries, fruits, milk and more..."
                className={cn(
                  'h-11 w-full rounded-full border border-border-subtle bg-surface-tile pl-11 pr-12 text-sm text-ink placeholder:text-ink-muted',
                  'transition-all duration-150 focus:bg-white focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20',
                )}
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white transition-transform hover:scale-105 active:scale-95"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* 4. User Actions (Login & Cart) */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Account / Login Action */}
            <DropdownMenu
              align="right"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <User className="h-5 w-5 text-ink" />
                  <span className="hidden lg:inline">Login</span>
                </button>
              }
            >
              <div className="px-3 py-2">
                <p className="text-xs font-bold text-ink">Welcome</p>
                <p className="text-[11px] text-ink-muted">To manage orders and profile</p>
              </div>
              <DropdownDivider />
              <DropdownItem>
                <Link href="/login" className="w-full">
                  Customer Sign In
                </Link>
              </DropdownItem>
              <DropdownItem>
                <Link href="/register" className="w-full">
                  Create Account
                </Link>
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem>
                <Link href="/seller/login" className="w-full text-brand">
                  Seller Portal
                </Link>
              </DropdownItem>
            </DropdownMenu>

            {/* Cart Action */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 rounded-xl bg-brand/10 px-3.5 py-2 text-sm font-bold text-brand transition-all hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`Shopping cart with ${cartItemCount} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cta text-xs font-black text-ink shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex sm:hidden p-2 text-ink hover:text-brand focus-visible:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input Row */}
        <div className="px-4 pb-3 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groceries, essentials..."
              className="h-10 w-full rounded-full border border-border-subtle bg-surface-tile pl-10 pr-10 text-xs text-ink placeholder:text-ink-muted focus:bg-white focus:border-brand focus-visible:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TIER 2: SECONDARY CATEGORY & UTILITY LINKS STRIP                   */}
      {/* =================================================================== */}
      <div className="hidden md:block border-b border-border bg-white text-xs font-semibold">
        <div className="mx-auto flex h-11 max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: All Categories Dropdown (in bold brand green) */}
          <div className="flex items-center gap-8">
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 font-bold text-brand hover:text-forest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>All Categories</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              }
            >
              <DropdownItem>Groceries & Staples</DropdownItem>
              <DropdownItem>Fruits & Vegetables</DropdownItem>
              <DropdownItem>Dairy, Bread & Eggs</DropdownItem>
              <DropdownItem>Snacks & Beverages</DropdownItem>
              <DropdownItem>Personal Care</DropdownItem>
              <DropdownItem>Home & Cleaning</DropdownItem>
              <DropdownItem>Baby Care</DropdownItem>
            </DropdownMenu>

            {/* Navigation Links matching design reference */}
            <nav className="flex items-center gap-6">
              <Link
                href="/offers"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Percent className="h-3.5 w-3.5 text-brand" />
                <span>Offers</span>
              </Link>
              <Link
                href="/become-a-seller"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-brand" />
                <span>Become a Seller</span>
              </Link>
              <Link
                href="/track-order"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Truck className="h-3.5 w-3.5 text-brand" />
                <span>Track Order</span>
              </Link>
              <Link
                href="/help"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5 text-brand" />
                <span>Help</span>
              </Link>
            </nav>
          </div>

          {/* Right micro-info: Quick Customer Support info */}
          <div className="text-[11px] text-ink-muted">
            Hyperlocal Delivery in <span className="font-bold text-brand">10–30 mins</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE DRAWER / FLYOUT                                             */}
      {/* =================================================================== */}
      {isMobileMenuOpen && (
        <div className="border-b border-border bg-white p-4 sm:hidden animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsLocationModalOpen(true);
            }}
            className="mb-3 flex w-full items-center justify-between rounded-xl bg-surface p-2.5 text-xs font-semibold text-ink"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" />
              <span>Deliver to: {selectedLocation}</span>
            </div>
            <span className="text-[11px] text-brand">Change</span>
          </button>
          <nav className="flex flex-col space-y-2 text-sm font-semibold text-ink">
            <Link
              href="/categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 text-brand hover:bg-surface"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>All Categories</span>
            </Link>
            <Link
              href="/offers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <Percent className="h-4 w-4 text-brand" />
              <span>Offers & Deals</span>
            </Link>
            <Link
              href="/become-a-seller"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <Store className="h-4 w-4 text-brand" />
              <span>Become a Seller</span>
            </Link>
            <Link
              href="/track-order"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <Truck className="h-4 w-4 text-brand" />
              <span>Track Order</span>
            </Link>
            <Link
              href="/help"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <HelpCircle className="h-4 w-4 text-brand" />
              <span>Help & Support</span>
            </Link>
          </nav>
        </div>
      )}

      {/* =================================================================== */}
      {/* LOCATION SELECTION DIALOG                                          */}
      {/* =================================================================== */}
      <Dialog
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Select Your Delivery Location"
        description="Choose your area to discover verified stores and get accurate delivery estimates."
      >
        <div className="mt-4 space-y-2">
          {availableLocations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleLocationSelect(loc)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-semibold transition-all',
                selectedLocation === loc
                  ? 'border-brand bg-emerald-50/60 text-brand ring-1 ring-brand'
                  : 'border-border bg-white text-ink hover:bg-surface',
              )}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-brand" />
                <span>{loc}</span>
              </div>
              {selectedLocation === loc && (
                <span className="text-xs font-bold text-brand">Selected</span>
              )}
            </button>
          ))}
        </div>
      </Dialog>
    </header>
  );
}
