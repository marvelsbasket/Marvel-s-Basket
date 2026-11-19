import {
  AccountOverviewResponse,
  AccountPreferencesResponse,
  CustomerProfileResponse,
  UpdateAccountPreferencesRequest,
  UpdateProfileRequest,
} from '@marvels-basket/shared';
import { api, ENDPOINTS } from '@/lib/api';

export const profileService = {
  /**
   * Retrieves the current customer profile.
   */
  async getProfile(): Promise<CustomerProfileResponse> {
    const res = await api.get<CustomerProfileResponse>(ENDPOINTS.USERS.ME);
    return res.data;
  },

  /**
   * Updates personal profile information (name, avatar, date of birth).
   */
  async updateProfile(payload: UpdateProfileRequest): Promise<CustomerProfileResponse> {
    const res = await api.patch<CustomerProfileResponse>(ENDPOINTS.USERS.ME, payload);
    return res.data;
  },

  /**
   * Retrieves account metadata and address count.
   */
  async getAccountOverview(): Promise<AccountOverviewResponse> {
    const res = await api.get<AccountOverviewResponse>(ENDPOINTS.USERS.ACCOUNT);
    return res.data;
  },

  /**
   * Retrieves notification and communication preferences.
   */
  async getPreferences(): Promise<AccountPreferencesResponse> {
    const res = await api.get<AccountPreferencesResponse>(ENDPOINTS.USERS.PREFERENCES);
    return res.data;
  },

  /**
   * Updates notification and communication preferences.
   */
  async updatePreferences(
    payload: UpdateAccountPreferencesRequest,
  ): Promise<AccountPreferencesResponse> {
    const res = await api.patch<AccountPreferencesResponse>(ENDPOINTS.USERS.PREFERENCES, payload);
    return res.data;
  },

  /**
   * Deactivates the customer account.
   */
  async deactivateAccount(): Promise<{ success: boolean; message: string }> {
    const res = await api.patch<{ success: boolean; message: string }>(ENDPOINTS.USERS.DEACTIVATE);
    return res.data;
  },
};
