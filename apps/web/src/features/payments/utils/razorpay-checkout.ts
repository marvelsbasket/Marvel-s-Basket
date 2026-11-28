import { RazorpayCheckoutConfig } from '@marvels-basket/shared';

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (res: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptLoadPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptLoadPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export async function openRazorpayCheckout(
  config: RazorpayCheckoutConfig,
  callbacks: {
    onSuccess: (response: RazorpaySuccessResponse) => void;
    onFailure: (response: RazorpayFailureResponse) => void;
    onDismiss: () => void;
  },
): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Unable to load Razorpay Checkout. Please check your internet connection.');
  }

  const options: Record<string, unknown> = {
    key: config.keyId,
    amount: config.amountPaise,
    currency: config.currency,
    name: config.name,
    description: config.description,
    order_id: config.orderId,
    prefill: config.prefill,
    notes: config.notes,
    theme: {
      color: '#15803D',
    },
    modal: {
      ondismiss: () => {
        callbacks.onDismiss();
      },
      escape: true,
      confirm_close: true,
    },
    handler: (response: RazorpaySuccessResponse) => {
      callbacks.onSuccess(response);
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (failureRes) => {
    callbacks.onFailure(failureRes);
  });
  rzp.open();
}
