'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Package, RefreshCw, Truck } from 'lucide-react';
import { DeliveryStatusType, DeliverySummaryItem } from '@marvels-basket/shared';
import { DeliveryService } from '@/features/delivery/services/delivery.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils/currency';

export default function SellerDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliverySummaryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await DeliveryService.listSellerDeliveries({
        status: (statusFilter || undefined) as DeliveryStatusType | undefined,
        limit: 30,
      });
      setDeliveries(res.items);
    } catch {
      setFeedback('Failed to load store deliveries.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (deliveryId: string, action: 'ready' | 'handover') => {
    setBusyId(deliveryId);
    setFeedback(null);
    try {
      if (action === 'ready') {
        await DeliveryService.markReadyForPickup(deliveryId);
        setFeedback('Delivery marked ready for pickup.');
      } else {
        await DeliveryService.confirmHandover(deliveryId);
        setFeedback('Handover readiness confirmed.');
      }
      await load();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand" />
            Store Deliveries &amp; Handover
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Coordinate packed orders with platform delivery partners.
          </p>
        </div>
        <Link
          href="/seller/orders"
          className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
        >
          Manage Orders
        </Link>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold"
        >
          <option value="">All Delivery Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-white divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading deliveries...</div>
        ) : deliveries.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted space-y-2">
            <Package className="mx-auto h-8 w-8 text-stone-300" />
            <p>No deliveries found for this filter.</p>
          </div>
        ) : (
          deliveries.map((d) => (
            <div
              key={d.id}
              className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-surface/50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-ink">{d.orderNumber}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Customer: {d.customerName || 'Customer'} • Total: {formatINR(d.orderTotal)} ({d.paymentMethod})
                </p>
                {d.deliveryPartner && (
                  <p className="text-xs font-semibold text-brand">
                    Rider: {d.deliveryPartner.name} ({d.deliveryPartner.vehicleType})
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {d.status === 'PENDING' && d.orderStatus === 'PACKED' && (
                  <Button
                    type="button"
                    size="sm"
                    isLoading={busyId === d.id}
                    onClick={() => handleAction(d.id, 'ready')}
                    className="bg-brand hover:bg-forest text-white text-xs font-bold"
                  >
                    Mark Ready for Pickup
                  </Button>
                )}
                {(d.status === 'ASSIGNED' || d.status === 'ACCEPTED') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={busyId === d.id}
                    onClick={() => handleAction(d.id, 'handover')}
                    className="text-xs font-bold"
                  >
                    Confirm Handover Ready
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
