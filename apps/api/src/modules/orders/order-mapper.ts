import { OrderStatus } from '@prisma/client';
import {
  CheckoutAddressSnapshot,
  DeliveryStatusType,
  OrderComplaintCategoryType,
  OrderComplaintItem,
  OrderComplaintStatusType,
  OrderDetailResponse,
  OrderItemSnapshotDto,
  OrderStatusHistoryItem,
  OrderStatusType,
  OrderSummaryItem,
  PaymentMethodType,
  PaymentStatusType,
} from '@marvels-basket/shared';
import { CUSTOMER_CANCELLABLE_STATUSES } from './order-state-machine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOrderSummary(order: any): OrderSummaryItem {
  const items = Array.isArray(order.items) ? order.items : [];
  const totalUnits = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    sellerId: order.sellerId,
    storeName:
      order.storeNameSnapshot ||
      order.seller?.storeDisplayName ||
      order.seller?.businessName ||
      'Store',
    storeSlug: order.seller?.slug || null,
    customerName: order.customer?.name || null,
    status: order.status as OrderStatusType,
    paymentMethod: order.paymentMethod as PaymentMethodType,
    paymentStatus: order.paymentStatus as PaymentStatusType,
    deliveryStatus: order.deliveryStatus as DeliveryStatusType,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    discountAmount: Number(order.discountAmount),
    taxAmount: Number(order.taxAmount),
    totalAmount: Number(order.totalAmount),
    itemCount: items.length,
    totalUnits,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsPreview: items.slice(0, 3).map((i: any) => ({
      productName: i.productNameSnapshot,
      variantName: i.variantNameSnapshot || null,
      quantity: i.quantity,
      imageUrl: i.imageUrlSnapshot || null,
    })),
    createdAt: new Date(order.createdAt).toISOString(),
    confirmedAt: order.confirmedAt ? new Date(order.confirmedAt).toISOString() : null,
    packedAt: order.packedAt ? new Date(order.packedAt).toISOString() : null,
    dispatchedAt: order.dispatchedAt ? new Date(order.dispatchedAt).toISOString() : null,
    deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt).toISOString() : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOrderDetail(order: any): OrderDetailResponse {
  const summary = mapOrderSummary(order);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: OrderItemSnapshotDto[] = (order.items || []).map((i: any) => ({
    id: i.id,
    sellerProductId: i.sellerProductId,
    productIdSnapshot: i.productIdSnapshot || null,
    variantIdSnapshot: i.variantIdSnapshot || null,
    productNameSnapshot: i.productNameSnapshot,
    brandSnapshot: i.brandSnapshot || null,
    variantNameSnapshot: i.variantNameSnapshot || null,
    skuSnapshot: i.skuSnapshot || null,
    imageUrlSnapshot: i.imageUrlSnapshot || null,
    unitPrice: Number(i.unitPrice),
    mrp: i.mrp !== null && i.mrp !== undefined ? Number(i.mrp) : null,
    discountAmount: Number(i.discountAmount || 0),
    taxAmount: Number(i.taxAmount || 0),
    quantity: i.quantity,
    totalAmount: Number(i.totalAmount),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusHistory: OrderStatusHistoryItem[] = (order.statusHistory || []).map((h: any) => ({
    id: h.id,
    previousStatus: h.previousStatus as OrderStatusType,
    newStatus: h.newStatus as OrderStatusType,
    note: h.note || null,
    changedBy: h.changedBy || null,
    actorRole: h.actorRole || null,
    createdAt: new Date(h.createdAt).toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const complaints: OrderComplaintItem[] = (order.complaints || []).map((c: any) => ({
    id: c.id,
    orderId: c.orderId,
    orderNumber: order.orderNumber,
    orderItemId: c.orderItemId || null,
    customerId: c.customerId,
    category: c.category as OrderComplaintCategoryType,
    status: c.status as OrderComplaintStatusType,
    description: c.description,
    evidenceUrls: Array.isArray(c.evidenceUrls) ? c.evidenceUrls : [],
    adminNote: c.adminNote || null,
    reviewedBy: c.reviewedBy || null,
    reviewedAt: c.reviewedAt ? new Date(c.reviewedAt).toISOString() : null,
    resolvedAt: c.resolvedAt ? new Date(c.resolvedAt).toISOString() : null,
    createdAt: new Date(c.createdAt).toISOString(),
  }));

  return {
    ...summary,
    customerId: order.customerId,
    checkoutSessionId: order.checkoutSessionId || null,
    couponCode: order.couponCode || null,
    notes: order.notes || null,
    cancellationReason: order.cancellationReason || null,
    rejectionReason: order.rejectionReason || null,
    addressSnapshot: order.addressSnapshot as CheckoutAddressSnapshot,
    items,
    statusHistory,
    complaints,
    canCancel: CUSTOMER_CANCELLABLE_STATUSES.has(order.status as OrderStatus),
    canComplain: order.status === OrderStatus.DELIVERED,
  };
}
