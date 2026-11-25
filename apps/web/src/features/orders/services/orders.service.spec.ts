import { OrdersService } from './orders.service';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('OrdersService (Web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an order from checkoutSessionId', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'ord-1', orderNumber: 'MB-1' } });
    const res = await OrdersService.createOrder({
      checkoutSessionId: 'sess-1',
      paymentMethod: 'COD',
      idempotencyKey: 'order:sess-1',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/orders', {
      checkoutSessionId: 'sess-1',
      paymentMethod: 'COD',
      idempotencyKey: 'order:sess-1',
    });
    expect(res.id).toBe('ord-1');
  });

  it('cancels customer order with reason', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'ord-1', status: 'CANCELLED' } });
    const res = await OrdersService.cancelCustomerOrder('ord-1', 'Changed my mind');
    expect(apiClient.post).toHaveBeenCalledWith('/orders/ord-1/cancel', {
      reason: 'Changed my mind',
    });
    expect(res.status).toBe('CANCELLED');
  });

  it('calls seller accept and reject endpoints', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'ord-1', status: 'CONFIRMED' } });
    await OrdersService.acceptOrder('ord-1');
    expect(apiClient.post).toHaveBeenCalledWith('/seller/orders/ord-1/accept', {});

    await OrdersService.rejectOrder('ord-1', 'Out of stock');
    expect(apiClient.post).toHaveBeenCalledWith('/seller/orders/ord-1/reject', {
      reason: 'Out of stock',
    });
  });
});
