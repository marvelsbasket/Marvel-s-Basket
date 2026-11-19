export type {
  AuthTokens,
  AuthUser,
  LoginRequest,
  LoginResponseData,
  RegisterRequest,
  ResendOtpRequest,
  VerifyEmailRequest,
} from '@marvels-basket/shared';

export interface AuthState {
  user: import('@marvels-basket/shared').AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: import('@marvels-basket/shared').LoginRequest) => Promise<void>;
  register: (data: import('@marvels-basket/shared').RegisterRequest) => Promise<void>;
  verifyEmail: (data: import('@marvels-basket/shared').VerifyEmailRequest) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
