'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/shared';
import { Button, Input } from '@/components/ui';
import { Spinner } from '@/components/feedback';
import { useAuth } from '@/features/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/profile';

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to destination
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [authLoading, isAuthenticated, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login({ email, password });
      router.replace(redirectPath);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Invalid email address or password. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDevCustomer = () => {
    setEmail('customer.dev@marvelsbasket.com');
    setPassword('MarvelDevPassword2026!');
    setErrorMessage(null);
  };

  const handleFillDevAdmin = () => {
    setEmail('admin@marvelsbasket.com');
    setPassword('MarvelDevPassword2026!');
    setErrorMessage(null);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-surface-subtle py-12 sm:px-6 lg:px-8">
      {/* Return to Storefront Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-ink-muted transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Storefront</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo variant="full" linkToHome priority />
        </div>
        <h1 className="mt-6 text-center text-2xl font-black tracking-tight text-ink">
          Sign In to Your Account
        </h1>
        <p className="mt-2 text-center text-xs text-ink-muted">
          Access your saved addresses, track grocery orders, and manage preferences.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-card">
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 animate-in fade-in duration-200">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Email Address"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-ink-muted" />}
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-ink-muted" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-ink-muted transition-colors hover:text-ink focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="brand"
                size="lg"
                fullWidth
                leftIcon={<LogIn className="h-4 w-4" />}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Quick Development Demo Credentials */}
          <div className="mt-6 rounded-2xl border border-brand/20 bg-brand/5 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Quick Test Accounts</span>
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              Click below to fill development seed credentials:
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFillDevCustomer}
                className="rounded-lg border border-brand/30 bg-white px-2.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
              >
                Customer Account
              </button>
              <button
                type="button"
                onClick={handleFillDevAdmin}
                className="rounded-lg border border-brand/30 bg-white px-2.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
              >
                Admin Account
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-ink-muted">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-bold text-brand hover:underline">
              Create Account
            </Link>
          </div>
        </div>

        {/* Security Trust Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span>256-bit encrypted authentication &amp; secure session</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
