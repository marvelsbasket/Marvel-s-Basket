'use client';

import React from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { MobileBottomNav } from './mobile-bottom-nav';

export interface StorefrontLayoutProps {
  children: React.ReactNode;
  basketItemCount?: number;
  cartItemCount?: number;
  currentLocation?: string;
  onLocationChange?: (location: string) => void;
  onSearch?: (query: string) => void;
  hideMobileNav?: boolean;
  hideMobileHeader?: boolean;
  hideMobileFooter?: boolean;
}

export function StorefrontLayout({
  children,
  basketItemCount,
  cartItemCount = 0,
  currentLocation = 'Azamgarh, UP',
  onLocationChange,
  onSearch,
  hideMobileNav = false,
  hideMobileHeader = false,
  hideMobileFooter = false,
}: StorefrontLayoutProps) {
  const itemCount = basketItemCount ?? cartItemCount;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className={hideMobileHeader ? 'hidden md:block' : ''}>
        <Header
          basketItemCount={itemCount}
          currentLocation={currentLocation}
          onLocationChange={onLocationChange}
          onSearch={onSearch}
        />
      </div>
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <div className={hideMobileFooter ? 'hidden md:block' : ''}>
        <Footer />
      </div>
      {!hideMobileNav && <MobileBottomNav basketItemCount={itemCount} />}
    </div>
  );
}
