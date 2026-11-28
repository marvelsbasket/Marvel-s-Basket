import {
  CustomerDeliveryTrackingResponse,
  DeliveryAssignmentItem,
  DeliveryAssignmentStatusType,
  DeliveryDetailResponse,
  DeliveryPartnerSummary,
  DeliveryStatusHistoryItem,
  DeliveryStatusType,
  DeliverySummaryItem,
  OrderStatusType,
  PaymentMethodType,
  PaymentStatusType,
} from '@marvels-basket/shared';
import { DeliveryStatus } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDeliveryPartner(partner: any): DeliveryPartnerSummary {
  return {
    id: partner.id,
    userId: partner.userId,
    name: partner.user?.name || 'Delivery Partner',
    phone: partner.user?.phone ?? null,
    vehicleType: partner.vehicleType,
    vehicleNumber: partner.vehicleNumber ?? null,
    verificationStatus: partner.verificationStatus,
    availabilityStatus: partner.availabilityStatus,
    rating: Number(partner.rating ?? 5),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDeliveryHistoryItem(h: any): DeliveryStatusHistoryItem {
  return {
    id: h.id,
    previousStatus: h.previousStatus as DeliveryStatusType,
    newStatus: h.newStatus as DeliveryStatusType,
    actorRole: h.actorRole ?? null,
    note: h.note ?? null,
    updatedBy: h.updatedBy ?? null,
    createdAt: new Date(h.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDeliveryAssignment(a: any): DeliveryAssignmentItem {
  return {
    id: a.id,
    deliveryId: a.deliveryId,
    deliveryPartnerId: a.deliveryPartnerId,
    partnerName: a.deliveryPartner?.user?.name,
    partnerPhone: a.deliveryPartner?.user?.phone ?? null,
    status: a.status as DeliveryAssignmentStatusType,
    rejectionReason: a.rejectionReason ?? null,
    expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString() : null,
    assignedAt: new Date(a.assignedAt).toISOString(),
    respondedAt: a.respondedAt ? new Date(a.respondedAt).toISOString() : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDeliverySummary(d: any): DeliverySummaryItem {
  return {
    id: d.id,
    orderId: d.orderId,
    orderNumber: d.order?.orderNumber || '',
    orderStatus: (d.order?.status || 'PENDING') as OrderStatusType,
    paymentMethod: (d.order?.paymentMethod || 'COD') as PaymentMethodType,
    paymentStatus: (d.order?.paymentStatus || 'PENDING') as PaymentStatusType,
    orderTotal: Number(d.order?.totalAmount ?? 0),
    deliveryFee: Number(d.order?.deliveryFee ?? 0),
    sellerId: d.order?.sellerId || '',
    storeName:
      d.order?.storeNameSnapshot ||
      d.order?.seller?.storeDisplayName ||
      d.order?.seller?.businessName ||
      'Store',
    customerId: d.order?.customerId || '',
    customerName: d.order?.customer?.name ?? null,
    status: d.status as DeliveryStatusType,
    attemptCount: d.attemptCount ?? 0,
    maxAttempts: d.maxAttempts ?? 3,
    deliveryPartner: d.deliveryPartner ? mapDeliveryPartner(d.deliveryPartner) : null,
    estimatedDeliveryAt: d.estimatedDeliveryAt
      ? new Date(d.estimatedDeliveryAt).toISOString()
      : null,
    readyForPickupAt: d.readyForPickupAt ? new Date(d.readyForPickupAt).toISOString() : null,
    assignedAt: d.assignedAt ? new Date(d.assignedAt).toISOString() : null,
    acceptedAt: d.acceptedAt ? new Date(d.acceptedAt).toISOString() : null,
    pickedUpAt: d.pickedUpAt ? new Date(d.pickedUpAt).toISOString() : null,
    deliveredAt: d.deliveredAt ? new Date(d.deliveredAt).toISOString() : null,
    failedAt: d.failedAt ? new Date(d.failedAt).toISOString() : null,
    cancelledAt: d.cancelledAt ? new Date(d.cancelledAt).toISOString() : null,
    failureReason: d.failureReason ?? null,
    codCollected: Boolean(d.codCollected),
    createdAt: new Date(d.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDeliveryDetail(d: any): DeliveryDetailResponse {
  return {
    ...mapDeliverySummary(d),
    pickupAddressSnapshot: (d.pickupAddressSnapshot || {}) as Record<string, unknown>,
    deliveryAddressSnapshot: (d.deliveryAddressSnapshot || {}) as Record<string, unknown>,
    deliveryInstructions: d.deliveryInstructions ?? null,
    cancellationReason: d.cancellationReason ?? null,
    codCollectedAmount:
      d.codCollectedAmount !== null && d.codCollectedAmount !== undefined
        ? Number(d.codCollectedAmount)
        : null,
    recipientName: d.recipientName ?? null,
    deliveryNotes: d.deliveryNotes ?? null,
    assignments: Array.isArray(d.assignments) ? d.assignments.map(mapDeliveryAssignment) : [],
    statusHistory: Array.isArray(d.statusHistory)
      ? d.statusHistory.map(mapDeliveryHistoryItem)
      : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCustomerDeliveryTracking(d: any): CustomerDeliveryTrackingResponse {
  const rankMap: Record<DeliveryStatus, number> = {
    [DeliveryStatus.PENDING]: 0,
    [DeliveryStatus.READY_FOR_PICKUP]: 1,
    [DeliveryStatus.ASSIGNED]: 2,
    [DeliveryStatus.ACCEPTED]: 3,
    [DeliveryStatus.PICKED_UP]: 4,
    [DeliveryStatus.IN_TRANSIT]: 5,
    [DeliveryStatus.DELIVERED]: 6,
    [DeliveryStatus.FAILED]: -1,
    [DeliveryStatus.CANCELLED]: -1,
  };
  const currentRank = rankMap[d.status as DeliveryStatus] ?? 0;

  return {
    deliveryId: d.id,
    orderId: d.orderId,
    orderNumber: d.order?.orderNumber || '',
    orderStatus: d.order?.status as OrderStatusType,
    status: d.status as DeliveryStatusType,
    storeName:
      d.order?.storeNameSnapshot ||
      d.order?.seller?.storeDisplayName ||
      d.order?.seller?.businessName ||
      'Store',
    deliveryAddressSnapshot: (d.deliveryAddressSnapshot || {}) as Record<string, unknown>,
    estimatedDeliveryAt: d.estimatedDeliveryAt
      ? new Date(d.estimatedDeliveryAt).toISOString()
      : null,
    deliveryInstructions: d.deliveryInstructions ?? null,
    rider:
      d.deliveryPartner && d.status !== DeliveryStatus.DELIVERED
        ? {
            name: d.deliveryPartner.user?.name || 'Delivery Partner',
            vehicleType: d.deliveryPartner.vehicleType,
            vehicleNumber: d.deliveryPartner.vehicleNumber ?? null,
            rating: Number(d.deliveryPartner.rating ?? 5),
          }
        : null,
    milestones: [
      {
        status: 'PENDING',
        label: 'Order Confirmed',
        completed: currentRank >= 0,
        timestamp: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      },
      {
        status: 'READY_FOR_PICKUP',
        label: 'Packed & Ready for Pickup',
        completed: currentRank >= 1,
        timestamp: d.readyForPickupAt ? new Date(d.readyForPickupAt).toISOString() : null,
      },
      {
        status: 'ASSIGNED',
        label: 'Delivery Partner Assigned',
        completed: currentRank >= 2,
        timestamp: d.assignedAt ? new Date(d.assignedAt).toISOString() : null,
      },
      {
        status: 'PICKED_UP',
        label: 'Picked Up from Store',
        completed: currentRank >= 4,
        timestamp: d.pickedUpAt ? new Date(d.pickedUpAt).toISOString() : null,
      },
      {
        status: 'DELIVERED',
        label: 'Delivered',
        completed: currentRank >= 6,
        timestamp: d.deliveredAt ? new Date(d.deliveredAt).toISOString() : null,
      },
    ],
    history: Array.isArray(d.statusHistory)
      ? d.statusHistory.map(mapDeliveryHistoryItem)
      : [],
    failureReason: d.failureReason ?? null,
    lastUpdatedAt: new Date(d.updatedAt).toISOString(),
    trackingNote:
      'Discrete milestone tracking active (live GPS streaming deferred per platform MVP architecture).',
  };
}
