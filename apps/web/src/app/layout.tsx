import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/features/auth';
import { LocationProvider } from '@/features/location/context/location-context';
import { BasketProvider } from '@/features/basket/context/basket-context';
import './globals.css';

export const metadata: Metadata = {
  title: "Marvel's Basket — Groceries & Daily Essentials Delivered Fast",
  description:
    'Hyperlocal grocery marketplace delivering fresh produce, daily essentials, and household goods from local stores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white text-ink antialiased">
        <AuthProvider>
          <LocationProvider>
            <BasketProvider>{children}</BasketProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
