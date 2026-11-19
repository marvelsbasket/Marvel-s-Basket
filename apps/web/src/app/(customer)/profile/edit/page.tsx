'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CustomerProfileResponse } from '@marvels-basket/shared';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ProfileForm, profileService } from '@/features/profile';

export default function EditProfilePage() {
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load profile data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <ErrorState
          title="Unable to Edit Profile"
          message={error || 'Could not retrieve current profile details.'}
          onRetry={fetchProfile}
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
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Edit Profile</h1>
          <p className="text-xs text-ink-muted">Update your display name, photo, and details</p>
        </div>
      </div>

      {/* Edit Form */}
      <ProfileForm initialProfile={profile} />
    </div>
  );
}
