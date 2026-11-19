import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'brand' | 'white' | 'muted';
  className?: string;
  label?: string;
}

export function Spinner({
  size = 'md',
  variant = 'brand',
  className,
  label = 'Loading...',
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const variantClasses = {
    brand: 'text-brand',
    white: 'text-white',
    muted: 'text-ink-muted',
  };

  return (
    <div role="status" className="inline-flex items-center justify-center gap-2" aria-label={label}>
      <Loader2
        className={cn('animate-spin', sizeClasses[size], variantClasses[variant], className)}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
