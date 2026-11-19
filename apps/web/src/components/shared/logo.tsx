import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface LogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'large' | 'footer' | 'hero';
  theme?: 'light' | 'dark';
  className?: string;
  linkToHome?: boolean;
  priority?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function Logo({
  variant = 'compact',
  theme = 'light',
  className,
  linkToHome = true,
  priority = true,
  align = 'left',
}: LogoProps) {
  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/images/logo-dark.jpg' : '/images/logo.png';

  // Adjust dimensions based on variant (3:2 aspect ratio matching official logo 1024x682)
  const sizeClasses: Record<string, string> = {
    icon: 'h-10 w-10',
    compact: 'h-12 w-28 md:h-14 md:w-32',
    full: 'h-16 w-36 md:h-20 md:w-48',
    large: 'h-20 w-44 md:h-24 md:w-52',
    footer: 'h-24 w-36 sm:h-28 sm:w-44 md:h-32 md:w-52',
    hero: 'h-28 w-44 sm:h-36 sm:w-56 md:h-40 md:w-64',
  };

  const sizesAttr: Record<string, string> = {
    icon: '40px',
    compact: '(max-width: 768px) 112px, 128px',
    full: '(max-width: 768px) 144px, 192px',
    large: '(max-width: 768px) 176px, 208px',
    footer: '(max-width: 768px) 176px, 220px',
    hero: '(max-width: 768px) 224px, 256px',
  };

  const alignClasses: Record<string, string> = {
    left: 'object-left',
    center: 'object-center',
    right: 'object-right',
  };

  const content = (
    <div
      className={cn(
        'relative flex-shrink-0 transition-opacity hover:opacity-95 select-none',
        sizeClasses[variant] ?? sizeClasses.compact,
        className,
      )}
    >
      <Image
        src={logoSrc}
        alt="Marvel's Basket"
        fill
        sizes={sizesAttr[variant] ?? sizesAttr.compact}
        priority={priority}
        className={cn('object-contain', alignClasses[align] ?? 'object-left')}
      />
    </div>
  );

  if (!linkToHome) {
    return content;
  }

  return (
    <Link href="/" aria-label="Marvel's Basket Homepage" className="inline-flex">
      {content}
    </Link>
  );
}
