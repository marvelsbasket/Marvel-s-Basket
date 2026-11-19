'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CheckCircle2, Edit3, Mail, ShieldAlert } from 'lucide-react';
import { CustomerProfileResponse } from '@marvels-basket/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ProfileHeaderProps {
  profile: CustomerProfileResponse;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const [hasImageError, setHasImageError] = useState(false);

  // Extract initials for avatar fallback
  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MB';

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
      {/* Decorative Brand Accent Bar */}
      <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-brand to-brand-accent" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar / Initials */}
          <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-xl font-black text-brand ring-4 ring-brand/5 sm:h-20 sm:w-20 sm:text-2xl">
            {profile.avatarUrl && !hasImageError ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                sizes="80px"
                className="rounded-2xl object-cover"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Identity & Verification Status */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {profile.name}
              </h1>
              {profile.isEmailVerified ? (
                <Badge variant="success">
                  <CheckCircle2 className="mr-1 h-3 w-3 inline" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning">
                  <ShieldAlert className="mr-1 h-3 w-3 inline" />
                  Unverified
                </Badge>
              )}
            </div>

            <p className="mt-1 flex items-center text-xs text-ink-muted sm:text-sm">
              <Mail className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-ink-subtle" />
              <span className="truncate">{profile.email}</span>
            </p>

            {memberSince && (
              <p className="mt-0.5 flex items-center text-[11px] text-ink-subtle sm:text-xs">
                <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                Member since {memberSince}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex sm:self-center">
          <Link href="/profile/edit" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={<Edit3 className="h-4 w-4" />}
            >
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
