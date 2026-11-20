'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Package, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';

export interface MobileBottomNavProps {
  basketItemCount?: number;
}

export function MobileBottomNav({ basketItemCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Categories',
      href: '/categories',
      icon: LayoutGrid,
      isActive: pathname.startsWith('/categories'),
    },
    {
      label: 'Basket',
      href: '/basket',
      icon: ShoppingBag,
      badge: basketItemCount > 0 ? basketItemCount : undefined,
      isActive: pathname.startsWith('/basket') || pathname.startsWith('/cart'),
    },
    {
      label: 'Orders',
      href: '/orders',
      icon: Package,
      isActive: pathname.startsWith('/orders') || pathname.startsWith('/track-order'),
    },
    {
      label: isAuthenticated ? 'Profile' : 'Login',
      href: isAuthenticated ? '/profile' : '/login',
      icon: User,
      isActive: isAuthenticated
        ? pathname.startsWith('/profile') ||
          pathname.startsWith('/account') ||
          pathname.startsWith('/addresses')
        : pathname === '/login',
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-border bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl',
                item.isActive ? 'text-brand font-bold' : 'text-ink-muted hover:text-ink',
              )}
              aria-current={item.isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5',
                    item.isActive ? 'text-brand stroke-[2.2]' : 'text-ink-muted',
                  )}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cta px-1 text-[10px] font-black text-ink shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] leading-tight tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
