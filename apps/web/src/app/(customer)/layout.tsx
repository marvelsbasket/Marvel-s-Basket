'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, MapPin, Settings, ShoppingBag, User } from 'lucide-react';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import { AuthGuard } from '@/features/auth';
import { cn } from '@/lib/utils';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const customerNavItems = [
    {
      label: 'My Profile',
      href: '/profile',
      icon: User,
      isActive: pathname === '/profile' || pathname === '/profile/edit',
    },
    {
      label: 'Delivery Addresses',
      href: '/addresses',
      icon: MapPin,
      isActive: pathname.startsWith('/addresses'),
    },
    {
      label: 'Account & Preferences',
      href: '/account',
      icon: Settings,
      isActive: pathname.startsWith('/account'),
    },
    {
      label: 'My Basket',
      href: '/basket',
      icon: ShoppingBag,
      isActive: pathname.startsWith('/basket'),
    },
  ];

  return (
    <StorefrontLayout>
      <AuthGuard>
        <div className="bg-surface-subtle min-h-[calc(100vh-140px)] py-4 sm:py-8">
          <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
            {/* Responsive Layout Grid: Desktop Sidebar + Main Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Desktop Account Sidebar (Hidden on mobile & small tablets) */}
              <aside className="hidden lg:block lg:col-span-1">
                <div className="sticky top-28 rounded-2xl border border-border bg-white p-4 shadow-card">
                  <div className="px-3 py-2 border-b border-border/60 mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Customer Account
                    </h3>
                  </div>
                  <nav className="space-y-1">
                    {customerNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                            item.isActive
                              ? 'bg-brand/10 text-brand font-bold'
                              : 'text-ink-muted hover:bg-surface hover:text-ink',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              {/* Main Customer Screen Area */}
              <section className="lg:col-span-3">{children}</section>
            </div>
          </div>
        </div>
      </AuthGuard>
    </StorefrontLayout>
  );
}
