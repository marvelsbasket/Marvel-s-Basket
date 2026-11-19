import { api } from '@/lib/api';
import { addressService } from './address.service';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  ENDPOINTS: {
    ADDRESSES: {
      LIST: '/addresses',
      CREATE: '/addresses',
      DETAIL: (id: string) => `/addresses/${id}`,
      UPDATE: (id: string) => `/addresses/${id}`,
      DELETE: (id: string) => `/addresses/${id}`,
      SET_DEFAULT: (id: string) => `/addresses/${id}/default`,
    },
  },
}));

describe('addressService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockAddress = {
    id: 'addr-1',
    label: 'Home',
    recipientName: 'Rohan Sharma',
    phone: '9876543210',
    addressLine1: 'Civil Lines',
    city: 'Azamgarh',
    state: 'Uttar Pradesh',
    postalCode: '276001',
    isDefault: true,
  };

  it('should list customer addresses', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: [mockAddress] });

    const result = await addressService.list();

    expect(api.get).toHaveBeenCalledWith('/addresses');
    expect(result).toEqual([mockAddress]);
  });

  it('should create an address', async () => {
    const payload = {
      label: 'Home',
      recipientName: 'Rohan Sharma',
      phone: '9876543210',
      addressLine1: 'Civil Lines',
      city: 'Azamgarh',
      state: 'Uttar Pradesh',
      postalCode: '276001',
    };
    (api.post as jest.Mock).mockResolvedValueOnce({ data: mockAddress });

    const result = await addressService.create(payload);

    expect(api.post).toHaveBeenCalledWith('/addresses', payload);
    expect(result).toEqual(mockAddress);
  });

  it('should get an address by ID', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockAddress });

    const result = await addressService.getById('addr-1');

    expect(api.get).toHaveBeenCalledWith('/addresses/addr-1');
    expect(result).toEqual(mockAddress);
  });

  it('should update an address', async () => {
    const updatePayload = { label: 'Work' };
    (api.patch as jest.Mock).mockResolvedValueOnce({ data: { ...mockAddress, label: 'Work' } });

    const result = await addressService.update('addr-1', updatePayload);

    expect(api.patch).toHaveBeenCalledWith('/addresses/addr-1', updatePayload);
    expect(result.label).toBe('Work');
  });

  it('should delete an address', async () => {
    (api.delete as jest.Mock).mockResolvedValueOnce({
      data: { success: true, message: 'Deleted' },
    });

    const result = await addressService.delete('addr-1');

    expect(api.delete).toHaveBeenCalledWith('/addresses/addr-1');
    expect(result.success).toBe(true);
  });

  it('should set an address as default', async () => {
    (api.patch as jest.Mock).mockResolvedValueOnce({ data: { ...mockAddress, isDefault: true } });

    const result = await addressService.setDefault('addr-1');

    expect(api.patch).toHaveBeenCalledWith('/addresses/addr-1/default');
    expect(result.isDefault).toBe(true);
  });
});
