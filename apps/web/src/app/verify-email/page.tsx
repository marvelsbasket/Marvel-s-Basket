'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/shared';
import { Button, Input } from '@/components/ui';
import { Spinner } from '@/components/feedback';
import { useAuth } from '@/features/auth';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const { verifyEmail, resendOtp } = useAuth();

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit numeric verification OTP.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      await verifyEmail({ email, otp });
      setSuccessMessage('Email verified successfully! You can now log in.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Invalid or expired OTP. Please try again or request a new code.';
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      await resendOtp(email);
      setSuccessMessage('A fresh verification code has been sent to your email.');
      setCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification OTP.';
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-surface-subtle py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-ink-muted transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo variant="full" linkToHome priority />
        </div>
        <h1 className="mt-6 text-center text-2xl font-black tracking-tight text-ink">
          Verify Your Email
        </h1>
        <p className="mt-2 text-center text-xs text-ink-muted">
          We&apos;ve sent a 6-digit verification code to your email address.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-card">
          {errorMessage && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 animate-in fade-in duration-200">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-brand animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-ink-muted" />}
              />
            </div>

            <div>
              <Input
                label="6-Digit Verification Code"
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                leftIcon={<KeyRound className="h-4 w-4 text-ink-muted" />}
                className="text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="brand"
                size="lg"
                fullWidth
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                disabled={isVerifying || otp.length !== 6}
                isLoading={isVerifying}
              >
                Verify Email
              </Button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs">
            <span className="text-ink-muted">Didn&apos;t receive code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="flex items-center gap-1 font-bold text-brand transition-colors hover:underline disabled:opacity-50 disabled:no-underline"
            >
              <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span>Single-use OTP valid for 5 minutes</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
