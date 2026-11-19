import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 select-none',
  {
    variants: {
      variant: {
        highlight: 'bg-highlight text-highlight-dark border border-lime-400/30 font-bold',
        brand: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold',
        cta: 'bg-cta text-ink border border-yellow-300 font-bold',
        neutral: 'bg-surface text-ink-secondary border border-border font-medium',
        outline: 'border border-border bg-white text-ink-secondary font-medium',
        success: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
        warning: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
        destructive: 'bg-red-100 text-red-800 border border-red-300 font-semibold',
      },
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded-md',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      shape: 'pill',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function Badge({ className, variant, shape, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, shape, className }))} {...props}>
      {icon && <span className="mr-1 inline-flex items-center">{icon}</span>}
      {children}
    </div>
  );
}
