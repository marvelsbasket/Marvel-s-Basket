import {
  CreateAddressRequest,
  CustomerAddressResponse,
  UpdateAddressRequest,
} from '@marvels-basket/shared';
import { api, ENDPOINTS } from '@/lib/api';

export const addressService = {
  /**
   * Retrieves all saved addresses for the authenticated customer.
   */
  async list(): Promise<CustomerAddressResponse[]> {
    const res = await api.get<CustomerAddressResponse[]>(ENDPOINTS.ADDRESSES.LIST);
    return res.data;
  },

  /**
   * Adds a new delivery address.
   */
  async create(payload: CreateAddressRequest): Promise<CustomerAddressResponse> {
    const res = await api.post<CustomerAddressResponse>(ENDPOINTS.ADDRESSES.CREATE, payload);
    return res.data;
  },

  /**
   * Retrieves single address details by ID.
   */
  async getById(id: string): Promise<CustomerAddressResponse> {
    const res = await api.get<CustomerAddressResponse>(ENDPOINTS.ADDRESSES.DETAIL(id));
    return res.data;
  },

  /**
   * Updates an existing address.
   */
  async update(id: string, payload: UpdateAddressRequest): Promise<CustomerAddressResponse> {
    const res = await api.patch<CustomerAddressResponse>(ENDPOINTS.ADDRESSES.UPDATE(id), payload);
    return res.data;
  },

  /**
   * Deletes a delivery address.
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(
      ENDPOINTS.ADDRESSES.DELETE(id),
    );
    return res.data;
  },

  /**
   * Sets the specified address as the customer default address.
   */
  async setDefault(id: string): Promise<CustomerAddressResponse> {
    const res = await api.patch<CustomerAddressResponse>(ENDPOINTS.ADDRESSES.SET_DEFAULT(id));
    return res.data;
  },
};
