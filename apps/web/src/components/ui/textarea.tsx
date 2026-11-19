import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-1.5 block text-xs font-semibold text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3.5 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60',
            error && 'border-red-500 focus-visible:ring-red-500',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1 text-xs font-medium text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && helperText && <p className="mt-1 text-xs text-ink-muted">{helperText}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
