'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  AdminPaymentDetailResponse,
  PaymentStatusResponse,
  PaymentStatusType,
} from '@marvels-basket/shared';
import { PaymentsService } from '@/features/payments/services/payments.service';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatINR } from '@/lib/utils/currency';

const STATUS_BADGE: Record<string, string> = {
  CAPTURED: 'bg-emerald-100 text-emerald-800',
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  CREATED: 'bg-stone-100 text-stone-700',
  PENDING: 'bg-amber-100 text-amber-800',
  AUTHORIZED: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-700',
  REFUND_PENDING: 'bg-orange-100 text-orange-800',
  PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-800',
  REFUNDED: 'bg-purple-100 text-purple-900',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<
    Array<PaymentStatusResponse & { customerName?: string | null; storeName?: string | null }>
  >([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<AdminPaymentDetailResponse | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await PaymentsService.listAdminPayments({
        status: (statusFilter || undefined) as PaymentStatusType | undefined,
        search: search.trim() || undefined,
        limit: 30,
      });
      setPayments(res.items);
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to load payment transactions.' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const inspectDetail = async (paymentId: string) => {
    try {
      const detail = await PaymentsService.getAdminPaymentDetail(paymentId);
      setSelectedDetail(detail);
    } catch {
      setFeedback({ type: 'error', msg: 'Failed to load payment detail.' });
    }
  };

  const handleReconcile = async (paymentId: string) => {
    setReconcilingId(paymentId);
    setFeedback(null);
    try {
      const res = await PaymentsService.reconcilePayment(paymentId);
      setFeedback({
        type: 'success',
        msg: `Reconciled ${res.orderNumber}: ${res.previousStatus} → ${res.newStatus} (${res.resolutionAction})`,
      });
      await loadPayments();
      if (selectedDetail?.paymentId === paymentId) {
        await inspectDetail(paymentId);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof ApiError ? err.message : 'Reconciliation failed.',
      });
    } finally {
      setReconcilingId(null);
    }
  };

  const handleCreateRefund = async () => {
    if (!selectedDetail || refundReason.trim().length < 3) return;
    setRefundBusy(true);
    setFeedback(null);
    try {
      const amt = refundAmount.trim() ? Number(refundAmount) : undefined;
      const refund = await PaymentsService.createRefund(selectedDetail.paymentId, {
        amount: amt,
        reason: refundReason.trim(),
      });
      setFeedback({
        type: 'success',
        msg: `Refund ${refund.refundNumber} initiated (${refund.status}) for ${formatINR(refund.amount)}.`,
      });
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      await loadPayments();
      await inspectDetail(selectedDetail.paymentId);
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof ApiError ? err.message : 'Refund failed.',
      });
    } finally {
      setRefundBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand" />
            Payments &amp; Refunds
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Monitor Razorpay transactions, reconcile uncertain states, and issue full or partial refunds.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/orders"
            className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
          >
            Back to Orders
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, rzp order ID, payment ID..."
          className="w-full sm:w-72 rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-ink"
        >
          <option value="">All Statuses</option>
          <option value="CREATED">CREATED</option>
          <option value="AUTHORIZED">AUTHORIZED</option>
          <option value="CAPTURED">CAPTURED</option>
          <option value="FAILED">FAILED</option>
          <option value="REFUND_PENDING">REFUND_PENDING</option>
          <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={loadPayments}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">No payment transactions found.</div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div
                  key={p.paymentId}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-surface/60"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-ink">{p.orderNumber}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          STATUS_BADGE[p.status] || 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {p.customerName || 'Customer'} • {p.storeName || 'Store'} • Attempt #{p.attemptNumber}
                    </p>
                    <p className="text-[11px] font-mono text-muted">
                      {p.providerOrderId || '—'} {p.providerPaymentId ? `• ${p.providerPaymentId}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-sm font-black text-ink">{formatINR(p.amount)}</p>
                      {p.refundedAmount > 0 && (
                        <p className="text-[11px] text-purple-700">
                          Refunded: {formatINR(p.refundedAmount)}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={reconcilingId === p.paymentId}
                      onClick={() => handleReconcile(p.paymentId)}
                      className="text-xs"
                    >
                      Reconcile
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => inspectDetail(p.paymentId)}
                      className="text-xs bg-brand text-white hover:bg-forest"
                    >
                      Inspect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 space-y-4 h-fit">
          {!selectedDetail ? (
            <div className="text-center py-10 text-xs text-muted">
              Select a payment transaction to view audit history, refunds, and actions.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-black text-ink">{selectedDetail.orderNumber}</h2>
                  <p className="text-xs text-muted">{selectedDetail.customerEmail}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    STATUS_BADGE[selectedDetail.status] || 'bg-stone-100'
                  }`}
                >
                  {selectedDetail.status}
                </span>
              </div>

              <div className="rounded-xl bg-surface p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Amount</span>
                  <span className="font-bold text-ink">{formatINR(selectedDetail.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Captured</span>
                  <span className="font-bold text-emerald-700">
                    {formatINR(selectedDetail.capturedAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Refunded</span>
                  <span className="font-bold text-purple-700">
                    {formatINR(selectedDetail.refundedAmount)}
                  </span>
                </div>
              </div>

              {(selectedDetail.status === 'CAPTURED' ||
                selectedDetail.status === 'SUCCESS' ||
                selectedDetail.status === 'PARTIALLY_REFUNDED' ||
                selectedDetail.status === 'REFUND_PENDING') && (
                <Button
                  type="button"
                  onClick={() => setRefundOpen(true)}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Issue Full / Partial Refund
                </Button>
              )}

              <div>
                <h3 className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                  Status History
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDetail.statusHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border p-2 text-[11px]">
                      <p className="font-bold text-ink">
                        {h.previousStatus} → {h.newStatus}
                      </p>
                      <p className="text-muted">{h.source} • {h.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDetail.refunds.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-ink mb-2">Refunds</h3>
                  <div className="space-y-2">
                    {selectedDetail.refunds.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border p-2 text-[11px]">
                        <div className="flex justify-between font-bold">
                          <span>{r.refundNumber}</span>
                          <span>{formatINR(r.amount)} ({r.status})</span>
                        </div>
                        <p className="text-muted mt-0.5">{r.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Initiate Razorpay Refund"
      >
        <div className="space-y-4 text-xs">
          <p className="text-muted">
            Leave amount blank to refund the full remaining refundable balance.
          </p>
          <div>
            <label className="font-bold text-ink block mb-1">Amount (INR, optional)</label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Full remaining balance"
              className="w-full rounded-xl border border-border px-3 py-2"
            />
          </div>
          <div>
            <label className="font-bold text-ink block mb-1">Reason (required)</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              placeholder="Customer cancellation / out of stock / damaged item..."
              className="w-full rounded-xl border border-border px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={refundBusy}
              disabled={refundReason.trim().length < 3}
              onClick={handleCreateRefund}
              className="bg-purple-700 text-white hover:bg-purple-800"
            >
              Confirm Refund
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
