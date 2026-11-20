'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import {
  CatalogStoreMappingItem,
  CategoryTreeItem,
  ProductDetailItem,
  ProductStatus,
} from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { AdminCatalogService } from '@/features/catalog/services/admin-catalog.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/feedback/spinner';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);

  // Store Listings Modal
  const [storeListingsTarget, setStoreListingsTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [storeListings, setStoreListings] = useState<CatalogStoreMappingItem[]>([]);
  const [loadingStoreListings, setLoadingStoreListings] = useState(false);

  // Status Change Dialog
  const [statusChangeTarget, setStatusChangeTarget] = useState<ProductDetailItem | null>(null);
  const [targetNewStatus, setTargetNewStatus] = useState<ProductStatus>(ProductStatus.ACTIVE);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchCategories = () => {
    AdminCatalogService.listCategories()
      .then((data) => setCategories(data))
      .catch(() => {});
  };

  const fetchProducts = () => {
    setLoading(true);
    AdminCatalogService.listProducts({
      q: search || undefined,
      status: statusFilter ? (statusFilter as ProductStatus) : undefined,
      categoryId: categoryFilter || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        setProducts(res.items);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleOpenStoreListings = async (prod: ProductDetailItem) => {
    setStoreListingsTarget({ id: prod.id, name: prod.name });
    setLoadingStoreListings(true);
    try {
      const data = await AdminCatalogService.getStoreListings(prod.id);
      setStoreListings(data);
    } catch {
      setStoreListings([]);
    } finally {
      setLoadingStoreListings(false);
    }
  };

  const handleOpenStatusChange = (prod: ProductDetailItem) => {
    setStatusChangeTarget(prod);
    setTargetNewStatus(
      prod.status === ProductStatus.ACTIVE ? ProductStatus.INACTIVE : ProductStatus.ACTIVE,
    );
    setStatusError(null);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeTarget) return;

    setStatusUpdating(true);
    setStatusError(null);

    try {
      await AdminCatalogService.updateProductStatus(statusChangeTarget.id, {
        status: targetNewStatus,
      });
      setStatusChangeTarget(null);
      fetchProducts();
    } catch (err: any) {
      setStatusError(err.message || 'Failed to update product status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleArchive = async (prod: ProductDetailItem) => {
    if (
      !confirm(
        `Are you sure you want to archive master product '${prod.name}'? Existing customer orders will preserve their snapshots.`,
      )
    ) {
      return;
    }

    try {
      await AdminCatalogService.deleteProduct(prod.id);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to archive product');
    }
  };

  const getStatusBadge = (status: string | ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return (
          <Badge variant="brand" shape="pill" className="text-[11px] px-2.5 py-0.5">
            Active
          </Badge>
        );
      case ProductStatus.DRAFT:
        return (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
            Draft
          </span>
        );
      case ProductStatus.INACTIVE:
        return (
          <Badge variant="neutral" shape="pill" className="text-[11px] px-2.5 py-0.5">
            Inactive
          </Badge>
        );
      case ProductStatus.DISCONTINUED:
        return (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
            Discontinued
          </span>
        );
      case ProductStatus.ARCHIVED:
        return (
          <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
            Archived
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-stone-50 pb-16">
        {/* Navigation Bar */}
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-extrabold text-emerald-700">
                Marvel&apos;s Basket Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm font-semibold">
                <Link
                  href="/admin/categories"
                  className="rounded-lg px-3 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Categories
                </Link>
                <Link
                  href="/admin/products"
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800 font-bold"
                >
                  Master Products
                </Link>
                <Link
                  href="/admin/sellers"
                  className="rounded-lg px-3 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Seller Approvals
                </Link>
              </nav>
            </div>
            <div>
              <Link href="/admin/products/new">
                <Button variant="brand" className="flex items-center gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span>New Master Product</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900">
                Master Product Catalog
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Platform-wide master product records, attributes, variants, and store inventory
                mapping.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search products by title, SKU, or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </form>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-2xs focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DISCONTINUED">Discontinued</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-2xs focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              className="h-9 font-bold text-stone-600"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>

          {/* Products Table Card */}
          <Card className="border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-stone-200 bg-stone-50/80 text-stone-600 uppercase font-black tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Brand</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Variants</th>
                    <th className="px-4 py-3.5">MRP</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="h-64 text-center">
                        <Spinner size="lg" />
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-sm text-stone-500">
                        No master products found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((prod) => {
                      const primaryVariant = prod.variants?.[0];
                      const thumb = primaryVariant?.primaryImageUrl || null;

                      return (
                        <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                          {/* Image & Title */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-1 overflow-hidden">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={prod.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <ShoppingBag className="h-6 w-6 text-stone-300" />
                                )}
                              </div>
                              <div>
                                <Link
                                  href={`/admin/products/${prod.id}`}
                                  className="font-bold text-stone-900 text-sm hover:text-emerald-700 transition-colors line-clamp-1"
                                >
                                  {prod.name}
                                </Link>
                                <span className="text-[11px] text-stone-400">
                                  slug: {prod.slug}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Brand */}
                          <td className="px-4 py-4 font-semibold text-stone-700">
                            {prod.brand || (prod as any).brandRel?.name || '—'}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-4 font-semibold text-stone-700">
                            {prod.category?.name || '—'}
                          </td>

                          {/* Variants Count */}
                          <td className="px-4 py-4">
                            <span className="font-bold text-stone-800">
                              {prod.variants?.length || 0}
                            </span>
                            <span className="text-stone-400 text-[10px] ml-1">variants</span>
                          </td>

                          {/* MRP */}
                          <td className="px-4 py-4 font-extrabold text-stone-900">
                            ₹{primaryVariant?.mrp ?? 0}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">{getStatusBadge(prod.status)}</td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStoreListings(prod)}
                                title="Inspect Store Listings"
                                className="h-8 px-2.5 text-xs font-bold text-stone-700 hover:text-emerald-700 hover:border-emerald-300"
                              >
                                <Store className="h-3.5 w-3.5 mr-1" />
                                Stores
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusChange(prod)}
                                title="Change Status"
                                className="h-8 px-2 text-xs font-bold"
                              >
                                Status
                              </Button>

                              <Link href={`/admin/products/${prod.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit Master Product"
                                  className="h-8 w-8 p-0 text-stone-600 hover:text-stone-950"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(prod)}
                                title="Archive Product"
                                className="h-8 w-8 p-0 text-stone-400 hover:text-red-600"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50/60 px-6 py-3">
                <span className="text-xs text-stone-500 font-semibold">
                  Showing page {page} of {totalPages} ({totalCount} total products)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 text-xs font-bold"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 text-xs font-bold"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Modal: Store Inventory Listings Inspection */}
        {storeListingsTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-lg font-black text-stone-900">Store Inventory Listings</h2>
                  <p className="text-xs text-stone-500">
                    Product:{' '}
                    <span className="font-bold text-stone-800">{storeListingsTarget.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setStoreListingsTarget(null)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 overflow-y-auto flex-1">
                {loadingStoreListings ? (
                  <div className="flex h-32 items-center justify-center">
                    <Spinner size="md" />
                  </div>
                ) : storeListings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-500">
                    No active stores currently stock this master product.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      {storeListings.length} Mapped Store(s)
                    </div>
                    {storeListings.map((mapping, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">
                              {mapping.storeName}
                            </span>
                            <span className="text-xs text-stone-500">
                              ({mapping.storeCity || 'India'})
                            </span>
                            <Badge variant="brand" shape="pill" className="text-[10px] px-2 py-0">
                              {mapping.status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                            <span>
                              Selling Price:{' '}
                              <strong className="text-stone-900">₹{mapping.sellingPrice}</strong>
                            </span>
                            <span>MRP: ₹{mapping.mrp}</span>
                            <span>
                              Stock:{' '}
                              <strong className="text-emerald-700">
                                {mapping.availableStock} units
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-stone-100">
                <Button variant="outline" onClick={() => setStoreListingsTarget(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Product Status Transition */}
        {statusChangeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-black text-stone-900">Update Product Status</h2>
              <p className="mt-1 text-xs text-stone-500">
                Target: <span className="font-bold text-stone-800">{statusChangeTarget.name}</span>
              </p>

              {statusError && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{statusError}</span>
                </div>
              )}

              <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700">New Status</label>
                  <select
                    value={targetNewStatus}
                    onChange={(e) => setTargetNewStatus(e.target.value as ProductStatus)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800"
                  >
                    <option value={ProductStatus.ACTIVE}>ACTIVE (Publish to Storefront)</option>
                    <option value={ProductStatus.DRAFT}>DRAFT (In Preparation)</option>
                    <option value={ProductStatus.INACTIVE}>INACTIVE (Hidden)</option>
                    <option value={ProductStatus.DISCONTINUED}>DISCONTINUED (End of Life)</option>
                  </select>
                </div>

                {targetNewStatus === ProductStatus.ACTIVE && (
                  <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 leading-relaxed font-medium">
                    Publishing to ACTIVE enforces validations:
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>At least 1 active pack variant</li>
                      <li>Valid positive MRP (&gt; 0)</li>
                      <li>At least 1 primary product or variant image</li>
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStatusChangeTarget(null)}
                    disabled={statusUpdating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={statusUpdating}>
                    {statusUpdating ? 'Updating...' : 'Confirm Update'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
