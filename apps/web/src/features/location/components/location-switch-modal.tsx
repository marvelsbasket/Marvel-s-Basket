'use client';

import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, MapPinOff, Store } from 'lucide-react';
import { StoreSwitchComparison } from '@marvels-basket/shared';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils/currency';

interface LocationSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: StoreSwitchComparison | null;
  targetLocationLabel: string;
  isSubmitting?: boolean;
  onClearAndSwitch: () => Promise<void>;
  onSwitchKeepingCompatible: () => Promise<void>;
}

export function LocationSwitchModal({
  isOpen,
  onClose,
  comparison,
  targetLocationLabel,
  isSubmitting = false,
  onClearAndSwitch,
  onSwitchKeepingCompatible,
}: LocationSwitchModalProps) {
  if (!comparison) return null;

  const canKeepCompatible = comparison.isServiceable && comparison.compatibleItems.length > 0;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-brand" />
          <span>Update Location & Review Basket</span>
        </div>
      }
      description={`Switching to "${targetLocationLabel}" changes the active store fulfilling your basket.`}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Keep Current Location & Basket
          </Button>
          {canKeepCompatible && (
            <Button
              variant="primary"
              onClick={onSwitchKeepingCompatible}
              isLoading={isSubmitting}
              className="bg-brand hover:bg-forest text-white"
            >
              Switch & Keep {comparison.compatibleItems.length} Available Item
              {comparison.compatibleItems.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button
            variant={canKeepCompatible ? 'outline' : 'primary'}
            onClick={onClearAndSwitch}
            isLoading={isSubmitting}
            className={
              canKeepCompatible
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'bg-brand hover:bg-forest text-white'
            }
          >
            Clear Basket & Switch Location
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Store comparison banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm">
          <div>
            <p className="text-xs text-muted">Current Basket Store</p>
            <p className="font-semibold text-ink">{comparison.currentStore.name}</p>
          </div>
          <ArrowRight className="hidden sm:block h-4 w-4 text-muted shrink-0" />
          <div>
            <p className="text-xs text-muted">New Delivery Store</p>
            {comparison.newStore && comparison.isServiceable ? (
              <p className="font-semibold text-brand">{comparison.newStore.name}</p>
            ) : (
              <p className="font-semibold text-amber-700 flex items-center gap-1">
                <MapPinOff className="h-4 w-4" />
                Not serviceable yet
              </p>
            )}
          </div>
        </div>

        {/* Compatible items with any price change highlighted */}
        {comparison.compatibleItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
              Available in New Store ({comparison.compatibleItems.length})
            </h4>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 max-h-44 overflow-y-auto">
              {comparison.compatibleItems.map((entry) => (
                <div
                  key={entry.item.variantId}
                  className="flex items-center justify-between px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-medium text-ink truncate">{entry.item.productName}</p>
                    <p className="text-xs text-muted">
                      Qty: {entry.quantityAdjusted}
                      {entry.quantityAdjusted < entry.item.quantity && (
                        <span className="text-amber-700 ml-1">
                          (reduced from {entry.item.quantity} due to stock)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {entry.priceChanged ? (
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-amber-700">
                          {formatINR(entry.newUnitPrice)}
                        </span>
                        <span className="text-xs text-muted line-through">
                          was {formatINR(entry.item.unitPrice)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-ink">
                        {formatINR(entry.newUnitPrice)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable items */}
        {comparison.unavailableItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Unavailable / Will Be Removed ({comparison.unavailableItems.length})
            </h4>
            <div className="divide-y divide-red-100 rounded-xl border border-red-200 bg-red-50/40 max-h-40 overflow-y-auto">
              {comparison.unavailableItems.map((entry) => (
                <div
                  key={entry.item.variantId}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-medium text-ink truncate">{entry.item.productName}</p>
                    <p className="text-xs text-red-700">{entry.reason}</p>
                  </div>
                  <span className="text-xs text-muted shrink-0">Qty {entry.item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
