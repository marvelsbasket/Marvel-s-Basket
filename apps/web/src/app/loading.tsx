import React from 'react';
import { Spinner } from '@/components/feedback/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3">
      <Spinner size="lg" variant="brand" />
      <p className="text-xs font-semibold text-ink-muted animate-pulse">
        Loading Marvel&apos;s Basket...
      </p>
    </div>
  );
}
