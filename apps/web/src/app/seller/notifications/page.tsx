'use client';

import React from 'react';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { NotificationCenter } from '@/features/notifications/components/notification-center';

export default function SellerNotificationsPage() {
  return (
    <AuthGuard requiredRoles={['SELLER']}>
      <div className="min-h-screen bg-surface-tile/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <NotificationCenter scope="seller" />
        </div>
      </div>
    </AuthGuard>
  );
}
