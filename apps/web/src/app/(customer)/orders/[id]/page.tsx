'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShoppingBag,
  Store,
  XCircle,
} from 'lucide-react';
import {
  CustomerDeliveryTrackingResponse,
  OrderComplaintCategoryType,
  OrderDetailResponse,
  OrderTrackingResponse,
} from '@marvels-basket/shared';
import { OrdersService } from '@/features/orders/services/orders.service';
import { PaymentsService } from '@/features/payments/services/payments.service';
import { DeliveryService } from '@/features/delivery/services/delivery.service';
import { openRazorpayCheckout } from '@/features/payments/utils/razorpay-checkout';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/feedback/error-state';
import { formatINR } from '@/lib/utils/currency';
import { getOptimizedProductImage } from '@/lib/utils/cloudinary';

const COMPLAINT_CATEGORIES: Array<{ value: OrderComplaintCategoryType; label: string }> = [
  { value: 'MISSING_ITEM', label: 'Missing item' },
  { value: 'WRONG_ITEM', label: 'Wrong item delivered' },
  { value: 'DAMAGED_ITEM', label: 'Damaged item' },
  { value: 'SPOILED_PERISHABLE', label: 'Spoiled / poor-quality perishable' },
  { value: 'INCORRECT_QUANTITY', label: 'Incorrect quantity' },
  { value: 'OTHER', label: 'Other issue' },
];

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [tracking, setTracking] = useState<OrderTrackingResponse | null>(null);
  const [deliveryTracking, setDeliveryTracking] =
    useState<CustomerDeliveryTrackingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel Modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Complaint Modal
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintCategory, setComplaintCategory] =
    useState<OrderComplaintCategoryType>('MISSING_ITEM');
  const [complaintItemId, setComplaintItemId] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [detail, track, delTrack] = await Promise.all([
        OrdersService.getCustomerOrderDetail(orderId),
        OrdersService.getOrderTracking(orderId),
        DeliveryService.getCustomerTracking(orderId).catch(() => null),
      ]);
      setOrder(detail);
      setTracking(track);
      setDeliveryTracking(delTrack);
    } catch {
      setError('Order not found or could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleCancelOrder = async () => {
    if (!order || cancelReason.trim().length < 3) return;
    setCancelBusy(true);
    setActionError(null);
    try {
      const updated = await OrdersService.cancelCustomerOrder(order.id, cancelReason.trim());
      setOrder(updated);
      setCancelOpen(false);
      setCancelReason('');
      await loadOrder();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to cancel order.');
    } finally {
      setCancelBusy(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!order || complaintDesc.trim().length < 10) return;
    setComplaintBusy(true);
    setActionError(null);
    try {
      await OrdersService.submitComplaint(order.id, {
        orderItemId: complaintItemId || undefined,
        category: complaintCategory,
        description: complaintDesc.trim(),
        isPerishable: complaintCategory === 'SPOILED_PERISHABLE',
      });
      setComplaintOpen(false);
      setComplaintDesc('');
      setComplaintItemId('');
      await loadOrder();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to submit complaint.');
    } finally {
      setComplaintBusy(false);
    }
  };

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-stone-100" />;
  }

  if (error || !order) {
    return (
      <ErrorState title="Order Unavailable" message={error || 'Not found'} onRetry={loadOrder} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink hover:bg-surface"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-ink">{order.orderNumber}</h1>
            <p className="text-xs text-muted flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Placed on{' '}
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.paymentMethod === 'RAZORPAY' &&
            (order.paymentStatus === 'PENDING' ||
              order.paymentStatus === 'FAILED' ||
              order.paymentStatus === 'PROCESSING') &&
            order.status === 'PENDING' && (
              <Button
                type="button"
                isLoading={paymentBusy}
                onClick={async () => {
                  setPaymentBusy(true);
                  setActionError(null);
                  try {
                    const initRes = await PaymentsService.initiatePayment({ orderId: order.id });
                    await openRazorpayCheckout(initRes.checkout, {
                      onSuccess: async (rp) => {
                        try {
                          await PaymentsService.verifyPayment({
                            orderId: order.id,
                            razorpayOrderId: rp.razorpay_order_id,
                            razorpayPaymentId: rp.razorpay_payment_id,
                            razorpaySignature: rp.razorpay_signature,
                          });
                        } finally {
                          await loadOrder();
                          setPaymentBusy(false);
                        }
                      },
                      onFailure: async () => {
                        await loadOrder();
                        setPaymentBusy(false);
                      },
                      onDismiss: async () => {
                        await loadOrder();
                        setPaymentBusy(false);
                      },
                    });
                  } catch (err) {
                    setActionError(
                      err instanceof ApiError ? err.message : 'Unable to resume payment.',
                    );
                    setPaymentBusy(false);
                  }
                }}
                className="bg-brand hover:bg-forest text-white text-xs font-bold"
              >
                Complete / Retry Online Payment
              </Button>
            )}
          {order.canCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActionError(null);
                setCancelOpen(true);
              }}
              className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
            >
              Cancel Order
            </Button>
          )}
          {order.canComplain && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActionError(null);
                setComplaintOpen(true);
              }}
              className="text-xs font-bold"
            >
              Report an Issue
            </Button>
          )}
        </div>
      </div>

      {/* Cancellation / Rejection Notice */}
      {(order.status === 'CANCELLED' || order.status === 'REJECTED') && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-900">
          <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              Order {order.status === 'CANCELLED' ? 'Cancelled' : 'Rejected by Store'}
            </p>
            <p className="text-xs mt-0.5">
              {order.cancellationReason || order.rejectionReason || 'No reason specified.'}
            </p>
          </div>
        </div>
      )}

      {/* Tracking Milestones */}
      {tracking && order.status !== 'CANCELLED' && order.status !== 'REJECTED' && (
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-ink">Order Tracking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {tracking.milestones.map((m) => (
              <div
                key={m.status}
                className={`rounded-xl border p-3 ${
                  m.completed
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-border bg-surface-tile/40 opacity-65'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${m.completed ? 'text-brand' : 'text-stone-300'}`}
                  />
                  <span className="text-xs font-bold text-ink">{m.label}</span>
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Pending'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Items & Address */}
        <div className="lg:col-span-2 space-y-5">
          {/* Store Info */}
          <div className="rounded-2xl border border-border bg-white p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{order.storeName}</p>
              <p className="text-xs text-muted">
                Payment: {order.paymentMethod} ({order.paymentStatus})
              </p>
            </div>
          </div>

          {/* Immutable Items Snapshot */}
          <div className="rounded-2xl border border-border bg-white divide-y divide-border">
            <div className="px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Items ({order.items.length})</h2>
              <span className="text-[11px] text-muted">Purchase-time snapshot</span>
            </div>
            {order.items.map((item) => {
              const thumb = getOptimizedProductImage(item.imageUrlSnapshot, 'thumb');
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-xl border border-border bg-surface-tile flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.productNameSnapshot}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-stone-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink line-clamp-1">
                        {item.productNameSnapshot}
                      </p>
                      <p className="text-xs text-muted">
                        {item.variantNameSnapshot ? `${item.variantNameSnapshot} • ` : ''}
                        Qty: {item.quantity} × {formatINR(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-ink">{formatINR(item.totalAmount)}</p>
                    {item.mrp && item.mrp > item.unitPrice && (
                      <p className="text-[11px] text-muted line-through">
                        {formatINR(item.mrp * item.quantity)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Address Snapshot */}
          <div className="rounded-2xl border border-border bg-white p-4 space-y-1.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" />
              Delivery Address
            </h2>
            <p className="text-xs font-semibold text-ink">
              {order.addressSnapshot.recipientName} ({order.addressSnapshot.label})
            </p>
            <p className="text-xs text-ink-2">
              {order.addressSnapshot.addressLine1}
              {order.addressSnapshot.addressLine2 ? `, ${order.addressSnapshot.addressLine2}` : ''}
              {order.addressSnapshot.landmark ? `, ${order.addressSnapshot.landmark}` : ''}
            </p>
            <p className="text-xs text-ink-2">
              {order.addressSnapshot.city}, {order.addressSnapshot.state} -{' '}
              {order.addressSnapshot.postalCode}
            </p>
            <p className="text-xs text-muted">Phone: {order.addressSnapshot.phone}</p>
          </div>

          {/* Complaints Section */}
          {order.complaints.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
              <h2 className="text-sm font-bold text-ink">Reported Issues</h2>
              {order.complaints.map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{c.category.replace(/_/g, ' ')}</span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-ink-2">{c.description}</p>
                  {c.adminNote && (
                    <p className="text-[11px] text-brand font-semibold">
                      Support note: {c.adminNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Bill Breakdown */}
        <div>
          <div className="rounded-2xl border border-border bg-white p-5 space-y-3 sticky top-24">
            <h2 className="text-base font-bold text-ink">Bill Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-secondary">
                <span>Item Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-brand font-semibold">
                  <span>Discounts {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>-{formatINR(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-secondary">
                <span>Delivery Fee</span>
                <span>
                  {order.deliveryFee === 0 ? (
                    <span className="font-bold text-brand">FREE</span>
                  ) : (
                    formatINR(order.deliveryFee)
                  )}
                </span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-ink-secondary">
                  <span>Taxes</span>
                  <span>{formatINR(order.taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2.5 flex justify-between text-base font-black text-ink">
                <span>Total Paid / Payable</span>
                <span>{formatINR(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <Dialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Order?"
        description="Free cancellation is available before the store packs your order."
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
              Keep Order
            </Button>
            <Button
              onClick={handleCancelOrder}
              isLoading={cancelBusy}
              disabled={cancelReason.trim().length < 3}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {actionError && (
            <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {actionError}
            </p>
          )}
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Please share a reason for cancellation..."
            rows={3}
            className="w-full rounded-xl border border-border p-3 text-xs focus:border-brand focus:outline-none"
          />
        </div>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog
        isOpen={complaintOpen}
        onClose={() => setComplaintOpen(false)}
        title="Report an Order Issue"
        description="Tell us what went wrong with your delivered order."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setComplaintOpen(false)}
              disabled={complaintBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitComplaint}
              isLoading={complaintBusy}
              disabled={complaintDesc.trim().length < 10}
              className="bg-brand hover:bg-forest text-white"
            >
              Submit Issue
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {actionError && (
            <p className="font-semibold text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {actionError}
            </p>
          )}
          <div>
            <label className="block font-bold text-ink mb-1">Issue Category</label>
            <select
              value={complaintCategory}
              onChange={(e) => setComplaintCategory(e.target.value as OrderComplaintCategoryType)}
              className="w-full rounded-xl border border-border bg-white p-2.5"
            >
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-ink mb-1">Affected Item (optional)</label>
            <select
              value={complaintItemId}
              onChange={(e) => setComplaintItemId(e.target.value)}
              className="w-full rounded-xl border border-border bg-white p-2.5"
            >
              <option value="">Entire Order</option>
              {order.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.productNameSnapshot} (×{i.quantity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-ink mb-1">Description (min 10 chars)</label>
            <textarea
              value={complaintDesc}
              onChange={(e) => setComplaintDesc(e.target.value)}
              rows={3}
              placeholder="Describe the issue in detail..."
              className="w-full rounded-xl border border-border p-2.5"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
