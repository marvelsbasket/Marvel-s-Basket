import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-cta text-ink hover:bg-cta-hover shadow-cta font-bold rounded-full border border-yellow-400/20',
        brand: 'bg-brand text-white hover:bg-forest shadow-sm font-semibold rounded-lg',
        secondary: 'bg-surface text-ink hover:bg-gray-200 shadow-sm font-medium rounded-lg',
        outline:
          'border border-border bg-white text-ink hover:bg-surface shadow-sm font-medium rounded-lg',
        ghost: 'bg-transparent text-ink hover:bg-surface font-medium rounded-lg',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm font-medium rounded-lg',
        link: 'text-brand underline-offset-4 hover:underline p-0 h-auto font-medium',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-10 px-4 py-2 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-xl',
        pill: 'h-11 px-6 rounded-full text-sm font-bold',
        icon: 'h-10 w-10 p-0 rounded-full',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'brand',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" aria-hidden="true" />
        )}
        {!isLoading && leftIcon && (
          <span className="mr-2 inline-flex items-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="ml-2 inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
