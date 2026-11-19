'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { Spinner } from '@/components/feedback';
import { useAuth } from '../context/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname || '/profile')}`;
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-sm font-medium text-ink-muted">Verifying secure authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-divider bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-ink">Sign In Required</h2>
          <p className="mt-2 text-sm text-ink-muted">
            You must be logged in to access this page. Redirecting to the login screen...
          </p>
          <div className="mt-6">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname || '/profile')}`}
              className="inline-block w-full"
            >
              <Button variant="brand" size="lg" fullWidth leftIcon={<LogIn className="h-4 w-4" />}>
                Proceed to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
