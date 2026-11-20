import { api } from '@/lib/api';
import { authService } from './auth.service';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    setAccessToken: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('setToken / getToken', () => {
    it('should save token to localStorage and update api client', () => {
      authService.setToken('test-token-123');
      expect(localStorageMock.getItem('mb_access_token')).toBe('test-token-123');
      expect(api.setAccessToken).toHaveBeenCalledWith('test-token-123');
    });

    it('should clear token from localStorage and update api client when null', () => {
      localStorageMock.setItem('mb_access_token', 'old-token');
      authService.setToken(null);
      expect(localStorageMock.getItem('mb_access_token')).toBeNull();
      expect(api.setAccessToken).toHaveBeenCalledWith(null);
    });
  });

  describe('login', () => {
    it('should post credentials and save access token', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'u1',
            email: 'test@example.com',
            name: 'Test User',
            roles: ['CUSTOMER'],
            status: 'ACTIVE',
          },
          tokens: { accessToken: 'jwt-token-xyz' },
        },
      };
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(localStorageMock.getItem('mb_access_token')).toBe('jwt-token-xyz');
      expect(result.tokens.accessToken).toBe('jwt-token-xyz');
    });
  });

  describe('register', () => {
    it('should call register endpoint and return response data', async () => {
      const mockResponse = {
        success: true,
        data: {
          message:
            "An account with this email already exists but is not verified. We've sent you a new verification code.",
          userId: 'u1',
          email: 'test@example.com',
          isExistingUnverified: true,
          requiresVerification: true,
          cooldownRemainingSeconds: 60,
        },
      };
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('verifyEmail', () => {
    it('should post verification OTP payload', async () => {
      const mockResponse = {
        success: true,
        data: { message: 'Email verified.', verified: true },
      };
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authService.verifyEmail({
        email: 'test@example.com',
        otp: '123456',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
        email: 'test@example.com',
        otp: '123456',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resendOtp', () => {
    it('should post email to resend-verification-otp endpoint', async () => {
      const mockResponse = {
        success: true,
        data: { message: 'OTP resent.', cooldownRemainingSeconds: 60 },
      };
      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authService.resendOtp('test@example.com');
      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification-otp', {
        email: 'test@example.com',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getMe', () => {
    it('should fetch authenticated user profile', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['CUSTOMER'],
        status: 'ACTIVE',
      };
      (api.get as jest.Mock).mockResolvedValueOnce({ success: true, data: mockUser });

      const result = await authService.getMe();
      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should call logout endpoint and clear local storage', async () => {
      localStorageMock.setItem('mb_access_token', 'active-token');
      (api.post as jest.Mock).mockResolvedValueOnce({ success: true });

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorageMock.getItem('mb_access_token')).toBeNull();
      expect(api.setAccessToken).toHaveBeenCalledWith(null);
    });
  });
});
