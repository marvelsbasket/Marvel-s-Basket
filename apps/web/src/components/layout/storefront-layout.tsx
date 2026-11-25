'use client';

import React from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileFloatingBasket } from './mobile-floating-basket';
import { useBasket } from '@/features/basket/context/basket-context';

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
  cartItemCount,
  currentLocation,
  onLocationChange,
  onSearch,
  hideMobileNav = false,
  hideMobileHeader = false,
  hideMobileFooter = false,
}: StorefrontLayoutProps) {
  const { basket } = useBasket();
  const itemCount = basketItemCount ?? cartItemCount ?? basket.totalUnits;

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
      <main className={`flex-1 md:pb-0 ${basket.totalUnits > 0 ? 'pb-36' : 'pb-20'}`}>
        {children}
      </main>
      <div className={hideMobileFooter ? 'hidden md:block' : ''}>
        <Footer />
      </div>
      {!hideMobileNav && <MobileFloatingBasket />}
      {!hideMobileNav && <MobileBottomNav basketItemCount={itemCount} />}
    </div>
  );
}
