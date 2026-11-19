import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-surface-subtle',
        className,
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-brand">
        {icon || <PackageOpen className="h-8 w-8" />}
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-ink-muted leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="brand" size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
