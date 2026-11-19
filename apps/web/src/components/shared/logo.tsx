import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface LogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'large' | 'footer';
  theme?: 'light' | 'dark';
  className?: string;
  linkToHome?: boolean;
  priority?: boolean;
}

export function Logo({
  variant = 'compact',
  theme = 'light',
  className,
  linkToHome = true,
  priority = true,
}: LogoProps) {
  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/images/logo-dark.jpg' : '/images/logo.png';

  // Adjust dimensions based on variant (3:2 aspect ratio matching official logo 1024x682)
  const sizeClasses = {
    icon: 'h-10 w-10',
    compact: 'h-12 w-28 md:h-14 md:w-32',
    full: 'h-16 w-36 md:h-20 md:w-48',
    large: 'h-20 w-44 md:h-24 md:w-52',
    footer: 'h-24 w-36 sm:h-28 sm:w-44 md:h-32 md:w-52',
  }[variant];

  const sizesAttr = {
    icon: '40px',
    compact: '(max-width: 768px) 112px, 128px',
    full: '(max-width: 768px) 144px, 192px',
    large: '(max-width: 768px) 176px, 208px',
    footer: '(max-width: 768px) 176px, 220px',
  }[variant];

  const content = (
    <div
      className={cn(
        'relative flex-shrink-0 transition-opacity hover:opacity-95 select-none',
        sizeClasses,
        className,
      )}
    >
      <Image
        src={logoSrc}
        alt="Marvel's Basket"
        fill
        sizes={sizesAttr}
        priority={priority}
        className="object-contain object-left"
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
