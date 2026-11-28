'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Ticket } from 'lucide-react';
import { AdminCouponItem, DiscountTypeValue } from '@marvels-basket/shared';
import { PromotionsService } from '@/features/promotions/services/promotions.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatINR } from '@/lib/utils/currency';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCouponItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountTypeValue>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrder, setMinOrder] = useState('199');
  const [maxDiscount, setMaxDiscount] = useState('100');
  const [usageLimit, setUsageLimit] = useState('');
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [stackable, setStackable] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await PromotionsService.listAdminCoupons({ limit: 50 });
      setCoupons(res.items);
    } catch {
      setFeedback('Failed to load platform coupons.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (c: AdminCouponItem) => {
    setBusyId(c.id);
    try {
      await PromotionsService.setCouponActive(c.id, !c.isActive);
      setFeedback(`Coupon ${c.code} ${!c.isActive ? 'activated' : 'paused'}.`);
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
      await PromotionsService.createCoupon({
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discountType,
        discountValue: Number(discountValue),
        minimumOrderAmount: Number(minOrder) || 0,
        maximumDiscount: maxDiscount.trim() ? Number(maxDiscount) : undefined,
        usageLimit: usageLimit.trim() ? Number(usageLimit) : undefined,
        firstOrderOnly,
        isStackableWithSellerDiscount: stackable,
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      setCreateOpen(false);
      setCode('');
      setDescription('');
      setFeedback('Platform coupon created!');
      await load();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Failed to create coupon.');
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Ticket className="h-6 w-6 text-brand" />
            Platform Coupons &amp; Promotions
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Manage platform-funded coupons, eligibility, stacking rules, and redemption limits.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/orders"
            className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
          >
            Back to Orders
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-brand text-white text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Coupon
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted">No platform coupons configured.</div>
        ) : (
          coupons.map((c) => (
            <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-ink">{c.code}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {c.isActive ? 'ACTIVE' : 'PAUSED'}
                  </span>
                  {c.firstOrderOnly && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      FIRST ORDER
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {c.discountType === 'PERCENTAGE'
                    ? `${c.discountValue}% OFF`
                    : `${formatINR(c.discountValue)} OFF`}{' '}
                  • Min Order {formatINR(c.minimumOrderAmount)}
                  {c.maximumDiscount ? ` • Max ${formatINR(c.maximumDiscount)}` : ''} • Used:{' '}
                  {c.currentUsageCount}
                  {c.usageLimit ? `/${c.usageLimit}` : ''}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={busyId === c.id}
                onClick={() => toggleActive(c)}
                className="text-xs font-bold"
              >
                {c.isActive ? 'Pause' : 'Activate'}
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Platform Coupon"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Coupon Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="FRESH15"
              className="w-full rounded-xl border border-border px-3 py-2 font-mono uppercase"
            />
          </div>
          <div>
            <label className="font-bold text-ink block mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="15% off on orders above ₹199"
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
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-bold text-ink block mb-1">Min Order (₹)</label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Max Disc (₹)</label>
              <input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Usage Limit</label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={firstOrderOnly}
                onChange={(e) => setFirstOrderOnly(e.target.checked)}
              />
              First Order Only
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={stackable}
                onChange={(e) => setStackable(e.target.checked)}
              />
              Stackable with Seller Discounts
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={createBusy}
              disabled={code.trim().length < 3}
              onClick={handleCreate}
              className="bg-brand text-white"
            >
              Create Coupon
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
