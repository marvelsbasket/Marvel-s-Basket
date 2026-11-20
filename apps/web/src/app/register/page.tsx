'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Logo } from '@/components/shared';
import { Button, Input } from '@/components/ui';
import { Spinner } from '@/components/feedback';
import { useAuth } from '@/features/auth';
import { ApiError } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await register({
        name,
        email,
        password,
        phone: phone ? `+91${phone.replace(/\D/g, '')}` : undefined,
      });

      const noticeParam = res?.isExistingUnverified ? '&notice=existing_unverified' : '';
      const cooldownParam = res?.cooldownRemainingSeconds
        ? `&cooldown=${res.cooldownRemainingSeconds}`
        : '';

      router.push(`/verify-email?email=${encodeURIComponent(email)}${noticeParam}${cooldownParam}`);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        (err.code === 'EMAIL_NOT_VERIFIED' || err.isEmailNotVerified)
      ) {
        const errData = err.data as
          { email?: string; cooldownRemainingSeconds?: number } | undefined;
        const targetEmail = errData?.email || email;
        const cooldownParam = errData?.cooldownRemainingSeconds
          ? `&cooldown=${errData.cooldownRemainingSeconds}`
          : '';
        router.push(
          `/verify-email?email=${encodeURIComponent(targetEmail)}&notice=existing_unverified${cooldownParam}`,
        );
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : 'Registration failed. Email or phone may already be registered.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
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
          Create Customer Account
        </h1>
        <p className="mt-2 text-center text-xs text-ink-muted">
          Join Marvel&apos;s Basket for fast doorstep delivery from your local supermarkets.
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
                label="Full Name *"
                type="text"
                required
                placeholder="Rohan Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="h-4 w-4 text-ink-muted" />}
              />
            </div>

            <div>
              <Input
                label="Email Address *"
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
              <Input
                label="Mobile Phone (Optional)"
                type="tel"
                placeholder="9876543210 (10 digits)"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                leftIcon={<Phone className="h-4 w-4 text-ink-muted" />}
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Password *"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
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

            <div className="rounded-xl bg-surface p-3 text-[11px] text-ink-muted space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                <span>At least 8 characters long</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                <span>Single-use email verification OTP will be sent</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="brand"
                size="lg"
                fullWidth
                leftIcon={<User className="h-4 w-4" />}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-ink-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-brand hover:underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Security Trust Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span>Protected by single-use email verification</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
