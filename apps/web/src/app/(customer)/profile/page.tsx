'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, Settings, ShieldCheck } from 'lucide-react';
import { CustomerProfileResponse, AccountOverviewResponse } from '@marvels-basket/shared';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ProfileHeader, profileService } from '@/features/profile';

export default function ProfilePage() {
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [overview, setOverview] = useState<AccountOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileData, overviewData] = await Promise.all([
        profileService.getProfile(),
        profileService.getAccountOverview().catch(() => null),
      ]);
      setProfile(profileData);
      setOverview(overviewData);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load customer profile. Please check your connection and sign in.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-36 rounded-2xl bg-white border border-border p-6 flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <ErrorState
          title="Profile Unavailable"
          message={error || 'Could not retrieve your profile details.'}
          onRetry={fetchProfileData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Profile Header Card */}
      <ProfileHeader profile={profile} />

      {/* 2. Mobile Quick Access Cards (BigBasket Pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Link
          href="/addresses"
          className="group flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-card transition-all hover:border-brand/40 hover:shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink group-hover:text-brand transition-colors">
                Delivery Addresses
              </h3>
              <p className="text-xs text-ink-muted">
                {overview
                  ? `${overview.totalAddresses} saved address(es)`
                  : 'Manage saved locations'}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-subtle group-hover:text-brand transition-colors" />
        </Link>

        <Link
          href="/account"
          className="group flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-card transition-all hover:border-brand/40 hover:shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink group-hover:text-brand transition-colors">
                Account & Preferences
              </h3>
              <p className="text-xs text-ink-muted">Notifications, communication & security</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-subtle group-hover:text-brand transition-colors" />
        </Link>
      </div>

      {/* 3. Account Highlights & Trust Info */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          Account Status & Trust
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/80 bg-surface p-3.5">
            <span className="text-[11px] font-semibold text-ink-muted">Account Status</span>
            <p className="text-sm font-bold text-brand uppercase mt-0.5">{profile.status}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface p-3.5">
            <span className="text-[11px] font-semibold text-ink-muted">Email Verification</span>
            <p className="text-sm font-bold text-success mt-0.5 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              {profile.isEmailVerified ? 'Verified' : 'Pending'}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface p-3.5">
            <span className="text-[11px] font-semibold text-ink-muted">Active Role</span>
            <p className="text-sm font-bold text-ink uppercase mt-0.5">
              {profile.roles.join(', ') || 'Customer'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
