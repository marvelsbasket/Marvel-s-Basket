'use client';

import React from 'react';
import { Header } from './header';
import { Footer } from './footer';

export interface StorefrontLayoutProps {
  children: React.ReactNode;
  cartItemCount?: number;
  currentLocation?: string;
  onLocationChange?: (location: string) => void;
  onSearch?: (query: string) => void;
}

export function StorefrontLayout({
  children,
  cartItemCount = 0,
  currentLocation = 'Azamgarh, UP',
  onLocationChange,
  onSearch,
}: StorefrontLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header
        cartItemCount={cartItemCount}
        currentLocation={currentLocation}
        onLocationChange={onLocationChange}
        onSearch={onSearch}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
