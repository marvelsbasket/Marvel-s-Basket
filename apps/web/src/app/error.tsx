'use client';

import React, { useEffect } from 'react';
import { ErrorState } from '@/components/feedback/error-state';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected frontend errors
    console.error('Unhandled Next.js Application Error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-container items-center justify-center p-6">
      <ErrorState
        title="We encountered an unexpected error"
        message="A technical error occurred while displaying this page. Your data is secure."
        onRetry={() => reset()}
        className="w-full max-w-md shadow-card"
      />
    </div>
  );
}
