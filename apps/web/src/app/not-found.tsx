import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-surface-subtle">
      <div className="max-w-md rounded-2xl border border-border bg-white p-8 shadow-card">
        <span className="text-9xl font-extrabold text-brand">404!</span>
        <h1 className="mt-2 text-xl font-bold text-ink">Page Not Found</h1>
        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
          The grocery aisle or page you are looking for does not exist or has been moved to another
          location.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="brand" size="sm" leftIcon={<Home className="h-4 w-4" />}>
              Return to Storefront
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
