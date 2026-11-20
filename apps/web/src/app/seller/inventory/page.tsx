'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { InventoryOverviewMetrics, SellerListingItem } from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { SellerService } from '@/features/seller/services/seller.service';
import { InventoryService } from '@/features/inventory/services/inventory.service';
import { InventoryOverviewCards } from '@/features/inventory/components/inventory-overview-cards';
import { CatalogBrowseModal } from '@/features/inventory/components/catalog-browse-modal';
import { AdjustStockModal } from '@/features/inventory/components/adjust-stock-modal';
import { StockHistoryModal } from '@/features/inventory/components/stock-history-modal';
import { EditPriceModal } from '@/features/inventory/components/edit-price-modal';
import { ReconciliationModal } from '@/features/inventory/components/reconciliation-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import {
  ArrowLeft,
  Search,
  Plus,
  Boxes,
  History,
  Pencil,
  Pause,
  Play,
  Scale,
  AlertTriangle,
  PackageX,
  ChevronLeft,
  ChevronRight,
  Store,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

export default function SellerInventoryPage() {
  const [store, setStore] = useState<{ id: string; storeDisplayName?: string } | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [metrics, setMetrics] = useState<InventoryOverviewMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Listings State
  const [listings, setListings] = useState<SellerListingItem[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals Target State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<SellerListingItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<SellerListingItem | null>(null);
  const [priceTarget, setPriceTarget] = useState<SellerListingItem | null>(null);

  // Load Store
  useEffect(() => {
    SellerService.getMyStore()
      .then((st) => {
        if (st && st.id) {
          setStore({
            id: st.id as string,
            storeDisplayName: (st.storeDisplayName as string) || 'My Store',
          });
        }
      })
      .catch(() => setStore(null))
      .finally(() => setStoreLoading(false));
  }, []);

  // Fetch Metrics
  const fetchMetrics = useCallback(async (storeId: string) => {
    setMetricsLoading(true);
    try {
      const data = await InventoryService.getOverview(storeId);
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch Listings
  const fetchListings = useCallback(
    async (storeId: string, p: number = 1) => {
      setListingsLoading(true);
      try {
        const res = await InventoryService.getListings(storeId, {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          isLowStock: lowStockFilter || undefined,
          page: p,
          limit: 15,
        });
        setListings(res.items);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalCount(res.total);
      } catch {
        setListings([]);
      } finally {
        setListingsLoading(false);
      }
    },
    [search, statusFilter, lowStockFilter],
  );

  useEffect(() => {
    if (store?.id) {
      fetchMetrics(store.id);
      fetchListings(store.id, page);
    }
  }, [store?.id, fetchMetrics, fetchListings, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (store?.id) {
      fetchListings(store.id, 1);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleToggleStatus = async (item: SellerListingItem) => {
    if (!store?.id) return;
    const nextStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await InventoryService.updateListingStatus(store.id, item.id, {
        status: nextStatus,
      });
      fetchListings(store.id, page);
      fetchMetrics(store.id);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleRefreshAll = () => {
    if (store?.id) {
      fetchMetrics(store.id);
      fetchListings(store.id, page);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-subtle py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link href="/seller/profile">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-ink">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Store Profile
                  </Button>
                </Link>
                <span className="text-ink-muted">/</span>
                <h1 className="text-xl font-black text-ink tracking-tight flex items-center gap-2">
                  <Store className="w-5 h-5 text-brand" />
                  Inventory &amp; Product Listings
                </h1>
              </div>
              <p className="text-xs text-ink-muted">
                {store?.storeDisplayName || 'Your Store'} &bull; Real-time physical inventory,
                reservations, pricing, and stock control.
              </p>
            </div>

            {store && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReconcileModalOpen(true)}
                  className="h-8 text-xs font-semibold border-border bg-white text-ink"
                >
                  <Scale className="w-3.5 h-3.5 mr-1 text-ink-muted" />
                  Reconcile Audit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="h-8 text-xs font-bold bg-brand text-white hover:bg-brand/90 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Product from Catalog
                </Button>
              </div>
            )}
          </div>

          {storeLoading ? (
            <Card className="border-border bg-white p-12 flex justify-center">
              <Spinner size="lg" />
            </Card>
          ) : !store ? (
            <Card className="border-border bg-white p-8 text-center space-y-3 shadow-xs">
              <PackageX className="w-10 h-10 mx-auto text-ink-muted opacity-50" />
              <h3 className="font-bold text-ink">Seller Store Not Activated</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Your store inventory becomes accessible once your seller application has been
                approved by the platform team.
              </p>
              <Link href="/seller/application">
                <Button size="sm" className="bg-brand text-white">
                  Check Onboarding Status
                </Button>
              </Link>
            </Card>
          ) : (
            <>
              {/* Aggregate Inventory Metrics Cards */}
              <InventoryOverviewCards metrics={metrics} loading={metricsLoading} />

              {/* Filter and Control Bar */}
              <Card className="border-border bg-white shadow-xs">
                <CardContent className="p-3.5">
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    {/* Search Input */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-ink-muted" />
                        <Input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search listed products by name, SKU..."
                          className="pl-8 h-9 text-xs"
                        />
                      </div>
                      <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
                        Search
                      </Button>
                    </form>

                    {/* Filter Tabs & Options */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-lg border border-border p-0.5 bg-surface-subtle text-xs">
                        {[
                          { label: 'All', value: '' },
                          { label: 'Active', value: 'ACTIVE' },
                          { label: 'Paused', value: 'PAUSED' },
                          { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
                        ].map((tab) => (
                          <button
                            key={tab.value}
                            type="button"
                            onClick={() => handleStatusFilterChange(tab.value)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                              statusFilter === tab.value
                                ? 'bg-white text-ink shadow-2xs'
                                : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant={lowStockFilter ? 'brand' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setLowStockFilter(!lowStockFilter);
                          setPage(1);
                        }}
                        className={`h-8 text-xs font-semibold ${
                          lowStockFilter ? 'bg-amber-600 text-white border-amber-600' : 'text-ink'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Low Stock Only
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshAll}
                        className="h-8 px-2 text-ink-muted hover:text-ink"
                        title="Refresh Inventory"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Listings Table & Cards */}
              <div className="border border-border rounded-xl bg-white shadow-xs overflow-hidden">
                {listingsLoading ? (
                  <div className="p-16 flex justify-center">
                    <Spinner size="lg" />
                  </div>
                ) : listings.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Boxes className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-ink text-sm">No Product Listings Found</h3>
                      <p className="text-xs text-ink-muted max-w-sm mx-auto">
                        {search || statusFilter || lowStockFilter
                          ? 'No listings match your search and filter criteria. Try clearing filters.'
                          : 'You have not added any products to your store inventory yet.'}
                      </p>
                    </div>
                    {!search && !statusFilter && !lowStockFilter && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsCatalogModalOpen(true)}
                        className="bg-brand text-white font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Products from Platform Catalog
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-subtle border-b border-border text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Product &amp; Variant</th>
                            <th className="py-3 px-3">MRP</th>
                            <th className="py-3 px-3">Store Price</th>
                            <th className="py-3 px-3 text-center">Physical On Hand</th>
                            <th className="py-3 px-3 text-center">Reserved</th>
                            <th className="py-3 px-3 text-center">Available</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {listings.map((item) => {
                            const isLow = item.isLowStock;
                            const isOut = item.availableStock === 0 || item.isOutOfStock;

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-surface-subtle/50 transition-colors"
                              >
                                {/* Product & Variant */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center shrink-0 overflow-hidden relative">
                                      {item.imageUrl ? (
                                        <Image
                                          src={item.imageUrl}
                                          alt={item.productName}
                                          fill
                                          className="object-contain p-1"
                                        />
                                      ) : (
                                        <ShoppingBag className="w-5 h-5 text-ink-muted/50" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-ink truncate max-w-[220px]">
                                        {item.productName}
                                      </div>
                                      <div className="text-[11px] text-ink-muted flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium text-ink">
                                          {item.variantName}
                                        </span>
                                        {item.packSize && <span>&bull; {item.packSize}</span>}
                                        {item.sellerSku && (
                                          <span className="font-mono text-[10px] bg-surface-subtle px-1 rounded">
                                            {item.sellerSku}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* MRP */}
                                <td className="py-3 px-3 whitespace-nowrap text-ink-muted font-medium">
                                  ₹{item.mrp.toFixed(2)}
                                </td>

                                {/* Store Selling Price */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-brand text-sm">
                                      ₹{item.sellingPrice.toFixed(2)}
                                    </span>
                                    {item.discountPercent > 0 && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                                        {item.discountPercent}% OFF
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setPriceTarget(item)}
                                      className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-subtle"
                                      title="Edit selling price"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Stock on Hand */}
                                <td className="py-3 px-3 text-center font-mono font-bold text-ink whitespace-nowrap">
                                  {item.stockOnHand}
                                </td>

                                {/* Reserved Units */}
                                <td className="py-3 px-3 text-center font-mono text-purple-700 font-semibold whitespace-nowrap">
                                  {item.reservedStock}
                                </td>

                                {/* Available to Sell */}
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <div className="flex flex-col items-center">
                                    <span
                                      className={`font-black font-mono text-sm ${
                                        isOut
                                          ? 'text-red-600'
                                          : isLow
                                            ? 'text-amber-600'
                                            : 'text-teal-600'
                                      }`}
                                    >
                                      {item.availableStock}
                                    </span>
                                    {isLow && !isOut && (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded uppercase tracking-wider">
                                        Low Stock
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  {item.status === 'ACTIVE' && (
                                    <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
                                      ACTIVE
                                    </Badge>
                                  )}
                                  {item.status === 'PAUSED' && (
                                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                                      PAUSED
                                    </Badge>
                                  )}
                                  {item.status === 'OUT_OF_STOCK' && (
                                    <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">
                                      OUT OF STOCK
                                    </Badge>
                                  )}
                                  {item.status === 'DISABLED' && (
                                    <Badge className="bg-surface-subtle text-ink-muted border border-border text-[10px]">
                                      DISABLED
                                    </Badge>
                                  )}
                                </td>

                                {/* Action Buttons */}
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setAdjustTarget(item)}
                                      className="h-7 px-2 text-[11px] font-bold text-ink border-border hover:border-brand"
                                    >
                                      <Boxes className="w-3 h-3 mr-1 text-brand" />
                                      Adjust Stock
                                    </Button>

                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setHistoryTarget(item)}
                                      className="h-7 px-2 text-[11px] text-ink-muted hover:text-ink"
                                      title="View Stock Audit History"
                                    >
                                      <History className="w-3.5 h-3.5" />
                                    </Button>

                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleToggleStatus(item)}
                                      className="h-7 px-2 text-[11px] text-ink-muted hover:text-ink"
                                      title={
                                        item.status === 'ACTIVE'
                                          ? 'Pause Listing'
                                          : 'Activate Listing'
                                      }
                                    >
                                      {item.status === 'ACTIVE' ? (
                                        <Pause className="w-3.5 h-3.5 text-amber-600" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 text-brand" />
                                      )}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="p-3 border-t border-border flex items-center justify-between text-xs bg-surface-subtle">
                        <span className="text-ink-muted">
                          Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, totalCount)} of{' '}
                          {totalCount} listings
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={page <= 1 || listingsLoading}
                            onClick={() => setPage(page - 1)}
                            className="h-7 px-2 text-xs"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={page >= totalPages || listingsLoading}
                            onClick={() => setPage(page + 1)}
                            className="h-7 px-2 text-xs"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Catalog Browse & Mapping Modal */}
          {store && (
            <CatalogBrowseModal
              isOpen={isCatalogModalOpen}
              onClose={() => setIsCatalogModalOpen(false)}
              storeId={store.id}
              onSuccess={() => {
                fetchListings(store.id, 1);
                fetchMetrics(store.id);
              }}
            />
          )}

          {/* Adjust Stock Modal */}
          {store && adjustTarget && (
            <AdjustStockModal
              isOpen={!!adjustTarget}
              onClose={() => setAdjustTarget(null)}
              listing={adjustTarget}
              storeId={store.id}
              onSuccess={() => {
                fetchListings(store.id, page);
                fetchMetrics(store.id);
              }}
            />
          )}

          {/* Stock History Modal */}
          {store && historyTarget && (
            <StockHistoryModal
              isOpen={!!historyTarget}
              onClose={() => setHistoryTarget(null)}
              listing={historyTarget}
              storeId={store.id}
            />
          )}

          {/* Edit Price Modal */}
          {store && priceTarget && (
            <EditPriceModal
              isOpen={!!priceTarget}
              onClose={() => setPriceTarget(null)}
              listing={priceTarget}
              storeId={store.id}
              onSuccess={() => {
                fetchListings(store.id, page);
                fetchMetrics(store.id);
              }}
            />
          )}

          {/* Audit Reconciliation Modal */}
          {store && isReconcileModalOpen && (
            <ReconciliationModal
              isOpen={isReconcileModalOpen}
              onClose={() => setIsReconcileModalOpen(false)}
              storeId={store.id}
            />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
