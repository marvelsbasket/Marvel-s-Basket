'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Clock,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Minus,
  Package,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import {
  CategoryTreeItem,
  SearchSuggestionProductItem,
  SearchSuggestionsResponse,
} from '@marvels-basket/shared';
import { Logo } from '@/components/shared/logo';
import { DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { useLocation } from '@/features/location/context/location-context';
import { LocationSelectorModal } from '@/features/location/components/location-selector-modal';
import { useBasket } from '@/features/basket/context/basket-context';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'mb_recent_searches_v1';
const POPULAR_SEARCH_CHIPS = ['Milk', 'Atta', 'Potato', 'Sugar', 'Tea', 'Oil'];

export interface HeaderProps {
  basketItemCount?: number;
  cartItemCount?: number;
  currentLocation?: string;
  onLocationChange?: (location: string) => void;
  onSearch?: (query: string) => void;
}

export function Header({ basketItemCount, cartItemCount, currentLocation, onSearch }: HeaderProps) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { location, isHydrated, isServiceable, activeStore, openLocationModal } = useLocation();
  const { basket, addItem, updateQuantity, getItemQuantity } = useBasket();

  const itemCount = basketItemCount ?? cartItemCount ?? basket.totalUnits;
  const locationDisplay = isHydrated
    ? location?.displayLocation || currentLocation || 'Select Location'
    : 'Select Location';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestionsResponse>({
    products: [],
    categories: [],
    brands: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<CategoryTreeItem[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Hydrate recent searches + dynamic categories tree once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 6));
      }
    } catch {
      // Ignore storage error
    }

    CatalogService.getCategoriesTree()
      .then((tree) => setCategoriesTree(tree.slice(0, 8)))
      .catch(() => {
        // Fallback links still remain
      });
  }, []);

  // Close search dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        (!mobileSearchContainerRef.current || !mobileSearchContainerRef.current.contains(target))
      ) {
        setIsSearchFocused(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 250ms debounced instant autocomplete
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions({ products: [], categories: [], brands: [] });
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await CatalogService.getSearchSuggestions(trimmed, {
          storeId: activeStore?.id,
          postalCode: location?.postalCode ?? undefined,
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
        });
        if (!cancelled) {
          setSuggestions(res);
        }
      } catch {
        if (!cancelled) {
          setSuggestions({ products: [], categories: [], brands: [] });
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, activeStore?.id, location?.postalCode, location?.latitude, location?.longitude]);

  const recordRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const next = [
      clean,
      ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const navigateToSearch = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    recordRecentSearch(trimmed);
    setIsSearchFocused(false);
    if (onSearch) {
      onSearch(trimmed);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToSearch(searchQuery);
  };

  const handleQuickAddSuggestion = async (
    e: React.MouseEvent,
    prod: SearchSuggestionProductItem,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeStore || !prod.sellerProductId || !prod.defaultVariantId || !prod.isAvailable) {
      if (!location) {
        openLocationModal();
      }
      return;
    }

    const currentQty = getItemQuantity(prod.sellerProductId, prod.defaultVariantId);
    if (currentQty === 0) {
      await addItem({
        sellerProductId: prod.sellerProductId,
        productId: prod.id,
        variantId: prod.defaultVariantId,
        productName: prod.name,
        productSlug: prod.slug,
        brand: prod.brand,
        packSize: prod.packSize,
        imageUrl: prod.primaryImageUrl,
        unitPrice: prod.sellingPrice ?? 0,
        mrp: prod.mrp ?? prod.sellingPrice ?? 0,
        availableQuantity: prod.availableQuantity,
        store: {
          id: activeStore.id,
          name: activeStore.name,
          slug: activeStore.slug,
          deliveryEtaLabel: activeStore.deliveryEtaLabel,
          deliveryTimeMinutes: activeStore.deliveryTimeMinutes,
          isOpen: activeStore.isOpen,
          isAcceptingOrders: activeStore.isAcceptingOrders,
          minimumOrderValue: activeStore.minimumOrderValue,
        },
        quantity: 1,
      });
    } else {
      await updateQuantity(prod.sellerProductId, currentQty + 1, {
        availableQuantity: prod.availableQuantity,
      });
    }
  };

  const renderSearchDropdown = () => {
    if (!isSearchFocused) return null;
    const trimmed = searchQuery.trim();
    const hasQuery = trimmed.length >= 2;

    return (
      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-border bg-white shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto">
        {!hasQuery ? (
          <div className="p-4 space-y-4">
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                    }}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        navigateToSearch(term);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink hover:border-brand hover:text-brand"
                    >
                      <Clock className="h-3 w-3 text-ink-muted" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
                Popular Staples
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSearchQuery(chip);
                      navigateToSearch(chip);
                    }}
                    className="rounded-full border border-border-subtle bg-white px-3 py-1 text-xs font-semibold text-ink-secondary hover:border-brand hover:text-brand"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : isSearching ? (
          <div className="p-4 text-xs text-ink-muted">Searching catalog...</div>
        ) : suggestions.products.length === 0 &&
          suggestions.categories.length === 0 &&
          suggestions.brands.length === 0 ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-xs font-semibold text-ink">
              No instant matches for &ldquo;{trimmed}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => navigateToSearch(trimmed)}
              className="text-xs font-bold text-brand hover:underline"
            >
              See all search results for &ldquo;{trimmed}&rdquo; →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {/* Categories & Brands quick chips */}
            {(suggestions.categories.length > 0 || suggestions.brands.length > 0) && (
              <div className="p-3 bg-surface/60 flex flex-wrap gap-1.5">
                {suggestions.categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setIsSearchFocused(false)}
                    className="rounded-full bg-white border border-border px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand-tint"
                  >
                    Category: {cat.name}
                  </Link>
                ))}
                {suggestions.brands.map((brand) => (
                  <button
                    key={brand.slug}
                    type="button"
                    onClick={() => navigateToSearch(brand.name)}
                    className="rounded-full bg-white border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:border-brand"
                  >
                    Brand: {brand.name}
                  </button>
                ))}
              </div>
            )}

            {/* Product Matches with Direct ADD */}
            {suggestions.products.map((prod) => {
              const qty = getItemQuantity(prod.sellerProductId, prod.defaultVariantId);
              const thumb = getOptimizedProductImage(prod.primaryImageUrl, 'thumb');
              const canQuickAdd =
                Boolean(activeStore) &&
                Boolean(prod.sellerProductId) &&
                prod.isAvailable &&
                prod.availableQuantity > 0;

              return (
                <div
                  key={prod.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-surface/70 transition-colors"
                >
                  <Link
                    href={`/products/${prod.slug}`}
                    onClick={() => {
                      recordRecentSearch(prod.name);
                      setIsSearchFocused(false);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="h-10 w-10 rounded-lg border border-border bg-surface-tile flex items-center justify-center overflow-hidden shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={prod.name}
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <ShoppingBag className="h-4 w-4 text-ink-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{prod.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                        {prod.packSize && <span>{prod.packSize}</span>}
                        {prod.sellingPrice !== null && (
                          <span className="font-bold text-ink">{formatINR(prod.sellingPrice)}</span>
                        )}
                        {prod.mrp !== null &&
                          prod.sellingPrice !== null &&
                          prod.mrp > prod.sellingPrice && (
                            <span className="line-through text-[10px]">{formatINR(prod.mrp)}</span>
                          )}
                      </div>
                    </div>
                  </Link>

                  <div className="shrink-0">
                    {canQuickAdd ? (
                      qty === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAddSuggestion(e, prod)}
                          className="rounded-lg border border-brand bg-brand-tint px-2.5 py-1 text-[11px] font-extrabold text-brand hover:bg-brand hover:text-white transition-colors"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="flex items-center rounded-lg bg-brand text-white">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (prod.sellerProductId) {
                                await updateQuantity(prod.sellerProductId, qty - 1, {
                                  availableQuantity: prod.availableQuantity,
                                });
                              }
                            }}
                            aria-label="Decrease quantity"
                            className="h-6 w-6 flex items-center justify-center hover:bg-forest rounded-l-lg"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-1.5 text-[11px] font-bold">{qty}</span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickAddSuggestion(e, prod)}
                            disabled={qty >= prod.availableQuantity}
                            aria-label="Increase quantity"
                            className="h-6 w-6 flex items-center justify-center hover:bg-forest rounded-r-lg disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    ) : !activeStore ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchFocused(false);
                          openLocationModal();
                        }}
                        className="text-[10px] font-bold text-brand hover:underline"
                      >
                        Set Location
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-ink-muted">Out of Stock</span>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => navigateToSearch(trimmed)}
              className="w-full py-2.5 px-4 text-center text-xs font-bold text-brand bg-surface hover:bg-brand-tint transition-colors"
            >
              View all search results for &ldquo;{trimmed}&rdquo; →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-xs">
      {/* =================================================================== */}
      {/* TIER 1: PRIMARY NAVIGATION BAR                                     */}
      {/* =================================================================== */}
      <div className="border-b border-border">
        <div className="mx-auto flex h-20 max-w-container items-center justify-between gap-1.5 sm:gap-4 px-3 sm:px-6 lg:px-8">
          {/* 1. Brand Logo */}
          <div className="flex-shrink-0">
            <Logo variant="compact" />
          </div>

          {/* 2a. Hyperlocal Location Selector (Mobile < md) */}
          <div className="flex md:hidden items-center flex-1 min-w-0 mx-1">
            <button
              type="button"
              onClick={openLocationModal}
              className="group flex items-center gap-1.5 rounded-lg py-1 px-1 text-left transition-colors hover:bg-surface focus-visible:outline-none max-w-full"
              aria-label={`Delivery location: ${locationDisplay}. Click to change.`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[10px] font-medium text-ink-muted leading-none">
                  {activeStore?.deliveryEtaLabel
                    ? `Delivery in ${activeStore.deliveryEtaLabel}`
                    : location && !isServiceable
                      ? 'Coming soon here'
                      : 'Deliver to'}
                </span>
                <div className="flex items-center gap-0.5 font-bold text-ink text-xs leading-tight">
                  <span className="truncate max-w-[95px] min-[360px]:max-w-[125px] min-[390px]:max-w-[155px] sm:max-w-[190px]">
                    {locationDisplay}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-ink-muted transition-transform group-hover:translate-y-0.5" />
                </div>
              </div>
            </button>
          </div>

          {/* 2b. Hyperlocal Location Selector (Desktop/Tablet >= md) */}
          <div className="hidden md:flex items-center">
            <button
              type="button"
              onClick={openLocationModal}
              className="group flex items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`Delivery location: ${locationDisplay}. Click to change.`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-medium text-ink-muted">
                  {activeStore?.deliveryEtaLabel
                    ? `${activeStore.name} • ${activeStore.deliveryEtaLabel}`
                    : location && !isServiceable
                      ? 'Not serviceable yet'
                      : 'Deliver to'}
                </span>
                <div className="flex items-center gap-1 font-bold text-ink text-sm">
                  <span className="max-w-[190px] truncate">{locationDisplay}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-muted transition-transform group-hover:translate-y-0.5" />
                </div>
              </div>
            </button>
          </div>

          {/* 3. Global Pill Search Bar (Center, Desktop/Tablet >= sm) */}
          <div ref={searchContainerRef} className="relative hidden sm:flex flex-1 max-w-xl mx-2">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative flex w-full items-center">
                <Search className="pointer-events-none absolute left-4 h-4 w-4 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder="Search for groceries, atta, milk, aloo..."
                  aria-label="Search groceries and daily essentials"
                  className={cn(
                    'h-11 w-full rounded-full border border-border-subtle bg-surface-tile pl-11 pr-12 text-sm text-ink placeholder:text-ink-muted',
                    'transition-all duration-150 focus:bg-white focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20',
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-10 text-ink-muted hover:text-ink p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
            {renderSearchDropdown()}
          </div>

          {/* 4. User Actions */}
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            {isAuthenticated && <NotificationBell />}
            {/* Desktop Account / Login Action (strictly hidden on mobile < sm) */}
            <div className="hidden sm:flex items-center">
              {isAuthenticated && user ? (
                <DropdownMenu
                  align="right"
                  trigger={
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <span className="hidden lg:inline max-w-[120px] truncate">
                        {user.name || 'Account'}
                      </span>
                    </button>
                  }
                >
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-ink truncate">{user.name || 'Customer'}</p>
                    <p className="text-[11px] text-ink-muted truncate">{user.email}</p>
                  </div>
                  <DropdownDivider />
                  <DropdownItem href="/profile">My Profile</DropdownItem>
                  <DropdownItem href="/orders">My Orders</DropdownItem>
                  <DropdownItem href="/notifications">Notifications</DropdownItem>
                  <DropdownItem href="/addresses">Delivery Addresses</DropdownItem>
                  <DropdownItem href="/account">Account Settings</DropdownItem>
                  <DropdownDivider />
                  <DropdownItem href="/seller/login" className="text-brand font-bold">
                    Seller Portal
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem
                    destructive
                    icon={<LogOut className="h-4 w-4" />}
                    onClick={() => logout()}
                  >
                    Sign Out
                  </DropdownItem>
                </DropdownMenu>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <User className="h-5 w-5 text-ink" />
                  <span className="hidden lg:inline">Login</span>
                </Link>
              )}
            </div>

            {/* Desktop Basket Action */}
            <Link
              href="/basket"
              className="relative hidden sm:flex items-center gap-2 rounded-xl bg-brand/10 px-3.5 py-2 text-sm font-bold text-brand transition-all hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={`Shopping basket with ${itemCount} items`}
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Basket</span>
              {itemCount > 0 && (
                <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-cta text-xs font-black text-ink shadow-xs">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Basket Action */}
            <Link
              href="/basket"
              className="relative flex sm:hidden items-center justify-center p-2 rounded-xl text-ink hover:text-brand focus-visible:outline-none"
              aria-label={`Shopping basket with ${itemCount} items`}
            >
              <div className="relative">
                <ShoppingBag className="h-6 w-6 text-brand" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cta px-1 text-[10px] font-black text-ink shadow-xs">
                    {itemCount}
                  </span>
                )}
              </div>
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
        <div ref={mobileSearchContainerRef} className="relative px-4 pb-3 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              placeholder="Search groceries, doodh, atta..."
              aria-label="Search groceries"
              className="h-10 w-full rounded-full border border-border-subtle bg-surface-tile pl-10 pr-10 text-xs text-ink placeholder:text-ink-muted focus:bg-white focus:border-brand focus-visible:outline-none"
            />
            <button
              type="submit"
              aria-label="Submit mobile search"
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
          {renderSearchDropdown()}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TIER 2: SECONDARY CATEGORY & UTILITY LINKS STRIP                   */}
      {/* =================================================================== */}
      <div className="hidden md:block border-b border-border bg-white text-xs font-semibold">
        <div className="mx-auto flex h-11 max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
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
              {categoriesTree.length > 0 ? (
                categoriesTree.map((cat) => (
                  <Link key={cat.id} href={`/categories/${cat.slug}`}>
                    <DropdownItem>{cat.name}</DropdownItem>
                  </Link>
                ))
              ) : (
                <>
                  <Link href="/categories/fresh-produce">
                    <DropdownItem>Fresh Produce</DropdownItem>
                  </Link>
                  <Link href="/categories/dairy-bakery">
                    <DropdownItem>Dairy &amp; Bakery</DropdownItem>
                  </Link>
                  <Link href="/categories/groceries-kitchen">
                    <DropdownItem>Groceries &amp; Kitchen</DropdownItem>
                  </Link>
                  <Link href="/categories/snacks-drinks">
                    <DropdownItem>Snacks &amp; Drinks</DropdownItem>
                  </Link>
                  <Link href="/categories/personal-care">
                    <DropdownItem>Personal Care</DropdownItem>
                  </Link>
                </>
              )}
              <DropdownDivider />
              <Link href="/categories">
                <DropdownItem className="font-bold text-brand">
                  Explore All Categories →
                </DropdownItem>
              </Link>
            </DropdownMenu>

            <nav className="flex items-center gap-6">
              <Link
                href="/stores"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-brand" />
                <span>Nearby Stores</span>
              </Link>
              <Link
                href="/search?minDiscount=10&sort=discount_desc"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Percent className="h-3.5 w-3.5 text-brand" />
                <span>Offers</span>
              </Link>
              <Link
                href="/sell-on-marvels-basket"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-brand" />
                <span>Become a Seller</span>
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-1.5 text-ink-secondary hover:text-brand transition-colors"
              >
                <Truck className="h-3.5 w-3.5 text-brand" />
                <span>My Orders</span>
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

          <div className="text-[11px] text-ink-muted">
            {activeStore?.deliveryEtaLabel ? (
              <>
                Delivering from <strong className="text-ink">{activeStore.name}</strong> in{' '}
                <span className="font-bold text-brand">{activeStore.deliveryEtaLabel}</span>
              </>
            ) : (
              <span>Select delivery location for real-time store ETA</span>
            )}
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
              openLocationModal();
            }}
            className="mb-3 flex w-full items-center justify-between rounded-xl bg-surface p-2.5 text-xs font-semibold text-ink"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-brand shrink-0" />
              <span className="truncate">Deliver to: {locationDisplay}</span>
            </div>
            <span className="text-[11px] text-brand shrink-0">Change</span>
          </button>
          <nav className="flex flex-col space-y-2 text-sm font-semibold text-ink">
            {isAuthenticated && user ? (
              <div className="mb-2 rounded-xl bg-surface p-3">
                <p className="text-xs font-bold text-ink">{user.name || 'Customer'}</p>
                <p className="text-[11px] text-ink-muted">{user.email}</p>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-brand-dark"
              >
                <User className="h-4 w-4" />
                <span>Sign In / Register</span>
              </Link>
            )}

            {isAuthenticated && (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
                >
                  <User className="h-4 w-4 text-brand" />
                  <span>My Profile &amp; Account</span>
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
                >
                  <Package className="h-4 w-4 text-brand" />
                  <span>My Orders</span>
                </Link>
                <Link
                  href="/addresses"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
                >
                  <MapPin className="h-4 w-4 text-brand" />
                  <span>Delivery Addresses</span>
                </Link>
              </>
            )}

            <Link
              href="/basket"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <ShoppingBag className="h-4 w-4 text-brand" />
              <span>View Basket</span>
            </Link>
            <Link
              href="/stores"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <Store className="h-4 w-4 text-brand" />
              <span>Nearby Stores</span>
            </Link>
            <Link
              href="/categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 text-brand hover:bg-surface"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>All Categories</span>
            </Link>
            <Link
              href="/search?minDiscount=10&sort=discount_desc"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <Percent className="h-4 w-4 text-brand" />
              <span>Offers &amp; Deals</span>
            </Link>
            <Link
              href="/sell-on-marvels-basket"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <Store className="h-4 w-4 text-brand" />
              <span>Become a Seller</span>
            </Link>
            <Link
              href="/help"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface"
            >
              <HelpCircle className="h-4 w-4 text-brand" />
              <span>Help &amp; Support</span>
            </Link>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2.5 rounded-lg p-2 text-red-600 hover:bg-red-50 text-left font-bold"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Location Selection Dialog wired to LocationContext */}
      <LocationSelectorModal />
    </header>
  );
}
