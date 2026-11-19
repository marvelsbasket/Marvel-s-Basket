'use client';

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { CustomerAddressResponse } from '@marvels-basket/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

export interface DeleteAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  address: CustomerAddressResponse | null;
  isDeleting: boolean;
}

export function DeleteAddressDialog({
  isOpen,
  onClose,
  onConfirm,
  address,
  isDeleting,
}: DeleteAddressDialogProps) {
  if (!address) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Delete Delivery Address?" maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-light/30 p-3 text-xs text-ink leading-relaxed">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <span>
            Are you sure you want to remove the address for{' '}
            <strong className="text-ink">{address.recipientName}</strong> ({address.label})? This
            action cannot be undone.
          </span>
        </div>

        {address.isDefault && (
          <p className="text-xs text-ink-muted">
            Note: This is currently your default delivery address. Deleting it will automatically
            reassign another saved address as your default.
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep Address
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete Address
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
