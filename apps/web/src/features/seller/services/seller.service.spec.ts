import { apiClient } from '@/lib/api';
import { SellerService } from './seller.service';
import { ENDPOINTS } from '@/lib/api/endpoints';

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('SellerService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getOrCreateApplication sends POST to application endpoint', async () => {
    const mockApp = { id: 'seller-1', businessName: 'Gupta Mart' };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockApp });

    const result = await SellerService.getOrCreateApplication({
      storeDisplayName: 'Gupta Mart',
    });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.SELLERS.APPLICATION, {
      storeDisplayName: 'Gupta Mart',
    });
    expect(result).toEqual(mockApp);
  });

  it('getMyApplication sends GET to my application endpoint', async () => {
    const mockApp = { id: 'seller-1', status: 'DRAFT' };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockApp });

    const result = await SellerService.getMyApplication();
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.SELLERS.MY_APPLICATION);
    expect(result).toEqual(mockApp);
  });

  it('updateMyApplication sends PATCH with draft updates', async () => {
    const mockApp = { id: 'seller-1', pan: 'ABCDE1234F' };
    (apiClient.patch as jest.Mock).mockResolvedValue({ data: mockApp });

    const result = await SellerService.updateMyApplication({
      pan: 'ABCDE1234F',
    });

    expect(apiClient.patch).toHaveBeenCalledWith(ENDPOINTS.SELLERS.MY_APPLICATION, {
      pan: 'ABCDE1234F',
    });
    expect(result).toEqual(mockApp);
  });

  it('uploadDocument creates FormData and posts to documents endpoint', async () => {
    const mockDoc = { id: 'doc-1', documentType: 'PAN_CARD' };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockDoc });

    const file = new File(['fake-bytes'], 'pan.pdf', { type: 'application/pdf' });
    const result = await SellerService.uploadDocument(file, 'PAN_CARD', '2028-12-31');

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.SELLERS.DOCUMENTS, expect.any(FormData));
    expect(result).toEqual(mockDoc);
  });

  it('submitApplication sends POST to submit endpoint', async () => {
    const mockSubmitted = { id: 'seller-1', status: 'PENDING_VERIFICATION' };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockSubmitted });

    const result = await SellerService.submitApplication();
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.SELLERS.SUBMIT_APPLICATION, {});
    expect(result.status).toBe('PENDING_VERIFICATION');
  });

  it('getMyStatus sends GET to status endpoint', async () => {
    const mockStatus = { sellerId: 'seller-1', status: 'PENDING_VERIFICATION' };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStatus });

    const result = await SellerService.getMyStatus();
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.SELLERS.STATUS);
    expect(result).toEqual(mockStatus);
  });
});
