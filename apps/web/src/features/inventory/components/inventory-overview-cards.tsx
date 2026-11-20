'use client';

import React from 'react';
import { InventoryOverviewMetrics } from '@marvels-basket/shared';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Boxes,
  Lock,
  ShoppingBag,
} from 'lucide-react';

interface InventoryOverviewCardsProps {
  metrics: InventoryOverviewMetrics | null;
  loading?: boolean;
}

export function InventoryOverviewCards({ metrics, loading }: InventoryOverviewCardsProps) {
  const cards = [
    {
      title: 'Total Listed',
      value: metrics?.totalListedProducts ?? 0,
      icon: Package,
      color: 'text-brand',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'Active Listings',
      value: metrics?.activeListings ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/60',
      border: 'border-emerald-100',
    },
    {
      title: 'Low Stock Alert',
      value: metrics?.lowStockListings ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      title: 'Out of Stock',
      value: metrics?.outOfStockListings ?? 0,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      title: 'Stock on Hand',
      value: metrics?.totalStockOnHand ?? 0,
      subtitle: 'Physical inventory units',
      icon: Boxes,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      title: 'Reserved Units',
      value: metrics?.totalReservedStock ?? 0,
      subtitle: 'Active checkout carts',
      icon: Lock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
    {
      title: 'Available to Sell',
      value: metrics?.totalAvailableStock ?? 0,
      subtitle: 'Stock on Hand – Reserved',
      icon: ShoppingBag,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`border ${card.border} bg-white shadow-xs overflow-hidden transition-all hover:shadow-sm`}
          >
            <CardContent className="p-3.5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider truncate">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.bg} ${card.color} shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-ink tracking-tight">
                  {loading ? '—' : card.value.toLocaleString()}
                </div>
                {card.subtitle && (
                  <p className="text-[10px] text-ink-muted truncate mt-0.5">{card.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
