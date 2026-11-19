'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, checked, disabled, ...props }, ref) => {
    const radioId =
      id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label
        htmlFor={radioId}
        className={cn(
          'inline-flex items-start gap-2.5 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <div className="relative flex items-center justify-center pt-0.5">
          <input
            ref={ref}
            id={radioId}
            type="radio"
            checked={checked}
            disabled={disabled}
            className={cn(
              'peer h-4 w-4 shrink-0 appearance-none rounded-full border border-border bg-white transition-all',
              'checked:border-brand',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
              className,
            )}
            {...props}
          />
          <span className="pointer-events-none absolute h-2 w-2 rounded-full bg-brand opacity-0 transition-opacity peer-checked:opacity-100" />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm font-medium text-ink">{label}</span>}
            {description && <span className="text-xs text-ink-muted">{description}</span>}
          </div>
        )}
      </label>
    );
  },
);

Radio.displayName = 'Radio';
