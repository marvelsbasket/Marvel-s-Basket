'use client';

import React, { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import {
  InventoryService,
  MasterCatalogBrowseItem,
  MasterCatalogProductVariantItem,
} from '../services/inventory.service';
import {
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Tag,
  Boxes,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface CatalogBrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  onSuccess: () => void;
}

export function CatalogBrowseModal({
  isOpen,
  onClose,
  storeId,
  onSuccess,
}: CatalogBrowseModalProps) {
  const [items, setItems] = useState<MasterCatalogBrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MasterCatalogBrowseItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MasterCatalogProductVariantItem | null>(
    null,
  );

  // Form State
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [initialStock, setInitialStock] = useState<number | ''>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(5);
  const [sellerSku, setSellerSku] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async (q?: string) => {
    setLoading(true);
    try {
      const data = await InventoryService.browseMasterCatalog({
        search: q,
        storeId,
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
      setSelectedProduct(null);
      setSelectedVariant(null);
      setError(null);
    }
  }, [isOpen, storeId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog(search.trim());
  };

  const handleSelectVariant = (
    product: MasterCatalogBrowseItem,
    variant: MasterCatalogProductVariantItem,
  ) => {
    if (variant.isAlreadyListed) return;
    setSelectedProduct(product);
    setSelectedVariant(variant);
    setSellingPrice(variant.mrp); // Default to MRP
    setError(null);
  };

  const mrp = selectedVariant?.mrp ?? 0;
  const numPrice = typeof sellingPrice === 'number' ? sellingPrice : 0;
  const numStock = typeof initialStock === 'number' ? initialStock : 0;
  const numThreshold = typeof lowStockThreshold === 'number' ? lowStockThreshold : 5;

  const isPriceExceedingMrp = numPrice > mrp;
  const isPriceValid = numPrice > 0 && !isPriceExceedingMrp;
  const discountPercent =
    mrp > 0 && numPrice > 0 && numPrice < mrp ? Math.round(((mrp - numPrice) / mrp) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedVariant || !isPriceValid || numStock < 0) return;

    setSubmitting(true);
    setError(null);

    try {
      await InventoryService.createListing(storeId, {
        productId: selectedProduct.id,
        variantId: selectedVariant.id,
        sellingPrice: numPrice,
        initialStock: numStock,
        lowStockThreshold: numThreshold,
        sellerSku: sellerSku.trim() || undefined,
        status: numStock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add product to store inventory');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedVariant ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVariant(null)}
              className="h-7 px-2 text-xs text-ink-muted hover:text-ink"
            >
              ← Back to Catalog
            </Button>
            <span className="text-base font-bold text-ink">List Variant in Your Store</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="text-base font-bold text-ink">Browse Master Product Catalog</div>
            <p className="text-xs text-ink-muted">
              Select verified platform catalog products and map them to your store inventory.
            </p>
          </div>
        )
      }
      maxWidth="2xl"
    >
      <div className="pt-2">
        {selectedVariant && selectedProduct ? (
          /* Listing Configuration Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Product Summary */}
            <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-brand border border-emerald-100">
                <Tag className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink text-sm">{selectedProduct.name}</h4>
                  <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Verified Catalog
                  </Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  Variant: <span className="font-semibold text-ink">{selectedVariant.name}</span>
                  {selectedVariant.packSize && ` • ${selectedVariant.packSize}`}
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <span className="text-ink-muted">
                    Platform MRP:{' '}
                    <span className="font-bold text-ink">₹{selectedVariant.mrp.toFixed(2)}</span>
                  </span>
                  <span className="text-ink-muted">
                    SKU: <span className="font-mono text-ink">{selectedVariant.sku}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Price Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink">
                    Your Store Selling Price (₹) <span className="text-red-500">*</span>
                  </label>
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {discountPercent}% OFF MRP
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedVariant.mrp}
                  value={sellingPrice}
                  onChange={(e) =>
                    setSellingPrice(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  placeholder={`Max ₹${selectedVariant.mrp}`}
                  className={`h-9 text-xs ${
                    isPriceExceedingMrp ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  required
                />
                {isPriceExceedingMrp ? (
                  <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Selling price cannot exceed platform MRP (₹{selectedVariant.mrp}).
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-muted">
                    Must be &le; platform MRP (₹{selectedVariant.mrp.toFixed(2)}).
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Initial Stock on Hand <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) =>
                    setInitialStock(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  placeholder="e.g. 20"
                  className="h-9 text-xs"
                  required
                />
                <p className="text-[11px] text-ink-muted">
                  Physical units physically available on shelf in your store.
                </p>
              </div>
            </div>

            {/* Threshold & Custom SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Low Stock Alert Threshold</label>
                <Input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) =>
                    setLowStockThreshold(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  placeholder="5"
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-ink-muted">
                  Flag as low stock when units reach this quantity.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Your Internal SKU (Optional)
                </label>
                <Input
                  type="text"
                  value={sellerSku}
                  onChange={(e) => setSellerSku(e.target.value)}
                  placeholder="e.g., STORE-BIN-A4"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[11px] text-ink-muted">
                  Optional local warehouse/bin identifier.
                </p>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVariant(null)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isPriceValid || numStock < 0 || submitting}
                className="bg-brand text-white font-bold text-xs"
              >
                {submitting ? (
                  <Spinner size="sm" className="mr-1.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                Add to Store Inventory
              </Button>
            </div>
          </form>
        ) : (
          /* Catalog Browser List */
          <div className="space-y-3">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-ink-muted" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search catalog by product name, brand, or SKU..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
                Search
              </Button>
            </form>

            {/* Items List */}
            {loading ? (
              <div className="p-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-surface-subtle border border-border space-y-1">
                <Boxes className="w-8 h-8 mx-auto text-ink-muted opacity-50 mb-2" />
                <p className="text-xs font-bold text-ink">No catalog products found</p>
                <p className="text-[11px] text-ink-muted">
                  Try adjusting your search terms to discover platform master products.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                {items.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-xl border border-border bg-white shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-ink">{prod.name}</h4>
                        <p className="text-[11px] text-ink-muted">
                          {prod.category.name} {prod.brand?.name ? `• ${prod.brand.name}` : ''}
                        </p>
                      </div>
                      <Badge className="bg-surface-subtle text-ink-muted text-[10px] font-mono">
                        {prod.variants.length} {prod.variants.length === 1 ? 'Variant' : 'Variants'}
                      </Badge>
                    </div>

                    {/* Variants Rail */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border">
                      {prod.variants.map((v) => (
                        <div
                          key={v.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                            v.isAlreadyListed
                              ? 'bg-surface-subtle/50 border-border opacity-75'
                              : 'bg-white border-border hover:border-brand hover:shadow-xs'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-ink truncate text-[11px]">
                              {v.name}
                            </div>
                            <div className="text-[10px] text-ink-muted">
                              MRP: <span className="font-bold text-ink">₹{v.mrp.toFixed(2)}</span>
                              {v.packSize && ` • ${v.packSize}`}
                            </div>
                          </div>

                          {v.isAlreadyListed ? (
                            <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px] shrink-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Listed
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSelectVariant(prod, v)}
                              className="h-7 px-2.5 text-[11px] bg-brand text-white font-bold shrink-0"
                            >
                              Add to Store
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
