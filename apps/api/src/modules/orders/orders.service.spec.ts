import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { assertValidOrderTransition, CUSTOMER_CANCELLABLE_STATUSES } from './order-state-machine';

describe('OrderStateMachine', () => {
  it('allows valid primary lifecycle transitions', () => {
    expect(() =>
      assertValidOrderTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED),
    ).not.toThrow();
    expect(() =>
      assertValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.PACKED),
    ).not.toThrow();
    expect(() =>
      assertValidOrderTransition(OrderStatus.PACKED, OrderStatus.OUT_FOR_DELIVERY),
    ).not.toThrow();
    expect(() =>
      assertValidOrderTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED),
    ).not.toThrow();
  });

  it('rejects invalid transitions such as PENDING -> DELIVERED or DELIVERED -> PENDING', () => {
    expect(() => assertValidOrderTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidOrderTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidOrderTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toThrow(
      BadRequestException,
    );
  });

  it('allows customer cancellation only before packing', () => {
    expect(CUSTOMER_CANCELLABLE_STATUSES.has(OrderStatus.PENDING)).toBe(true);
    expect(CUSTOMER_CANCELLABLE_STATUSES.has(OrderStatus.CONFIRMED)).toBe(true);
    expect(CUSTOMER_CANCELLABLE_STATUSES.has(OrderStatus.PACKED)).toBe(false);
    expect(CUSTOMER_CANCELLABLE_STATUSES.has(OrderStatus.OUT_FOR_DELIVERY)).toBe(false);
    expect(CUSTOMER_CANCELLABLE_STATUSES.has(OrderStatus.DELIVERED)).toBe(false);
  });
});
