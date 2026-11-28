export interface RazorpayOrderCreateParams {
  amount: number; // integer paise
  currency: 'INR';
  receipt: string;
  payment_capture?: 0 | 1;
  notes?: Record<string, string>;
}

export interface RazorpayOrderEntity {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentEntity {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  method: string;
  amount_refunded: number;
  refund_status: 'null' | 'partial' | 'full' | null;
  captured: boolean;
  email?: string;
  contact?: string;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  created_at: number;
}

export interface RazorpayRefundCreateParams {
  amount?: number; // integer paise
  speed?: 'normal' | 'optimum';
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayRefundEntity {
  id: string;
  entity: 'refund';
  amount: number;
  currency: string;
  payment_id: string;
  notes?: Record<string, string>;
  receipt?: string | null;
  status: 'pending' | 'processed' | 'failed';
  speed_processed?: 'normal' | 'optimum';
  speed_requested?: 'normal' | 'optimum';
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: 'event';
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    order?: { entity: RazorpayOrderEntity };
    refund?: { entity: RazorpayRefundEntity };
  };
  created_at: number;
}
