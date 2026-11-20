'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AuthUser,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
} from '@marvels-basket/shared';
import { authService } from '../services/auth.service';
import { AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = authService.initToken();
      if (!token) {
        setUser(null);
        return;
      }

      const userData = await authService.getMe();
      setUser(userData);
    } catch {
      // Token is expired, invalid or server rejected
      authService.setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized);
      return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }
  }, [initAuth]);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      return await authService.register(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (data: VerifyEmailRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.verifyEmail(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email verification failed.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    try {
      await authService.resendOtp(email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not resend OTP.';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch {
      // Ignored
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        verifyEmail,
        resendOtp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
