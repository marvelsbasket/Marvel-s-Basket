import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'rounded' | 'circle' | 'pill';
}

export function Skeleton({ className, shape = 'rounded', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        shape === 'rounded' && 'rounded-lg',
        shape === 'circle' && 'rounded-full',
        shape === 'pill' && 'rounded-full',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border-card bg-white shadow-card">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function CategoryTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="h-20 w-20 rounded-tile" />
      <Skeleton className="h-3 w-14" />
    </div>
  );
}
