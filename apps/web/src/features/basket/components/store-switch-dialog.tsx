'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, Store } from 'lucide-react';
import { BasketStoreInfo } from '@marvels-basket/shared';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StoreSwitchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: BasketStoreInfo | null;
  targetStoreName: string;
  itemName: string;
  isSubmitting?: boolean;
  onConfirmSwitch: () => Promise<void>;
}

export function StoreSwitchDialog({
  isOpen,
  onClose,
  currentStore,
  targetStoreName,
  itemName,
  isSubmitting = false,
  onConfirmSwitch,
}: StoreSwitchDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2 text-ink">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span>Replace Basket Items?</span>
        </div>
      }
      description="Marvel's Basket fulfills each order from a single neighborhood store for faster 15–30 minute delivery."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Keep Current Basket
          </Button>
          <Button
            variant="primary"
            onClick={onConfirmSwitch}
            isLoading={isSubmitting}
            className="bg-brand hover:bg-forest text-white"
          >
            Replace Basket & Add
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-ink-2">
          <p>
            Your basket currently contains items from{' '}
            <strong className="text-ink">{currentStore?.name || 'another store'}</strong>. Adding{' '}
            <strong className="text-ink">{itemName}</strong> from{' '}
            <strong className="text-ink">{targetStoreName}</strong> will clear your existing basket.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-ink-2">
            <Store className="h-4 w-4 text-muted" />
            <span className="truncate max-w-[140px]">{currentStore?.name || 'Previous Store'}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted shrink-0" />
          <div className="flex items-center gap-2 font-semibold text-brand">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[140px]">{targetStoreName}</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
