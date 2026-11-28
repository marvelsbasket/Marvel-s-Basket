import {
  CustomerDeliveryTrackingResponse,
  DeliveryDetailResponse,
  DeliveryFailureReasonType,
  DeliveryPartnerSummary,
  DeliveryStatusType,
  PaginatedDeliveriesResponse,
  PaginatedDeliveryPartnersResponse,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class DeliveryService {
  // Customer
  static async getCustomerTracking(orderId: string): Promise<CustomerDeliveryTrackingResponse> {
    const res = await apiClient.get<CustomerDeliveryTrackingResponse>(
      ENDPOINTS.CUSTOMER_DELIVERY.TRACKING(orderId),
    );
    return res.data!;
  }

  // Seller
  static async listSellerDeliveries(params?: {
    status?: DeliveryStatusType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedDeliveriesResponse> {
    const res = await apiClient.get<PaginatedDeliveriesResponse>(
      ENDPOINTS.SELLER_DELIVERIES.LIST,
      { params },
    );
    return res.data!;
  }

  static async markReadyForPickup(deliveryId: string): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.SELLER_DELIVERIES.READY_FOR_PICKUP(deliveryId),
      {},
    );
    return res.data!;
  }

  static async confirmHandover(deliveryId: string): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.SELLER_DELIVERIES.HANDOVER(deliveryId),
      {},
    );
    return res.data!;
  }

  static async reportSellerIssue(
    deliveryId: string,
    reason: string,
    note?: string,
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.SELLER_DELIVERIES.REPORT_ISSUE(deliveryId),
      { reason, note },
    );
    return res.data!;
  }

  // Delivery Partner (Rider)
  static async getRiderProfile(): Promise<DeliveryPartnerSummary> {
    const res = await apiClient.get<DeliveryPartnerSummary>(ENDPOINTS.RIDER_DELIVERY.PROFILE);
    return res.data!;
  }

  static async updateAvailability(
    availabilityStatus: 'AVAILABLE' | 'OFFLINE',
  ): Promise<DeliveryPartnerSummary> {
    const res = await apiClient.patch<DeliveryPartnerSummary>(
      ENDPOINTS.RIDER_DELIVERY.AVAILABILITY,
      { availabilityStatus },
    );
    return res.data!;
  }

  static async listRiderAssignments(params?: {
    status?: DeliveryStatusType;
    page?: number;
    limit?: number;
  }): Promise<PaginatedDeliveriesResponse> {
    const res = await apiClient.get<PaginatedDeliveriesResponse>(
      ENDPOINTS.RIDER_DELIVERY.ASSIGNMENTS,
      { params },
    );
    return res.data!;
  }

  static async acceptAssignment(deliveryId: string): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.RIDER_DELIVERY.ACCEPT(deliveryId),
      {},
    );
    return res.data!;
  }

  static async rejectAssignment(
    deliveryId: string,
    reason: string,
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.RIDER_DELIVERY.REJECT(deliveryId),
      { reason },
    );
    return res.data!;
  }

  static async pickupDelivery(deliveryId: string): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.RIDER_DELIVERY.PICKUP(deliveryId),
      {},
    );
    return res.data!;
  }

  static async completeDelivery(
    deliveryId: string,
    payload: {
      otp?: string;
      recipientName?: string;
      codCollected?: boolean;
      codCollectedAmount?: number;
      note?: string;
    },
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.RIDER_DELIVERY.COMPLETE(deliveryId),
      payload,
    );
    return res.data!;
  }

  static async failDelivery(
    deliveryId: string,
    reason: DeliveryFailureReasonType,
    note?: string,
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.RIDER_DELIVERY.FAIL(deliveryId),
      { reason, note },
    );
    return res.data!;
  }

  // Admin
  static async listAdminDeliveries(params?: {
    status?: DeliveryStatusType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedDeliveriesResponse> {
    const res = await apiClient.get<PaginatedDeliveriesResponse>(
      ENDPOINTS.ADMIN_DELIVERIES.LIST,
      { params },
    );
    return res.data!;
  }

  static async getAdminDeliveryDetail(deliveryId: string): Promise<DeliveryDetailResponse> {
    const res = await apiClient.get<DeliveryDetailResponse>(
      ENDPOINTS.ADMIN_DELIVERIES.DETAIL(deliveryId),
    );
    return res.data!;
  }

  static async listDeliveryPartners(): Promise<PaginatedDeliveryPartnersResponse> {
    const res = await apiClient.get<PaginatedDeliveryPartnersResponse>(
      ENDPOINTS.ADMIN_DELIVERIES.PARTNERS,
    );
    return res.data!;
  }

  static async assignDelivery(
    deliveryId: string,
    deliveryPartnerId: string,
    note?: string,
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.ADMIN_DELIVERIES.ASSIGN(deliveryId),
      { deliveryPartnerId, note },
    );
    return res.data!;
  }

  static async reassignDelivery(
    deliveryId: string,
    deliveryPartnerId: string,
    reason: string,
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.ADMIN_DELIVERIES.REASSIGN(deliveryId),
      { deliveryPartnerId, reason },
    );
    return res.data!;
  }

  static async cancelDelivery(
    deliveryId: string,
    reason: string,
  ): Promise<DeliveryDetailResponse> {
    const res = await apiClient.post<DeliveryDetailResponse>(
      ENDPOINTS.ADMIN_DELIVERIES.CANCEL(deliveryId),
      { reason },
    );
    return res.data!;
  }
}
