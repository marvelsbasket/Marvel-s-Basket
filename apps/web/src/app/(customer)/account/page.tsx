'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AccountOverviewResponse, AccountPreferencesResponse } from '@marvels-basket/shared';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { AccountSettingsCard, profileService } from '@/features/profile';

export default function AccountPage() {
  const [overview, setOverview] = useState<AccountOverviewResponse | null>(null);
  const [preferences, setPreferences] = useState<AccountPreferencesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, prefData] = await Promise.all([
        profileService.getAccountOverview(),
        profileService.getPreferences().catch(() => null),
      ]);
      setOverview(overviewData);
      setPreferences(prefData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load account settings.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const handleLogout = () => {
    // Redirect to login or clear auth session
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <ErrorState
          title="Settings Unavailable"
          message={error || 'Could not retrieve your account information.'}
          onRetry={fetchAccountData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Account & Preferences</h1>
          <p className="text-xs text-ink-muted">
            Manage communication, alerts, and account security
          </p>
        </div>
      </div>

      {/* Account Settings Component */}
      <AccountSettingsCard
        overview={overview}
        initialPreferences={preferences}
        onLogout={handleLogout}
      />
    </div>
  );
}
