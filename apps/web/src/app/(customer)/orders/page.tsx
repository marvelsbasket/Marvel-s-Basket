'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Package, Search, Store } from 'lucide-react';
import { OrderStatusType, OrderSummaryItem } from '@marvels-basket/shared';
import { OrdersService } from '@/features/orders/services/orders.service';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';

type OrderTab = 'ACTIVE' | 'PAST' | 'CANCELLED';

const ACTIVE_STATUSES = new Set<OrderStatusType>([
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
]);
const CANCELLED_STATUSES = new Set<OrderStatusType>([
  'CANCELLED',
  'REJECTED',
  'FAILED',
  'REFUNDED',
]);

const STATUS_BADGE_MAP: Record<OrderStatusType, { label: string; className: string }> = {
  PENDING: { label: 'Awaiting Confirmation', className: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
  PACKED: { label: 'Packed', className: 'bg-indigo-100 text-indigo-800' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', className: 'bg-emerald-100 text-emerald-800' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-900' },
  CANCELLED: { label: 'Cancelled', className: 'bg-stone-100 text-stone-700' },
  REJECTED: { label: 'Rejected by Store', className: 'bg-red-100 text-red-800' },
  FAILED: { label: 'Delivery Failed', className: 'bg-red-100 text-red-800' },
  RETURN_REQUESTED: { label: 'Return Requested', className: 'bg-amber-100 text-amber-800' },
  REFUNDED: { label: 'Refunded', className: 'bg-stone-100 text-stone-700' },
};

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [tab, setTab] = useState<OrderTab>('ACTIVE');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await OrdersService.listCustomerOrders({
        limit: 50,
        search: search.trim() || undefined,
      });
      setOrders(res.items);
    } catch {
      setError('Unable to load your orders right now.');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (tab === 'ACTIVE') return ACTIVE_STATUSES.has(o.status);
      if (tab === 'CANCELLED') return CANCELLED_STATUSES.has(o.status);
      return !ACTIVE_STATUSES.has(o.status) && !CANCELLED_STATUSES.has(o.status);
    });
  }, [orders, tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">My Orders</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Track current grocery deliveries and view past supermarket orders.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or store..."
            className="w-full rounded-xl border border-border bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { key: 'ACTIVE', label: 'Active Orders' },
            { key: 'PAST', label: 'Past Orders' },
            { key: 'CANCELLED', label: 'Cancelled / Rejected' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-brand text-white'
                : 'bg-white border border-border text-ink-2 hover:bg-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Could not load orders" message={error} onRetry={loadOrders} />
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-6 sm:p-12 shadow-card">
          <EmptyState
            icon={<Package className="h-8 w-8 text-brand" />}
            title={
              tab === 'ACTIVE'
                ? 'No active orders'
                : tab === 'CANCELLED'
                  ? 'No cancelled orders'
                  : 'No past orders yet'
            }
            description="Discover verified local supermarkets near you for 10–30 minute express delivery."
            actionLabel="Start Shopping"
            onAction={() => router.push('/')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const badge = STATUS_BADGE_MAP[order.status] || {
              label: order.status,
              className: 'bg-stone-100 text-stone-700',
            };
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-2xl border border-border bg-white p-4 sm:p-5 hover:border-brand/40 hover:shadow-sm transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-ink">{order.orderNumber}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink-2 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-brand" />
                      {order.storeName}
                    </p>
                    <p className="text-[11px] text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-black text-ink">{formatINR(order.totalAmount)}</p>
                    <p className="text-[11px] text-muted">
                      {order.totalUnits} unit{order.totalUnits === 1 ? '' : 's'} •{' '}
                      {order.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {order.itemsPreview.map((item, idx) => {
                      const thumb = getOptimizedProductImage(item.imageUrl, 'thumb');
                      return (
                        <div
                          key={idx}
                          className="h-9 w-9 rounded-lg border border-border bg-surface-tile flex items-center justify-center overflow-hidden shrink-0"
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={item.productName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-stone-300" />
                          )}
                        </div>
                      );
                    })}
                    <span className="text-xs text-ink-2 truncate">
                      {order.itemsPreview.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand shrink-0">
                    View Details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
