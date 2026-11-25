import { CheckoutService } from './checkout.service';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('CheckoutService (Web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls POST /checkout/prepare with addressId and expectedItemPrices', async () => {
    const mockSummary = { checkoutSessionId: 'sess-1', remainingSeconds: 900 };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockSummary });

    const res = await CheckoutService.prepareCheckout({
      addressId: 'addr-1',
      expectedItemPrices: [{ sellerProductId: 'sp-1', unitPrice: 100 }],
    });

    expect(apiClient.post).toHaveBeenCalledWith('/checkout/prepare', {
      addressId: 'addr-1',
      expectedItemPrices: [{ sellerProductId: 'sp-1', unitPrice: 100 }],
    });
    expect(res).toEqual(mockSummary);
  });

  it('calls GET /checkout/summary with optional sessionId', async () => {
    const mockSummary = { checkoutSessionId: 'sess-1', remainingSeconds: 850 };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSummary });

    const res = await CheckoutService.getSummary('sess-1');
    expect(apiClient.get).toHaveBeenCalledWith('/checkout/summary?sessionId=sess-1');
    expect(res).toEqual(mockSummary);
  });

  it('calls POST /checkout/cancel', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { cancelled: true, releasedCount: 1, message: 'ok' },
    });

    const res = await CheckoutService.cancelCheckout('sess-1');
    expect(apiClient.post).toHaveBeenCalledWith('/checkout/cancel', {
      checkoutSessionId: 'sess-1',
    });
    expect(res.cancelled).toBe(true);
  });
});
