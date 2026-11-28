import { BadRequestException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import {
  assertValidDeliveryTransition,
  canTransitionDelivery,
  generateDeliveryOtp,
  hashDeliveryOtp,
  verifyDeliveryOtpHash,
} from './delivery-state-machine';

describe('Phase 14 — Delivery & Fulfillment Unit Suite', () => {
  describe('Delivery State Machine', () => {
    it('allows valid discrete delivery transitions', () => {
      expect(canTransitionDelivery(DeliveryStatus.PENDING, DeliveryStatus.READY_FOR_PICKUP)).toBe(
        true,
      );
      expect(
        canTransitionDelivery(DeliveryStatus.READY_FOR_PICKUP, DeliveryStatus.ASSIGNED),
      ).toBe(true);
      expect(canTransitionDelivery(DeliveryStatus.ASSIGNED, DeliveryStatus.ACCEPTED)).toBe(true);
      expect(canTransitionDelivery(DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP)).toBe(true);
      expect(canTransitionDelivery(DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT)).toBe(true);
      expect(canTransitionDelivery(DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED)).toBe(true);
    });

    it('blocks invalid transitions and terminal overwrites', () => {
      expect(canTransitionDelivery(DeliveryStatus.PENDING, DeliveryStatus.DELIVERED)).toBe(false);
      expect(canTransitionDelivery(DeliveryStatus.READY_FOR_PICKUP, DeliveryStatus.DELIVERED)).toBe(
        false,
      );
      expect(canTransitionDelivery(DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED)).toBe(false);
      expect(canTransitionDelivery(DeliveryStatus.CANCELLED, DeliveryStatus.ASSIGNED)).toBe(false);

      expect(() =>
        assertValidDeliveryTransition(DeliveryStatus.PENDING, DeliveryStatus.DELIVERED),
      ).toThrow(BadRequestException);
    });
  });

  describe('Delivery Handover OTP', () => {
    it('generates 4-digit OTP, hashes securely, and verifies in constant time', () => {
      const deliveryId = '11111111-1111-1111-1111-111111111111';
      const otp = generateDeliveryOtp();
      expect(otp).toMatch(/^\d{4}$/);

      const hash = hashDeliveryOtp(otp, deliveryId);
      expect(hash).not.toBe(otp);
      expect(verifyDeliveryOtpHash(otp, deliveryId, hash)).toBe(true);
      expect(verifyDeliveryOtpHash('0000', deliveryId, hash)).toBe(otp === '0000');
      expect(verifyDeliveryOtpHash(otp, '22222222-2222-2222-2222-222222222222', hash)).toBe(false);
      expect(verifyDeliveryOtpHash('', deliveryId, hash)).toBe(false);
    });
  });
});
