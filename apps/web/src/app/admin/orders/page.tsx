'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  OrderComplaintItem,
  OrderComplaintStatusType,
  OrderDetailResponse,
  OrderStatusType,
  OrderSummaryItem,
} from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { OrdersService } from '@/features/orders/services/orders.service';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatINR } from '@/lib/utils/currency';
import { Search } from 'lucide-react';

export default function AdminOrdersPage() {
  const [tab, setTab] = useState<'ORDERS' | 'COMPLAINTS'>('ORDERS');
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [complaints, setComplaints] = useState<OrderComplaintItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusType | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailResponse | null>(null);
  const [interveneStatus, setInterveneStatus] = useState<OrderStatusType>('CANCELLED');
  const [interveneReason, setInterveneReason] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (tab === 'ORDERS') {
      const res = await OrdersService.adminListOrders({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        limit: 50,
      });
      setOrders(res.items);
    } else {
      const res = await OrdersService.adminListComplaints({ limit: 50 });
      setComplaints(res.items);
    }
  }, [tab, statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-surface-tile/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-ink">Admin Orders &amp; Complaints</h1>
              <p className="text-xs text-muted">
                Platform-wide order inspection, audited interventions, and complaint resolution
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={tab === 'ORDERS' ? 'primary' : 'outline'}
                onClick={() => setTab('ORDERS')}
              >
                Orders
              </Button>
              <Button
                size="sm"
                variant={tab === 'COMPLAINTS' ? 'primary' : 'outline'}
                onClick={() => setTab('COMPLAINTS')}
              >
                Complaints
              </Button>
            </div>
          </div>

          {tab === 'ORDERS' ? (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order #, store, or customer..."
                    className="w-full rounded-xl border border-border bg-white pl-9 pr-3 py-2 text-xs"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatusType | '')}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PACKED">PACKED</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="rounded-2xl border border-border bg-white divide-y divide-border">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-black text-ink">
                        {o.orderNumber} • <span className="text-brand">{o.status}</span>
                      </p>
                      <p className="text-muted">
                        {o.storeName} • {o.customerName || 'Customer'} • {formatINR(o.totalAmount)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const detail = await OrdersService.adminGetOrderDetail(o.id);
                        setSelectedOrder(detail);
                        setInterveneReason('');
                      }}
                    >
                      Inspect &amp; Intervene
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-white divide-y divide-border">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-ink">
                      {c.orderNumber || c.orderId} • {c.category.replace(/_/g, ' ')} •{' '}
                      <span className="text-brand">{c.status}</span>
                    </p>
                    <p className="text-ink-2">{c.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {(
                      [
                        'UNDER_REVIEW',
                        'APPROVED',
                        'REJECTED',
                        'RESOLVED',
                      ] as OrderComplaintStatusType[]
                    ).map((st) => (
                      <Button
                        key={st}
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await OrdersService.adminReviewComplaint(c.id, st, `Reviewed as ${st}`);
                          await loadData();
                        }}
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          maxWidth="lg"
          title={selectedOrder ? `Admin Inspect: ${selectedOrder.orderNumber}` : 'Order'}
        >
          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-surface p-3 space-y-1">
                <p className="font-bold">Status History</p>
                {selectedOrder.statusHistory.map((h) => (
                  <p key={h.id} className="text-ink-2">
                    {h.previousStatus} → <strong>{h.newStatus}</strong> ({h.actorRole || 'SYSTEM'})
                    {h.note ? ` — ${h.note}` : ''}
                  </p>
                ))}
              </div>

              <div className="rounded-xl border border-border p-3 space-y-2">
                <p className="font-bold">Audited Manual Intervention</p>
                <select
                  value={interveneStatus}
                  onChange={(e) => setInterveneStatus(e.target.value as OrderStatusType)}
                  className="w-full rounded-lg border border-border p-2"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PACKED">PACKED</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <textarea
                  value={interveneReason}
                  onChange={(e) => setInterveneReason(e.target.value)}
                  placeholder="Mandatory audit reason..."
                  rows={2}
                  className="w-full rounded-lg border border-border p-2"
                />
                <Button
                  size="sm"
                  isLoading={busy}
                  disabled={interveneReason.trim().length < 3}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const updated = await OrdersService.adminInterveneOrder(
                        selectedOrder.id,
                        interveneStatus,
                        interveneReason.trim(),
                      );
                      setSelectedOrder(updated);
                      setInterveneReason('');
                      await loadData();
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="bg-brand text-white"
                >
                  Apply Intervention
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </AuthGuard>
  );
}
