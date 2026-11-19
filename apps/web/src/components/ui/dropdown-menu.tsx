'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'left', className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen((prev) => !prev)} className="inline-flex">
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'absolute z-50 mt-2 min-w-[200px] rounded-xl border border-border bg-white p-1.5 shadow-dropdown',
            'animate-in fade-in-80 zoom-in-95 duration-150',
            alignClasses[align],
            className,
          )}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement<{ onClick?: (e: React.MouseEvent) => void }>(child)) {
              // Pass close handler so clicking an item closes the menu
              const originalOnClick = child.props.onClick;
              return React.cloneElement(child, {
                onClick: (e: React.MouseEvent) => {
                  originalOnClick?.(e);
                  setIsOpen(false);
                },
              });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  destructive?: boolean;
}

export function DropdownItem({
  className,
  icon,
  destructive = false,
  children,
  ...props
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-100 text-left',
        destructive
          ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50'
          : 'text-ink hover:bg-surface focus-visible:bg-surface hover:text-brand',
        className,
      )}
      {...props}
    >
      {icon && <span className="h-4 w-4 shrink-0 text-current">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-border" role="separator" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
      {children}
    </div>
  );
}
