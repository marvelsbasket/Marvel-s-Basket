'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';

export default function CustomerOrdersPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">My Orders</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Track current grocery deliveries and view past supermarket orders.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 sm:p-12 shadow-card">
        <EmptyState
          icon={<Package className="h-8 w-8 text-brand" />}
          title="No orders placed yet"
          description="You haven't placed any grocery orders yet. Discover verified local supermarkets near you for 10–30 minute express delivery."
          actionLabel="Start Shopping"
          onAction={() => router.push('/')}
        />
      </div>
    </div>
  );
}
