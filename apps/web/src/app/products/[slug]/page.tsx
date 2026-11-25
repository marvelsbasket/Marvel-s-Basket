'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Zap,
} from 'lucide-react';
import {
  FoodPreference,
  ProductCardItem,
  ProductDetailItem,
  ProductVariantItem,
} from '@marvels-basket/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { ProductCard } from '@/features/catalog/components/product-card';
import { CatalogService } from '@/features/catalog/services/catalog.service';
import { useLocation } from '@/features/location/context/location-context';
import { useBasket } from '@/features/basket/context/basket-context';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { calculateDiscountPercent, calculateSavings, formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';
import { cn } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { isHydrated, location, activeStore, hasLocationContext, openLocationModal } =
    useLocation();
  const { addItem, updateQuantity, getItemQuantity, notify } = useBasket();

  const [product, setProduct] = useState<ProductDetailItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAdd, setIsCheckingAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'nutrition' | 'compliance'>('overview');

  const [stalePriceAlert, setStalePriceAlert] = useState<{
    oldPrice: number;
    newPrice: number;
    latestVariant: ProductVariantItem;
    latestProduct: ProductDetailItem;
  } | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    async function loadProduct() {
      setIsLoading(true);
      try {
        const data = await CatalogService.getProductBySlug(slug, {
          storeId: activeStore?.id,
          postalCode: location?.postalCode ?? undefined,
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
        });
        if (cancelled) return;

        setProduct(data);

        // Select first available variant by default, or fall back to first active variant
        const firstAvailable =
          data.variants?.find((v) => v.isAvailable !== false && (v.availableQuantity ?? 0) > 0) ||
          data.variants?.[0] ||
          null;
        setSelectedVariant(firstAvailable);

        const initialImg =
          firstAvailable?.primaryImageUrl ||
          firstAvailable?.images?.[0]?.imageUrl ||
          data.images?.[0]?.imageUrl ||
          null;
        setSelectedImage(initialImg);

        if (data.category?.id) {
          const related = await CatalogService.getProducts({
            categoryId: data.category.id,
            limit: 4,
            storeId: activeStore?.id,
            postalCode: location?.postalCode ?? undefined,
            latitude: location?.latitude ?? undefined,
            longitude: location?.longitude ?? undefined,
          });
          if (!cancelled) {
            setRelatedProducts(related.items.filter((item) => item.id !== data.id));
          }
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [
    slug,
    isHydrated,
    activeStore?.id,
    location?.postalCode,
    location?.latitude,
    location?.longitude,
  ]);

  const handleVariantSelect = (v: ProductVariantItem) => {
    setSelectedVariant(v);
    if (v.primaryImageUrl) {
      setSelectedImage(v.primaryImageUrl);
    } else if (v.images && v.images.length > 0) {
      setSelectedImage(v.images[0].imageUrl);
    }
  };

  if (isLoading) {
    return (
      <StorefrontLayout>
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="h-96 animate-pulse rounded-3xl bg-stone-100" />
            <div className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded-md bg-stone-100" />
              <div className="h-10 w-3/4 animate-pulse rounded-md bg-stone-100" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-stone-100" />
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!product) {
    return (
      <StorefrontLayout>
        <div className="mx-auto max-w-container px-4 py-16 text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-stone-300" />
          <h1 className="mt-4 text-xl font-bold text-stone-900">Product Not Found</h1>
          <p className="mt-2 text-sm text-stone-500">
            This item may be discontinued or unavailable in your delivery zone.
          </p>
          <Link
            href="/categories"
            className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Explore Catalog
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const mrp = selectedVariant?.mrp ?? 0;
  const sellingPrice = selectedVariant?.sellingPrice ?? mrp;
  const discountPercent =
    selectedVariant?.discountPercent ?? calculateDiscountPercent(mrp, sellingPrice);
  const savingsAmount = calculateSavings(mrp, sellingPrice);

  const resolvedStore =
    product.store ??
    (activeStore
      ? {
          id: activeStore.id,
          name: activeStore.name,
          slug: activeStore.slug,
          deliveryTimeMinutes: activeStore.deliveryTimeMinutes,
          deliveryEtaLabel: activeStore.deliveryEtaLabel,
          isOpen: activeStore.isOpen,
          isAcceptingOrders: activeStore.isAcceptingOrders,
        }
      : null);

  const hasStoreOffer = Boolean(resolvedStore && selectedVariant?.sellerProductId);
  const availableStock = selectedVariant?.availableQuantity ?? 0;
  const isAvailable = hasStoreOffer && selectedVariant?.isAvailable !== false && availableStock > 0;
  const lowStockThreshold = selectedVariant?.lowStockThreshold ?? 5;
  const isLowStock =
    isAvailable && (selectedVariant?.isLowStock || availableStock <= lowStockThreshold);

  const quantity = selectedVariant
    ? getItemQuantity(selectedVariant.sellerProductId, selectedVariant.id)
    : 0;

  const allImages = [
    ...(selectedVariant?.primaryImageUrl ? [selectedVariant.primaryImageUrl] : []),
    ...(selectedVariant?.images?.map((img) => img.imageUrl) || []),
    ...(product.images?.map((img: { imageUrl: string }) => img.imageUrl) || []),
    ...(product.variants?.flatMap((v) => v.images?.map((img) => img.imageUrl) || []) || []),
  ].filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx);

  const heroImageUrl = getOptimizedProductImage(selectedImage, 'detail');

  const commitAddToBasket = async (
    targetProduct: ProductDetailItem,
    targetVariant: ProductVariantItem,
  ) => {
    const store = targetProduct.store ?? resolvedStore;
    if (!store || !targetVariant.sellerProductId) return;

    await addItem({
      sellerProductId: targetVariant.sellerProductId,
      productId: targetProduct.id,
      variantId: targetVariant.id,
      productName: targetProduct.name,
      productSlug: targetProduct.slug,
      brand: targetProduct.brand,
      packSize: targetVariant.packSize || targetVariant.name,
      imageUrl: targetVariant.primaryImageUrl || targetProduct.images?.[0]?.imageUrl || null,
      unitPrice: targetVariant.sellingPrice ?? targetVariant.mrp,
      mrp: targetVariant.mrp,
      availableQuantity: targetVariant.availableQuantity ?? 0,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug || '',
        deliveryEtaLabel: store.deliveryEtaLabel ?? null,
        deliveryTimeMinutes: store.deliveryTimeMinutes ?? null,
        isOpen: store.isOpen ?? true,
        isAcceptingOrders: store.isAcceptingOrders ?? true,
      },
      quantity: 1,
    });
  };

  const handleAddWithFreshCheck = async () => {
    if (!selectedVariant || !resolvedStore) {
      openLocationModal();
      return;
    }

    if (quantity > 0 && selectedVariant.sellerProductId) {
      await updateQuantity(selectedVariant.sellerProductId, quantity + 1, {
        availableQuantity: availableStock,
      });
      return;
    }

    // Re-fetch live price & stock right before initial add to prevent stale pricing
    setIsCheckingAdd(true);
    try {
      const fresh = await CatalogService.getProductBySlug(slug, {
        storeId: resolvedStore.id,
        postalCode: location?.postalCode ?? undefined,
        latitude: location?.latitude ?? undefined,
        longitude: location?.longitude ?? undefined,
      });
      const freshVariant =
        fresh.variants.find((v) => v.id === selectedVariant.id) || selectedVariant;

      setProduct(fresh);
      setSelectedVariant(freshVariant);

      const freshQty = freshVariant.availableQuantity ?? 0;
      if (freshQty <= 0 || freshVariant.isAvailable === false || !freshVariant.sellerProductId) {
        notify(`"${fresh.name}" just went out of stock at this store.`, 'error');
        return;
      }

      const freshPrice = freshVariant.sellingPrice ?? freshVariant.mrp;
      if (Math.abs(freshPrice - sellingPrice) >= 0.01) {
        setStalePriceAlert({
          oldPrice: sellingPrice,
          newPrice: freshPrice,
          latestVariant: freshVariant,
          latestProduct: fresh,
        });
        return;
      }

      await commitAddToBasket(fresh, freshVariant);
    } catch {
      // Fallback to direct add if live check fails transiently
      await commitAddToBasket(product, selectedVariant);
    } finally {
      setIsCheckingAdd(false);
    }
  };

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-1.5 text-xs font-medium text-stone-500 overflow-x-auto no-scrollbar"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors shrink-0">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
          <Link href="/categories" className="hover:text-emerald-700 transition-colors shrink-0">
            Categories
          </Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
              <Link
                href={`/categories/${product.category.slug}`}
                className="hover:text-emerald-700 transition-colors shrink-0"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
          <span className="font-bold text-stone-900 shrink-0 line-clamp-1">{product.name}</span>
        </nav>

        {/* 2-Column Product Detail Layout */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {/* LEFT: Image Gallery */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative aspect-square w-full max-h-[420px] md:max-h-[480px] overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs flex items-center justify-center">
              {discountPercent > 0 && (
                <div className="absolute left-4 top-4 z-10 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-xs">
                  {discountPercent}% OFF
                </div>
              )}

              {product.foodPreference &&
                product.foodPreference !== 'NA' &&
                product.foodPreference !== FoodPreference.NA && (
                  <div className="absolute right-4 top-4 z-10">
                    {product.foodPreference === 'VEG' ||
                    product.foodPreference === FoodPreference.VEG ? (
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-xs border border-emerald-600 bg-white shadow-2xs"
                        title="Vegetarian"
                      >
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      </div>
                    ) : product.foodPreference === 'NON_VEG' ||
                      product.foodPreference === FoodPreference.NON_VEG ? (
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-xs border border-red-600 bg-white shadow-2xs"
                        title="Non-Vegetarian"
                      >
                        <div className="h-0 w-0 border-x-3.5 border-x-transparent border-b-7 border-b-red-600" />
                      </div>
                    ) : null}
                  </div>
                )}

              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <ShoppingBag className="h-24 w-24 text-stone-300" />
              )}
            </div>

            {/* Thumbnail Strip (Compact Sizing preserved) */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1 no-scrollbar">
                {allImages.map((imgUrl, idx) => {
                  const isActive = selectedImage === imgUrl;
                  const thumbUrl = getOptimizedProductImage(imgUrl, 'thumb') || imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      onMouseEnter={() => setSelectedImage(imgUrl)}
                      aria-label={`${product.name} thumbnail ${idx + 1}`}
                      className={cn(
                        'group relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-white p-1 transition-all duration-150 cursor-pointer flex items-center justify-center',
                        isActive
                          ? 'border-2 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs opacity-100 scale-102'
                          : 'border border-stone-200/90 hover:border-emerald-400 opacity-60 hover:opacity-100',
                      )}
                    >
                      <img
                        src={thumbUrl}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Product Meta, Variants, & Action */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                {product.brand && (
                  <div className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-stone-600">
                    {product.brand}
                  </div>
                )}
                <h1 className="mt-2 text-2xl font-black text-stone-900 sm:text-3xl tracking-tight">
                  {product.name}
                </h1>
                {product.shortDescription && (
                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                    {product.shortDescription}
                  </p>
                )}
              </div>

              {/* Pack Size / Variant Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Select Pack Size
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const varMrp = v.mrp;
                      const varPrice = v.sellingPrice ?? varMrp;
                      const varDisc =
                        v.discountPercent ?? calculateDiscountPercent(varMrp, varPrice);
                      const varOut =
                        hasLocationContext &&
                        resolvedStore &&
                        (v.isAvailable === false || (v.availableQuantity ?? 0) <= 0);

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVariantSelect(v)}
                          className={cn(
                            'flex flex-col rounded-xl border p-3 text-left transition-all',
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600 shadow-2xs'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                            varOut && 'opacity-65',
                          )}
                        >
                          <span className="text-xs font-bold text-stone-900">
                            {v.packSize || v.name}
                          </span>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-sm font-extrabold text-stone-950">
                              {formatINR(varPrice)}
                            </span>
                            {varMrp > varPrice && (
                              <span className="text-[10px] text-stone-400 line-through">
                                {formatINR(varMrp)}
                              </span>
                            )}
                          </div>
                          {varDisc > 0 && (
                            <span className="mt-0.5 text-[9px] font-black text-emerald-700">
                              {varDisc}% OFF
                            </span>
                          )}
                          {varOut && (
                            <span className="mt-0.5 text-[9px] font-bold text-red-600">
                              Out of stock
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Row */}
              <div className="rounded-2xl border border-stone-100 bg-stone-50/80 p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-black text-stone-950">
                    {formatINR(sellingPrice)}
                  </span>
                  {mrp > sellingPrice && (
                    <span className="text-lg text-stone-400 line-through">{formatINR(mrp)}</span>
                  )}
                  {savingsAmount > 0 && (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                      Save {formatINR(savingsAmount)} ({discountPercent}% OFF)
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-stone-500">
                  <span>
                    {resolvedStore
                      ? 'Inclusive of all taxes'
                      : 'Catalog MRP (Set area for store offer)'}
                  </span>
                  {isLowStock && (
                    <span className="font-bold text-amber-700">
                      Only {availableStock} left at this store!
                    </span>
                  )}
                </div>
              </div>

              {/* Store & Hyperlocal Delivery Assurance Badge */}
              {resolvedStore ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 space-y-2">
                  {resolvedStore.deliveryEtaLabel && (
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
                      <Zap className="h-4 w-4 fill-amber-400 text-amber-500" />
                      <span>Hyperlocal Delivery in {resolvedStore.deliveryEtaLabel}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <div className="flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-stone-400" />
                      <span>
                        Fulfilled by{' '}
                        <Link
                          href={`/stores/${resolvedStore.slug}`}
                          className="font-bold text-brand hover:underline"
                        >
                          {resolvedStore.name}
                        </Link>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={openLocationModal}
                      className="text-[11px] font-bold text-brand hover:underline"
                    >
                      Switch store
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-amber-900">
                    <MapPin className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      {hasLocationContext
                        ? `No local store delivers to ${location?.displayLocation} yet.`
                        : 'Select your delivery location to see local store availability and ETA.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openLocationModal}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-forest shrink-0"
                  >
                    Set Area
                  </button>
                </div>
              )}
            </div>

            {/* Quantity & Add to Basket Controls */}
            <div className="pt-4 border-t border-stone-100">
              {!resolvedStore ? (
                <Button
                  type="button"
                  onClick={openLocationModal}
                  className="w-full py-4 rounded-2xl bg-brand hover:bg-forest text-white font-black"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Select Delivery Location to Add
                </Button>
              ) : !isAvailable ? (
                <div className="flex items-center gap-2 rounded-xl bg-stone-100 p-3.5 text-sm font-bold text-stone-500">
                  <AlertCircle className="h-5 w-5 text-stone-400" />
                  <span>
                    Out of stock at {resolvedStore.name}. Switch store or check another pack.
                  </span>
                </div>
              ) : quantity === 0 ? (
                <Button
                  type="button"
                  onClick={handleAddWithFreshCheck}
                  isLoading={isCheckingAdd}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-black uppercase tracking-wider text-white shadow-md hover:bg-emerald-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add to Basket — {formatINR(sellingPrice)}</span>
                </Button>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-2">
                  <span className="pl-3 text-xs font-extrabold text-emerald-900">
                    In Basket ({quantity} of {availableStock} available):
                  </span>
                  <div className="flex items-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedVariant?.sellerProductId) {
                          updateQuantity(selectedVariant.sellerProductId, quantity - 1, {
                            availableQuantity: availableStock,
                          });
                        }
                      }}
                      aria-label="Decrease quantity"
                      className="flex h-10 w-10 items-center justify-center rounded-l-xl hover:bg-emerald-700 active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 text-sm font-black">{quantity}</span>
                    <button
                      type="button"
                      onClick={handleAddWithFreshCheck}
                      disabled={quantity >= availableStock}
                      aria-label="Increase quantity"
                      className="flex h-10 w-10 items-center justify-center rounded-r-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Product Details: Overview, Nutrition, Compliance */}
        <section className="mt-12 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <div className="flex border-b border-stone-200 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'border-b-2 px-5 py-3 text-sm font-extrabold transition-colors whitespace-nowrap',
                activeTab === 'overview'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )}
            >
              Overview &amp; Usage
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={cn(
                'border-b-2 px-5 py-3 text-sm font-extrabold transition-colors whitespace-nowrap',
                activeTab === 'nutrition'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )}
            >
              Nutritional Facts &amp; Ingredients
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={cn(
                'border-b-2 px-5 py-3 text-sm font-extrabold transition-colors whitespace-nowrap',
                activeTab === 'compliance'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )}
            >
              Legal &amp; Seller Info
            </button>
          </div>

          <div className="pt-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-600" />
                    About This Product
                  </h2>
                  <p className="mt-2 text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                    {product.description || product.shortDescription || 'No description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4 border-t border-stone-100">
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3.5">
                    <Clock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase text-stone-400">Shelf Life</div>
                      <div className="text-sm font-semibold text-stone-800">
                        {product.shelfLife || 'Check physical packaging'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3.5">
                    <Package className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase text-stone-400">Storage</div>
                      <div className="text-sm font-semibold text-stone-800">
                        {product.storageInstructions || 'Store in a cool, dry place'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase text-stone-400">
                        Country of Origin
                      </div>
                      <div className="text-sm font-semibold text-stone-800">
                        {product.countryOfOrigin || 'India'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                {product.ingredients && (
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Key Ingredients</h3>
                    <p className="mt-1.5 text-sm text-stone-600">{product.ingredients}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-stone-900">Nutritional Information</h3>
                  {product.nutritionalInfo && Object.keys(product.nutritionalInfo).length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 text-stone-700">
                          <tr>
                            <th className="px-4 py-2.5 font-bold">Nutrient</th>
                            <th className="px-4 py-2.5 font-bold">Per 100g / 100ml</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {Object.entries(product.nutritionalInfo).map(([key, val]) => (
                            <tr key={key}>
                              <td className="px-4 py-2 text-stone-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1')}
                              </td>
                              <td className="px-4 py-2 font-bold text-stone-900">{String(val)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">
                      Refer to physical product packaging for detailed nutritional panel.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="font-bold text-stone-900">Manufacturer Details: </span>
                  <span className="text-stone-600">
                    {product.manufacturerDetails || 'Refer to physical pack'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-stone-900">Packer Details: </span>
                  <span className="text-stone-600">
                    {product.packerDetails || 'Refer to physical pack'}
                  </span>
                </div>
                {resolvedStore && (
                  <div>
                    <span className="font-bold text-stone-900">Sold By: </span>
                    <Link
                      href={`/stores/${resolvedStore.slug}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {resolvedStore.name}
                    </Link>
                  </div>
                )}
                <div className="pt-2 text-xs text-stone-400">
                  Disclaimer: Packaging labels, ingredients, and net weights are subject to batch
                  updates by manufacturers. Check the delivered physical unit before consumption.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-black text-stone-900 sm:text-2xl tracking-tight">
              More in this Category
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Live Price Update Confirmation Modal */}
      <Dialog
        isOpen={Boolean(stalePriceAlert)}
        onClose={() => setStalePriceAlert(null)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2 text-ink">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span>Price Updated at Store</span>
          </div>
        }
        description="The store updated this item's selling price since the page loaded."
        footer={
          <>
            <Button variant="outline" onClick={() => setStalePriceAlert(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-brand hover:bg-forest text-white"
              onClick={async () => {
                if (!stalePriceAlert) return;
                const { latestProduct, latestVariant } = stalePriceAlert;
                setStalePriceAlert(null);
                await commitAddToBasket(latestProduct, latestVariant);
              }}
            >
              Add at {stalePriceAlert ? formatINR(stalePriceAlert.newPrice) : ''}
            </Button>
          </>
        }
      >
        {stalePriceAlert && (
          <p className="text-sm text-ink-secondary">
            Price changed from{' '}
            <strong className="line-through text-muted">
              {formatINR(stalePriceAlert.oldPrice)}
            </strong>{' '}
            to <strong className="text-brand">{formatINR(stalePriceAlert.newPrice)}</strong>.
          </p>
        )}
      </Dialog>
    </StorefrontLayout>
  );
}
