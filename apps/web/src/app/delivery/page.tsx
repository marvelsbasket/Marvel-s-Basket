'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  MapPin,
  PackageCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  DeliveryFailureReasonType,
  DeliveryPartnerSummary,
  DeliverySummaryItem,
} from '@marvels-basket/shared';
import { DeliveryService } from '@/features/delivery/services/delivery.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatINR } from '@/lib/utils/currency';

const FAILURE_REASONS: DeliveryFailureReasonType[] = [
  'CUSTOMER_UNAVAILABLE',
  'CUSTOMER_UNREACHABLE',
  'WRONG_ADDRESS',
  'ADDRESS_NOT_FOUND',
  'CUSTOMER_REFUSED',
  'ACCESS_RESTRICTED',
  'RIDER_UNAVAILABLE',
  'STORE_HANDOVER_FAILED',
  'DAMAGED_PACKAGE',
  'OTHER',
];

export default function RiderDeliveryPortalPage() {
  const [profile, setProfile] = useState<DeliveryPartnerSummary | null>(null);
  const [assignments, setAssignments] = useState<DeliverySummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [completeTarget, setCompleteTarget] = useState<DeliverySummaryItem | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [codCollected, setCodCollected] = useState(false);

  const [failTarget, setFailTarget] = useState<DeliverySummaryItem | null>(null);
  const [failReason, setFailReason] = useState<DeliveryFailureReasonType>('CUSTOMER_UNAVAILABLE');
  const [failNote, setFailNote] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prof, list] = await Promise.all([
        DeliveryService.getRiderProfile(),
        DeliveryService.listRiderAssignments({ limit: 30 }),
      ]);
      setProfile(prof);
      setAssignments(list.items);
    } catch {
      setFeedback('Unable to load delivery partner portal.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAvailability = async () => {
    if (!profile) return;
    const next = profile.availabilityStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    try {
      const updated = await DeliveryService.updateAvailability(next);
      setProfile(updated);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Could not update availability.');
    }
  };

  const runAction = async (deliveryId: string, fn: () => Promise<unknown>, successMsg: string) => {
    setBusyId(deliveryId);
    setFeedback(null);
    try {
      await fn();
      setFeedback(successMsg);
      await load();
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Bike className="h-6 w-6 text-brand" />
            Delivery Partner Portal
          </h1>
          {profile && (
            <p className="text-xs text-muted mt-0.5">
              {profile.name} • {profile.vehicleType} {profile.vehicleNumber || ''} • Status:{' '}
              <span className="font-bold text-ink">{profile.availabilityStatus}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {profile && (
            <Button type="button" variant="outline" size="sm" onClick={toggleAvailability}>
              Switch to {profile.availabilityStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted">
            No deliveries assigned yet.
          </div>
        ) : (
          assignments.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-black text-ink">{d.orderNumber}</span>
                  <p className="text-xs text-muted">
                    Store: {d.storeName} • {d.paymentMethod} {formatINR(d.orderTotal)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {d.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {d.status === 'ASSIGNED' && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      isLoading={busyId === d.id}
                      onClick={() =>
                        runAction(
                          d.id,
                          () => DeliveryService.acceptAssignment(d.id),
                          'Assignment accepted.',
                        )
                      }
                      className="bg-brand text-white text-xs font-bold"
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={busyId === d.id}
                      onClick={() =>
                        runAction(
                          d.id,
                          () => DeliveryService.rejectAssignment(d.id, 'Rider unavailable'),
                          'Assignment rejected.',
                        )
                      }
                      className="text-xs text-red-600 border-red-200"
                    >
                      Reject
                    </Button>
                  </>
                )}
                {d.status === 'ACCEPTED' && (
                  <Button
                    type="button"
                    size="sm"
                    isLoading={busyId === d.id}
                    onClick={() =>
                      runAction(
                        d.id,
                        () => DeliveryService.pickupDelivery(d.id),
                        'Order picked up and marked in transit.',
                      )
                    }
                    className="bg-brand text-white text-xs font-bold"
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Confirm Pickup
                  </Button>
                )}
                {(d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT') && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setCompleteTarget(d);
                        setOtpInput('');
                        setCodCollected(d.paymentMethod === 'COD');
                      }}
                      className="bg-brand text-white text-xs font-bold"
                    >
                      <PackageCheck className="h-3.5 w-3.5 mr-1" />
                      Complete Delivery
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFailTarget(d);
                        setFailNote('');
                      }}
                      className="text-xs text-red-600 border-red-200"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Report Failure
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title="Complete Delivery"
      >
        {completeTarget && (
          <div className="space-y-4 text-xs">
            <p className="text-muted">
              Order <strong>{completeTarget.orderNumber}</strong>
            </p>
            <div>
              <label className="font-bold text-ink block mb-1">Customer Delivery OTP</label>
              <input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="4-digit OTP"
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
            {completeTarget.paymentMethod === 'COD' && (
              <label className="flex items-center gap-2 font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={codCollected}
                  onChange={(e) => setCodCollected(e.target.checked)}
                />
                Collected COD amount {formatINR(completeTarget.orderTotal)}
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCompleteTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={busyId === completeTarget.id}
                onClick={async () => {
                  await runAction(
                    completeTarget.id,
                    () =>
                      DeliveryService.completeDelivery(completeTarget.id, {
                        otp: otpInput.trim() || undefined,
                        codCollected,
                        codCollectedAmount: codCollected ? completeTarget.orderTotal : undefined,
                      }),
                    'Delivery completed!',
                  );
                  setCompleteTarget(null);
                }}
                className="bg-brand text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirm Delivered
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        isOpen={Boolean(failTarget)}
        onClose={() => setFailTarget(null)}
        title="Record Failed Delivery"
      >
        {failTarget && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-ink block mb-1">Failure Reason</label>
              <select
                value={failReason}
                onChange={(e) => setFailReason(e.target.value as DeliveryFailureReasonType)}
                className="w-full rounded-xl border border-border px-3 py-2"
              >
                {FAILURE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Notes</label>
              <textarea
                value={failNote}
                onChange={(e) => setFailNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFailTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={busyId === failTarget.id}
                onClick={async () => {
                  await runAction(
                    failTarget.id,
                    () => DeliveryService.failDelivery(failTarget.id, failReason, failNote),
                    'Delivery failure recorded.',
                  );
                  setFailTarget(null);
                }}
                className="bg-red-600 text-white"
              >
                Submit Failure
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
