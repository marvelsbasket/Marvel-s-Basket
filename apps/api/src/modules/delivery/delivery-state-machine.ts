import { BadRequestException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import * as crypto from 'crypto';

export const ALLOWED_DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.PENDING]: [
    DeliveryStatus.READY_FOR_PICKUP,
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.READY_FOR_PICKUP]: [
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.ASSIGNED]: [
    DeliveryStatus.ACCEPTED,
    DeliveryStatus.READY_FOR_PICKUP,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.ACCEPTED]: [
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.READY_FOR_PICKUP,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.PICKED_UP]: [
    DeliveryStatus.IN_TRANSIT,
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.IN_TRANSIT]: [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.DELIVERED]: [],
  [DeliveryStatus.FAILED]: [
    DeliveryStatus.READY_FOR_PICKUP,
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.CANCELLED]: [],
};

export const TERMINAL_DELIVERY_STATUSES: ReadonlySet<DeliveryStatus> = new Set([
  DeliveryStatus.DELIVERED,
  DeliveryStatus.CANCELLED,
]);

export const DELIVERY_FAILURE_REASONS = [
  'CUSTOMER_UNAVAILABLE',
  'CUSTOMER_UNREACHABLE',
  'WRONG_ADDRESS',
  'ADDRESS_NOT_FOUND',
  'CUSTOMER_REFUSED',
  'ACCESS_RESTRICTED',
  'RIDER_UNAVAILABLE',
  'STORE_HANDOVER_FAILED',
  'DAMAGED_PACKAGE',
  'OTHER',
] as const;

export type DeliveryFailureReason = (typeof DELIVERY_FAILURE_REASONS)[number];

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  if (from === to) return true;
  return (ALLOWED_DELIVERY_TRANSITIONS[from] || []).includes(to);
}

export function assertValidDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!canTransitionDelivery(from, to)) {
    throw new BadRequestException({
      code: 'INVALID_DELIVERY_TRANSITION',
      message: `Cannot transition delivery from ${from} to ${to}.`,
    });
  }
}

export function generateDeliveryOtp(): string {
  return crypto.randomInt(1000, 10000).toString();
}

export function hashDeliveryOtp(otp: string, deliveryId: string): string {
  return crypto.createHash('sha256').update(`${deliveryId}:${otp.trim()}`).digest('hex');
}

export function verifyDeliveryOtpHash(
  otp: string,
  deliveryId: string,
  storedHash: string,
): boolean {
  if (!otp || !deliveryId || !storedHash) return false;
  const candidate = hashDeliveryOtp(otp, deliveryId);
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
