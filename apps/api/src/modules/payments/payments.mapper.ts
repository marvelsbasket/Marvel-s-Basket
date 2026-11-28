import {
  AdminPaymentDetailResponse,
  OrderStatusType,
  PaymentMethodType,
  PaymentStatusHistoryItem,
  PaymentStatusResponse,
  PaymentStatusType,
  RefundStatusType,
  RefundSummaryItem,
} from '@marvels-basket/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPaymentStatus(payment: any): PaymentStatusResponse {
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order?.orderNumber || '',
    orderStatus: (payment.order?.status || 'PENDING') as OrderStatusType,
    orderPaymentStatus: (payment.order?.paymentStatus || payment.status) as PaymentStatusType,
    paymentMethod: payment.paymentMethod as PaymentMethodType,
    provider: payment.provider,
    method: payment.method,
    providerOrderId: payment.providerOrderId ?? null,
    providerPaymentId: payment.providerPaymentId ?? null,
    amount: Number(payment.amount),
    capturedAmount: Number(payment.capturedAmount ?? 0),
    refundedAmount: Number(payment.refundedAmount ?? 0),
    currency: payment.currency,
    status: payment.status as PaymentStatusType,
    gatewayStatus: payment.gatewayStatus ?? null,
    failureCode: payment.failureCode ?? null,
    failureReason: payment.failureReason ?? null,
    attemptNumber: payment.attemptNumber ?? 1,
    paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString() : null,
    createdAt: new Date(payment.createdAt).toISOString(),
    updatedAt: new Date(payment.updatedAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPaymentHistoryItem(h: any): PaymentStatusHistoryItem {
  return {
    id: h.id,
    previousStatus: h.previousStatus as PaymentStatusType,
    newStatus: h.newStatus as PaymentStatusType,
    source: h.source,
    providerEventId: h.providerEventId ?? null,
    providerPaymentId: h.providerPaymentId ?? null,
    note: h.note ?? null,
    createdAt: new Date(h.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRefundSummary(r: any): RefundSummaryItem {
  return {
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.order?.orderNumber,
    paymentId: r.paymentId,
    refundNumber: r.refundNumber,
    amount: Number(r.amount),
    reason: r.reason,
    status: r.status as RefundStatusType,
    providerRefundId: r.providerRefundId ?? null,
    speedRequested: r.speedRequested ?? null,
    speedProcessed: r.speedProcessed ?? null,
    gatewayStatus: r.gatewayStatus ?? null,
    failureReason: r.failureReason ?? null,
    requestedBy: r.requestedBy,
    approvedBy: r.approvedBy ?? null,
    processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAdminPaymentDetail(payment: any): AdminPaymentDetailResponse {
  return {
    ...mapPaymentStatus(payment),
    customerId: payment.order?.customerId || '',
    customerName: payment.order?.customer?.name ?? null,
    customerEmail: payment.order?.customer?.email ?? null,
    sellerId: payment.order?.sellerId || '',
    storeName:
      payment.order?.storeNameSnapshot ||
      payment.order?.seller?.storeDisplayName ||
      payment.order?.seller?.businessName ||
      null,
    statusHistory: Array.isArray(payment.statusHistory)
      ? payment.statusHistory.map(mapPaymentHistoryItem)
      : [],
    refunds: Array.isArray(payment.refunds) ? payment.refunds.map(mapRefundSummary) : [],
  };
}
