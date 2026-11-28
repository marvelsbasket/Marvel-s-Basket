'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Truck, UserCheck } from 'lucide-react';
import {
  DeliveryDetailResponse,
  DeliveryPartnerSummary,
  DeliveryStatusType,
  DeliverySummaryItem,
} from '@marvels-basket/shared';
import { DeliveryService } from '@/features/delivery/services/delivery.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils/currency';

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliverySummaryItem[]>([]);
  const [partners, setPartners] = useState<DeliveryPartnerSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<DeliveryDetailResponse | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [delRes, partRes] = await Promise.all([
        DeliveryService.listAdminDeliveries({
          status: (statusFilter || undefined) as DeliveryStatusType | undefined,
          limit: 30,
        }),
        DeliveryService.listDeliveryPartners(),
      ]);
      setDeliveries(delRes.items);
      setPartners(partRes.items);
      if (partRes.items.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(partRes.items[0].id);
      }
    } catch {
      setFeedback('Failed to load deliveries.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedPartnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const inspect = async (deliveryId: string) => {
    const detail = await DeliveryService.getAdminDeliveryDetail(deliveryId);
    setSelectedDetail(detail);
  };

  const handleAssign = async (isReassign: boolean) => {
    if (!selectedDetail || !selectedPartnerId) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (isReassign) {
        await DeliveryService.reassignDelivery(
          selectedDetail.id,
          selectedPartnerId,
          'Admin operational reassignment',
        );
        setFeedback('Delivery partner reassigned.');
      } else {
        await DeliveryService.assignDelivery(selectedDetail.id, selectedPartnerId);
        setFeedback('Delivery partner assigned.');
      }
      await load();
      await inspect(selectedDetail.id);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Assignment failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand" />
            Admin Delivery Operations
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Assign verified riders, inspect delivery timelines, and manage fulfillment exceptions.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
        >
          Back to Orders
        </Link>
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
          <option value="PENDING">PENDING</option>
          <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="FAILED">FAILED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted">Loading deliveries...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">No deliveries found.</div>
          ) : (
            deliveries.map((d) => (
              <div key={d.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-ink">{d.orderNumber}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {d.storeName} → {d.customerName || 'Customer'} • {formatINR(d.orderTotal)}
                  </p>
                  {d.deliveryPartner && (
                    <p className="text-xs text-brand font-semibold">
                      Rider: {d.deliveryPartner.name} ({d.deliveryPartner.availabilityStatus})
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => inspect(d.id)}
                  className="bg-brand text-white text-xs font-bold"
                >
                  Inspect
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 space-y-4 h-fit">
          {!selectedDetail ? (
            <p className="text-xs text-muted text-center py-8">
              Select a delivery to assign a rider or inspect history.
            </p>
          ) : (
            <>
              <div>
                <h2 className="text-base font-black text-ink">{selectedDetail.orderNumber}</h2>
                <p className="text-xs text-muted">
                  Status: <strong>{selectedDetail.status}</strong> • Attempts:{' '}
                  {selectedDetail.attemptCount}/{selectedDetail.maxAttempts}
                </p>
              </div>

              {selectedDetail.status !== 'DELIVERED' && selectedDetail.status !== 'CANCELLED' && (
                <div className="space-y-2 border-t border-border pt-3">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-brand" />
                    Assign / Reassign Partner
                  </label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-xs"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.vehicleType} • {p.availabilityStatus})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    {(selectedDetail.status === 'PENDING' ||
                      selectedDetail.status === 'READY_FOR_PICKUP' ||
                      selectedDetail.status === 'FAILED') && (
                      <Button
                        type="button"
                        size="sm"
                        isLoading={busy}
                        onClick={() => handleAssign(false)}
                        className="flex-1 bg-brand text-white text-xs font-bold"
                      >
                        Assign
                      </Button>
                    )}
                    {(selectedDetail.status === 'ASSIGNED' ||
                      selectedDetail.status === 'ACCEPTED') && (
                      <Button
                        type="button"
                        size="sm"
                        isLoading={busy}
                        onClick={() => handleAssign(true)}
                        className="flex-1 bg-amber-600 text-white text-xs font-bold"
                      >
                        Reassign
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <h3 className="text-xs font-bold text-ink mb-2">Delivery History</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedDetail.statusHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border p-2 text-[11px]">
                      <p className="font-bold text-ink">
                        {h.previousStatus} → {h.newStatus}
                      </p>
                      <p className="text-muted">
                        {h.actorRole} • {h.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
