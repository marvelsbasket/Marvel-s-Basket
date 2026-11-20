import { apiClient } from '@/lib/api';
import { AdminSellerService } from './admin-seller.service';
import { ENDPOINTS } from '@/lib/api/endpoints';

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('AdminSellerService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('listApplications sends GET with query parameters', async () => {
    const mockList = { items: [], total: 0 };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockList });

    const result = await AdminSellerService.listApplications({
      status: 'PENDING_VERIFICATION',
      page: 1,
      limit: 10,
    });

    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.ADMIN_SELLERS.LIST, {
      params: { status: 'PENDING_VERIFICATION', page: 1, limit: 10 },
    });
    expect(result).toEqual(mockList);
  });

  it('getApplicationDetail sends GET for specified seller ID', async () => {
    const mockDetail = { id: 'seller-1' };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDetail });

    const result = await AdminSellerService.getApplicationDetail('seller-1');
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.ADMIN_SELLERS.DETAIL('seller-1'));
    expect(result).toEqual(mockDetail);
  });

  it('reviewDocument sends POST with decision', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await AdminSellerService.reviewDocument('seller-1', 'doc-1', 'VERIFIED');
    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.ADMIN_SELLERS.REVIEW_DOCUMENT('seller-1', 'doc-1'),
      { status: 'VERIFIED', notes: undefined },
    );
  });

  it('approveSeller sends POST to approve endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await AdminSellerService.approveSeller('seller-1');
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN_SELLERS.APPROVE('seller-1'), {});
  });

  it('rejectSeller sends POST with rejection reason', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await AdminSellerService.rejectSeller('seller-1', 'Blurry PAN card');
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN_SELLERS.REJECT('seller-1'), {
      reason: 'Blurry PAN card',
    });
  });

  it('suspendSeller sends POST with suspension reason', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await AdminSellerService.suspendSeller('seller-1', 'Policy breach');
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN_SELLERS.SUSPEND('seller-1'), {
      reason: 'Policy breach',
    });
  });

  it('reactivateSeller sends POST to reactivate endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await AdminSellerService.reactivateSeller('seller-1');
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN_SELLERS.REACTIVATE('seller-1'), {});
  });
});
