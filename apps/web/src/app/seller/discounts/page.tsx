'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Percent, Plus, RefreshCw, Tag } from 'lucide-react';
import {
  DiscountTypeValue,
  SellerDiscountStatusType,
  SellerProductDiscountItem,
} from '@marvels-basket/shared';
import { PromotionsService } from '@/features/promotions/services/promotions.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatINR } from '@/lib/utils/currency';

export default function SellerDiscountsPage() {
  const [discounts, setDiscounts] = useState<SellerProductDiscountItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [sellerProductId, setSellerProductId] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<DiscountTypeValue>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [expiresAt, setExpiresAt] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  );
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await PromotionsService.listSellerDiscounts({
        status: (statusFilter || undefined) as SellerDiscountStatusType | undefined,
        limit: 50,
      });
      setDiscounts(res.items);
    } catch {
      setFeedback('Failed to load seller product discounts.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLifecycle = async (id: string, action: 'activate' | 'pause' | 'end') => {
    setBusyId(id);
    setFeedback(null);
    try {
      if (action === 'activate') await PromotionsService.activateSellerDiscount(id);
      else if (action === 'pause') await PromotionsService.pauseSellerDiscount(id);
      else await PromotionsService.endSellerDiscount(id);
      setFeedback(`Discount ${action}d successfully.`);
      await load();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    setCreateBusy(true);
    setFeedback(null);
    try {
      await PromotionsService.createSellerDiscount({
        sellerProductId: sellerProductId.trim(),
        title: title.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      });
      setCreateOpen(false);
      setSellerProductId('');
      setTitle('');
      setFeedback('Product discount created!');
      await load();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Failed to create discount.');
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Percent className="h-6 w-6 text-brand" />
            Store Product Discounts
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Create seller-funded percentage or flat discounts on your own store listings.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/seller/inventory"
            className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
          >
            Inventory
          </Link>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-brand text-white text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Discount
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="PAUSED">PAUSED</option>
          <option value="DRAFT">DRAFT</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="ENDED">ENDED</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-white divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading discounts...</div>
        ) : discounts.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted space-y-2">
            <Tag className="mx-auto h-8 w-8 text-stone-300" />
            <p>No product discounts found.</p>
          </div>
        ) : (
          discounts.map((d) => (
            <div key={d.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-ink">
                    {d.productName} {d.packSize ? `(${d.packSize})` : ''}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {d.title ? `${d.title} • ` : ''}
                  {d.discountType === 'PERCENTAGE'
                    ? `${d.discountValue}% OFF`
                    : `${formatINR(d.discountValue)} OFF`}{' '}
                  • Base {formatINR(d.baseSellingPrice)} →{' '}
                  <strong className="text-brand">{formatINR(d.effectiveSellingPrice)}</strong> (MRP{' '}
                  {formatINR(d.mrp)})
                </p>
              </div>
              <div className="flex gap-2">
                {(d.status === 'PAUSED' || d.status === 'DRAFT') && (
                  <Button
                    type="button"
                    size="sm"
                    isLoading={busyId === d.id}
                    onClick={() => handleLifecycle(d.id, 'activate')}
                    className="bg-brand text-white text-xs font-bold"
                  >
                    Activate
                  </Button>
                )}
                {(d.status === 'ACTIVE' || d.status === 'SCHEDULED') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={busyId === d.id}
                    onClick={() => handleLifecycle(d.id, 'pause')}
                    className="text-xs font-bold"
                  >
                    Pause
                  </Button>
                )}
                {d.status !== 'ENDED' && d.status !== 'EXPIRED' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={busyId === d.id}
                    onClick={() => handleLifecycle(d.id, 'end')}
                    className="text-xs text-red-600 border-red-200 font-bold"
                  >
                    End
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Seller Product Discount"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Listing ID (UUID)</label>
            <input
              value={sellerProductId}
              onChange={(e) => setSellerProductId(e.target.value)}
              placeholder="SellerProduct UUID"
              className="w-full rounded-xl border border-border px-3 py-2"
            />
          </div>
          <div>
            <label className="font-bold text-ink block mb-1">Promo Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekend Fresh Deal"
              className="w-full rounded-xl border border-border px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-ink block mb-1">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountTypeValue)}
                className="w-full rounded-xl border border-border px-3 py-2"
              >
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                <option value="FLAT">FLAT (₹)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Value</label>
              <input
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-ink block mb-1">Starts At</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Expires At</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={createBusy}
              disabled={!sellerProductId.trim()}
              onClick={handleCreate}
              className="bg-brand text-white"
            >
              Create Discount
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
