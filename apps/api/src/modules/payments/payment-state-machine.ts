import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.PENDING,
    PaymentStatus.PROCESSING,
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.AUTHORIZED]: [
    PaymentStatus.CAPTURED,
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.CAPTURED]: [
    PaymentStatus.REFUND_PENDING,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.SUCCESS]: [
    PaymentStatus.REFUND_PENDING,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.REFUND_PENDING]: [
    PaymentStatus.CAPTURED,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.PARTIALLY_REFUNDED]: [
    PaymentStatus.REFUND_PENDING,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.REFUNDED]: [],
};

/**
 * Precedence rank for forward-only pre-refund payment states.
 * Prevents delayed/out-of-order webhooks (e.g. payment.authorized after payment.captured)
 * from downgrading a payment.
 */
export const PAYMENT_PROGRESS_RANK: Partial<Record<PaymentStatus, number>> = {
  [PaymentStatus.CREATED]: 1,
  [PaymentStatus.PENDING]: 2,
  [PaymentStatus.PROCESSING]: 3,
  [PaymentStatus.AUTHORIZED]: 4,
  [PaymentStatus.CAPTURED]: 5,
  [PaymentStatus.SUCCESS]: 5,
  [PaymentStatus.REFUND_PENDING]: 6,
  [PaymentStatus.PARTIALLY_REFUNDED]: 7,
  [PaymentStatus.REFUNDED]: 8,
};

export const CAPTURED_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.CAPTURED,
  PaymentStatus.SUCCESS,
  PaymentStatus.REFUND_PENDING,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
]);

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return (ALLOWED_PAYMENT_TRANSITIONS[from] || []).includes(to);
}

export function assertValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new BadRequestException({
      code: 'INVALID_PAYMENT_TRANSITION',
      message: `Cannot transition payment from ${from} to ${to}.`,
    });
  }
}

/**
 * Converts INR decimal/number amount to integer paise safely.
 */
export function rupeesToPaise(amount: number | string): number {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) {
    throw new BadRequestException({
      code: 'INVALID_PAYMENT_AMOUNT',
      message: 'Payment amount must be a positive number.',
    });
  }
  const paise = Math.round(num * 100);
  if (paise < 100) {
    // Razorpay minimum transaction amount in INR is 100 paise (₹1.00)
    throw new BadRequestException({
      code: 'AMOUNT_BELOW_GATEWAY_MINIMUM',
      message: 'Online payment amount must be at least ₹1.00 (100 paise).',
    });
  }
  return paise;
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}
