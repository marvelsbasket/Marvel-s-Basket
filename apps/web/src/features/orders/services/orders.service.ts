import {
  OrderComplaintCategoryType,
  OrderComplaintItem,
  OrderComplaintStatusType,
  OrderDetailResponse,
  OrderStatusHistoryItem,
  OrderStatusType,
  OrderTrackingResponse,
  PaginatedOrdersResponse,
  PaymentMethodType,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class OrdersService {
  static async createOrder(payload: {
    checkoutSessionId: string;
    paymentMethod?: PaymentMethodType;
    idempotencyKey?: string;
    notes?: string;
  }): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(ENDPOINTS.ORDERS.CREATE, payload);
    return res.data!;
  }

  static async listCustomerOrders(params?: {
    status?: OrderStatusType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedOrdersResponse> {
    const res = await apiClient.get<PaginatedOrdersResponse>(ENDPOINTS.ORDERS.LIST, { params });
    return res.data!;
  }

  static async getCustomerOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const res = await apiClient.get<OrderDetailResponse>(ENDPOINTS.ORDERS.DETAIL(orderId));
    return res.data!;
  }

  static async cancelCustomerOrder(orderId: string, reason: string): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(ENDPOINTS.ORDERS.CANCEL(orderId), {
      reason,
    });
    return res.data!;
  }

  static async getOrderTracking(orderId: string): Promise<OrderTrackingResponse> {
    const res = await apiClient.get<OrderTrackingResponse>(ENDPOINTS.ORDERS.TRACKING(orderId));
    return res.data!;
  }

  static async submitComplaint(
    orderId: string,
    payload: {
      orderItemId?: string;
      category: OrderComplaintCategoryType;
      description: string;
      isPerishable?: boolean;
    },
  ): Promise<OrderComplaintItem> {
    const res = await apiClient.post<OrderComplaintItem>(
      ENDPOINTS.ORDERS.COMPLAINTS(orderId),
      payload,
    );
    return res.data!;
  }

  // Seller methods
  static async listSellerOrders(params?: {
    status?: OrderStatusType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedOrdersResponse> {
    const res = await apiClient.get<PaginatedOrdersResponse>(ENDPOINTS.SELLER_ORDERS.LIST, {
      params,
    });
    return res.data!;
  }

  static async getSellerOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const res = await apiClient.get<OrderDetailResponse>(ENDPOINTS.SELLER_ORDERS.DETAIL(orderId));
    return res.data!;
  }

  static async acceptOrder(orderId: string): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(
      ENDPOINTS.SELLER_ORDERS.ACCEPT(orderId),
      {},
    );
    return res.data!;
  }

  static async rejectOrder(orderId: string, reason: string): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(ENDPOINTS.SELLER_ORDERS.REJECT(orderId), {
      reason,
    });
    return res.data!;
  }

  static async packOrder(orderId: string): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(
      ENDPOINTS.SELLER_ORDERS.PACK(orderId),
      {},
    );
    return res.data!;
  }

  static async dispatchOrder(orderId: string): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(
      ENDPOINTS.SELLER_ORDERS.DISPATCH(orderId),
      {},
    );
    return res.data!;
  }

  // Admin methods
  static async adminListOrders(params?: {
    status?: OrderStatusType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedOrdersResponse> {
    const res = await apiClient.get<PaginatedOrdersResponse>(ENDPOINTS.ADMIN_ORDERS.LIST, {
      params,
    });
    return res.data!;
  }

  static async adminGetOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const res = await apiClient.get<OrderDetailResponse>(ENDPOINTS.ADMIN_ORDERS.DETAIL(orderId));
    return res.data!;
  }

  static async adminGetOrderHistory(orderId: string): Promise<OrderStatusHistoryItem[]> {
    const res = await apiClient.get<OrderStatusHistoryItem[]>(
      ENDPOINTS.ADMIN_ORDERS.HISTORY(orderId),
    );
    return res.data!;
  }

  static async adminInterveneOrder(
    orderId: string,
    targetStatus: OrderStatusType,
    reason: string,
  ): Promise<OrderDetailResponse> {
    const res = await apiClient.post<OrderDetailResponse>(
      ENDPOINTS.ADMIN_ORDERS.INTERVENE(orderId),
      { targetStatus, reason },
    );
    return res.data!;
  }

  static async adminListComplaints(params?: {
    status?: OrderComplaintStatusType;
    page?: number;
    limit?: number;
  }): Promise<{
    items: OrderComplaintItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const res = await apiClient.get<{
      items: OrderComplaintItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(ENDPOINTS.ADMIN_ORDERS.COMPLAINTS, { params });
    return res.data!;
  }

  static async adminReviewComplaint(
    complaintId: string,
    status: OrderComplaintStatusType,
    adminNote?: string,
  ): Promise<OrderComplaintItem> {
    const res = await apiClient.post<OrderComplaintItem>(
      ENDPOINTS.ADMIN_ORDERS.REVIEW_COMPLAINT(complaintId),
      { status, adminNote },
    );
    return res.data!;
  }
}
