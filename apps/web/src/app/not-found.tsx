import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-surface-subtle">
      <div className="mb-6 flex justify-center">
        <Logo variant="hero" align="center" priority />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-card">
        <span className="text-8xl font-extrabold text-brand tracking-tight">404!</span>
        <h1 className="mt-2 text-xl font-bold text-ink">Page Not Found</h1>
        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
          The grocery aisle or page you are looking for does not exist or has been moved to another
          location.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button variant="brand" size="md" leftIcon={<Home className="h-4 w-4" />}>
              Return to Storefront
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
