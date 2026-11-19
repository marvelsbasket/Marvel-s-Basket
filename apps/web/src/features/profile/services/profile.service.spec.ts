import { api } from '@/lib/api';
import { profileService } from './profile.service';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  ENDPOINTS: {
    USERS: {
      ME: '/users/me',
      ACCOUNT: '/users/me/account',
      PREFERENCES: '/users/me/preferences',
      DEACTIVATE: '/users/me/deactivate',
    },
  },
}));

describe('profileService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call get on /users/me and return profile data', async () => {
    const mockProfile = {
      id: '1',
      userId: 'u1',
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
    };
    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockProfile });

    const result = await profileService.getProfile();

    expect(api.get).toHaveBeenCalledWith('/users/me');
    expect(result).toEqual(mockProfile);
  });

  it('should call patch on /users/me with updated fields', async () => {
    const updatePayload = { name: 'Rohan S.' };
    const mockUpdated = { id: '1', name: 'Rohan S.' };
    (api.patch as jest.Mock).mockResolvedValueOnce({ data: mockUpdated });

    const result = await profileService.updateProfile(updatePayload);

    expect(api.patch).toHaveBeenCalledWith('/users/me', updatePayload);
    expect(result).toEqual(mockUpdated);
  });

  it('should call get on /users/me/account', async () => {
    const mockOverview = { userId: 'u1', totalAddresses: 2 };
    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockOverview });

    const result = await profileService.getAccountOverview();

    expect(api.get).toHaveBeenCalledWith('/users/me/account');
    expect(result).toEqual(mockOverview);
  });

  it('should call get and patch on /users/me/preferences', async () => {
    const mockPrefs = { emailNotifications: true };
    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockPrefs });
    (api.patch as jest.Mock).mockResolvedValueOnce({ data: { emailNotifications: false } });

    const getRes = await profileService.getPreferences();
    expect(api.get).toHaveBeenCalledWith('/users/me/preferences');
    expect(getRes).toEqual(mockPrefs);

    const patchRes = await profileService.updatePreferences({ emailNotifications: false });
    expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { emailNotifications: false });
    expect(patchRes).toEqual({ emailNotifications: false });
  });

  it('should call patch on /users/me/deactivate', async () => {
    (api.patch as jest.Mock).mockResolvedValueOnce({
      data: { success: true, message: 'Deactivated' },
    });

    const result = await profileService.deactivateAccount();
    expect(api.patch).toHaveBeenCalledWith('/users/me/deactivate');
    expect(result.success).toBe(true);
  });
});
