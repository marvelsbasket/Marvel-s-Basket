import {
  AdminPaymentDetailResponse,
  InitiatePaymentResponse,
  PaginatedPaymentsResponse,
  PaginatedRefundsResponse,
  PaymentReconciliationResponse,
  PaymentStatusResponse,
  PaymentStatusType,
  RefundStatusType,
  RefundSummaryItem,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class PaymentsService {
  static async initiatePayment(payload: {
    checkoutSessionId?: string;
    orderId?: string;
    idempotencyKey?: string;
    notes?: string;
  }): Promise<InitiatePaymentResponse> {
    const res = await apiClient.post<InitiatePaymentResponse>(
      ENDPOINTS.PAYMENTS.INITIATE,
      payload,
    );
    return res.data!;
  }

  static async verifyPayment(payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<PaymentStatusResponse> {
    const res = await apiClient.post<PaymentStatusResponse>(
      ENDPOINTS.PAYMENTS.VERIFY,
      payload,
    );
    return res.data!;
  }

  static async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const res = await apiClient.get<PaymentStatusResponse>(
      ENDPOINTS.PAYMENTS.STATUS(paymentId),
    );
    return res.data!;
  }

  static async getOrderPayment(orderId: string): Promise<PaymentStatusResponse> {
    const res = await apiClient.get<PaymentStatusResponse>(
      ENDPOINTS.PAYMENTS.ORDER_PAYMENT(orderId),
    );
    return res.data!;
  }

  // Admin methods
  static async listAdminPayments(params?: {
    status?: PaymentStatusType;
    orderId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedPaymentsResponse> {
    const res = await apiClient.get<PaginatedPaymentsResponse>(
      ENDPOINTS.ADMIN_PAYMENTS.LIST,
      { params },
    );
    return res.data!;
  }

  static async getAdminPaymentDetail(paymentId: string): Promise<AdminPaymentDetailResponse> {
    const res = await apiClient.get<AdminPaymentDetailResponse>(
      ENDPOINTS.ADMIN_PAYMENTS.DETAIL(paymentId),
    );
    return res.data!;
  }

  static async reconcilePayment(paymentId: string): Promise<PaymentReconciliationResponse> {
    const res = await apiClient.post<PaymentReconciliationResponse>(
      ENDPOINTS.ADMIN_PAYMENTS.RECONCILE(paymentId),
      {},
    );
    return res.data!;
  }

  static async createRefund(
    paymentId: string,
    payload: {
      amount?: number;
      reason: string;
      speed?: 'normal' | 'optimum';
      idempotencyKey?: string;
    },
  ): Promise<RefundSummaryItem> {
    const res = await apiClient.post<RefundSummaryItem>(
      ENDPOINTS.ADMIN_PAYMENTS.CREATE_REFUND(paymentId),
      payload,
    );
    return res.data!;
  }

  static async listAdminRefunds(params?: {
    status?: RefundStatusType;
    orderId?: string;
    paymentId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedRefundsResponse> {
    const res = await apiClient.get<PaginatedRefundsResponse>(
      ENDPOINTS.ADMIN_PAYMENTS.REFUNDS_LIST,
      { params },
    );
    return res.data!;
  }
}
