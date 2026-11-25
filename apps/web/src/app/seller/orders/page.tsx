'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, Package, RefreshCw, Search, Truck, X } from 'lucide-react';
import { OrderDetailResponse, OrderStatusType, OrderSummaryItem } from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { OrdersService } from '@/features/orders/services/orders.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatINR } from '@/lib/utils/currency';

const STATUS_TABS: Array<{ key: OrderStatusType | 'ALL'; label: string }> = [
  { key: 'PENDING', label: 'New Orders' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [activeStatus, setActiveStatus] = useState<OrderStatusType | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetailResponse | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await OrdersService.listSellerOrders({
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        search: search.trim() || undefined,
        limit: 50,
      });
      setOrders(res.items);
      setStatusCounts(res.statusCounts || {});
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to load seller orders.');
    } finally {
      setIsLoading(false);
    }
  }, [activeStatus, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const runAction = async (orderId: string, fn: () => Promise<OrderDetailResponse>) => {
    setBusyOrderId(orderId);
    setErrorMsg(null);
    try {
      const updated = await fn();
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      await loadOrders();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <AuthGuard requiredRoles={['SELLER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-surface-tile/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/seller/inventory"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink hover:bg-surface"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-ink">Seller Orders &amp; Fulfillment</h1>
                <p className="text-xs text-muted">Accept, pack, and dispatch single-store orders</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Order # or customer..."
                  className="rounded-xl border border-border bg-white pl-9 pr-3 py-2 text-xs"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadOrders} className="bg-white">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map((t) => {
              const count = t.key === 'ALL' ? undefined : statusCounts[t.key] || 0;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveStatus(t.key)}
                  className={`rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                    activeStatus === t.key
                      ? 'bg-brand text-white'
                      : 'bg-white border border-border text-ink-2 hover:bg-surface'
                  }`}
                >
                  {t.label}
                  {count !== undefined ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-100" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center space-y-2">
              <Package className="mx-auto h-10 w-10 text-stone-300" />
              <p className="text-sm font-bold text-ink">No orders in this queue</p>
              <p className="text-xs text-muted">
                Orders matching the selected status will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-ink">{order.orderNumber}</span>
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-ink-2">
                        {order.status}
                      </span>
                      <span className="text-xs font-bold text-brand">
                        {formatINR(order.totalAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-2">
                      {order.customerName || 'Customer'} • {order.totalUnits} unit(s) •{' '}
                      {order.paymentMethod} ({order.paymentStatus})
                    </p>
                    <p className="text-[11px] text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const detail = await OrdersService.getSellerOrderDetail(order.id);
                        setSelectedOrder(detail);
                      }}
                    >
                      Inspect
                    </Button>

                    {order.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          isLoading={busyOrderId === order.id}
                          onClick={() =>
                            runAction(order.id, () => OrdersService.acceptOrder(order.id))
                          }
                          className="bg-brand hover:bg-forest text-white"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyOrderId === order.id}
                          onClick={() => {
                            setRejectTargetId(order.id);
                            setRejectReason('');
                          }}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        isLoading={busyOrderId === order.id}
                        onClick={() => runAction(order.id, () => OrdersService.packOrder(order.id))}
                        className="bg-brand hover:bg-forest text-white"
                      >
                        <Package className="h-3.5 w-3.5 mr-1" />
                        Mark Packed
                      </Button>
                    )}

                    {order.status === 'PACKED' && (
                      <Button
                        size="sm"
                        isLoading={busyOrderId === order.id}
                        onClick={() =>
                          runAction(order.id, () => OrdersService.dispatchOrder(order.id))
                        }
                        className="bg-brand hover:bg-forest text-white"
                      >
                        <Truck className="h-3.5 w-3.5 mr-1" />
                        Dispatch
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        <Dialog
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          maxWidth="lg"
          title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : 'Order Details'}
        >
          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-surface p-3 space-y-1">
                <p className="font-bold text-ink">Delivery Address</p>
                <p>
                  {selectedOrder.addressSnapshot.recipientName} •{' '}
                  {selectedOrder.addressSnapshot.phone}
                </p>
                <p className="text-ink-2">
                  {selectedOrder.addressSnapshot.addressLine1}, {selectedOrder.addressSnapshot.city}{' '}
                  - {selectedOrder.addressSnapshot.postalCode}
                </p>
                {selectedOrder.notes && (
                  <p className="text-amber-800 font-semibold">Note: {selectedOrder.notes}</p>
                )}
              </div>

              <div className="divide-y divide-border rounded-xl border border-border">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between p-3">
                    <div>
                      <p className="font-bold text-ink">{item.productNameSnapshot}</p>
                      <p className="text-muted">
                        {item.variantNameSnapshot || 'Standard'} • Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-ink">{formatINR(item.totalAmount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Dialog>

        {/* Reject Reason Dialog */}
        <Dialog
          isOpen={Boolean(rejectTargetId)}
          onClose={() => setRejectTargetId(null)}
          title="Reject Order"
          description="Provide a clear reason. Committed stock will be restored automatically."
          footer={
            <>
              <Button variant="outline" onClick={() => setRejectTargetId(null)}>
                Cancel
              </Button>
              <Button
                disabled={!rejectTargetId || rejectReason.trim().length < 3}
                isLoading={Boolean(rejectTargetId && busyOrderId === rejectTargetId)}
                onClick={async () => {
                  if (!rejectTargetId) return;
                  const target = rejectTargetId;
                  setRejectTargetId(null);
                  await runAction(target, () =>
                    OrdersService.rejectOrder(target, rejectReason.trim()),
                  );
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Rejection
              </Button>
            </>
          }
        >
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Reason for rejection (min 3 characters)..."
            className="w-full rounded-xl border border-border p-3 text-xs"
          />
        </Dialog>
      </div>
    </AuthGuard>
  );
}
