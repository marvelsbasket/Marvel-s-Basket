'use client';

import React from 'react';
import { Briefcase, Check, Home, MapPin, Phone, Trash2, Edit2 } from 'lucide-react';
import { CustomerAddressResponse } from '@marvels-basket/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AddressCardProps {
  address: CustomerAddressResponse;
  onEdit: (address: CustomerAddressResponse) => void;
  onDelete: (address: CustomerAddressResponse) => void;
  onSetDefault: (addressId: string) => void;
  isUpdatingDefault?: boolean;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isUpdatingDefault = false,
}: AddressCardProps) {
  // Select icon based on address label
  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home className="h-3.5 w-3.5" />;
    if (l.includes('work') || l.includes('office')) return <Briefcase className="h-3.5 w-3.5" />;
    return <MapPin className="h-3.5 w-3.5" />;
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-4 sm:p-5 transition-all shadow-card bg-white flex flex-col justify-between',
        address.isDefault
          ? 'border-brand/40 ring-1 ring-brand/20'
          : 'border-border hover:border-border-strong',
      )}
    >
      <div>
        {/* Header: Label + Default Badge */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-ink">
              {getLabelIcon(address.label)}
              {address.label}
            </span>

            {address.isDefault && (
              <Badge variant="brand">
                <Check className="mr-1 h-3 w-3 inline" />
                Default Address
              </Badge>
            )}
          </div>
        </div>

        {/* Content: Recipient, Phone & Full Address */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink sm:text-base">{address.recipientName}</h3>
            <span className="flex items-center text-xs font-medium text-ink-muted">
              <Phone className="mr-1 h-3 w-3 text-ink-subtle" />
              {address.phone}
            </span>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed sm:text-sm">
            {address.addressLine1}
            {address.addressLine2 && `, ${address.addressLine2}`}
          </p>

          {address.landmark && (
            <p className="text-[11px] text-ink-subtle sm:text-xs">
              <span className="font-semibold text-ink-muted">Landmark:</span> {address.landmark}
            </p>
          )}

          <p className="text-xs font-semibold text-ink sm:text-sm">
            {address.city}, {address.state} —{' '}
            <span className="font-mono">{address.postalCode}</span>
          </p>
        </div>
      </div>

      {/* Footer Actions (Set Default, Edit, Delete) */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <div>
          {!address.isDefault && (
            <button
              type="button"
              disabled={isUpdatingDefault}
              onClick={() => onSetDefault(address.id)}
              className="text-xs font-bold text-brand hover:text-brand-hover hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm py-1"
            >
              Set as Default
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(address)}
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            className="text-ink-muted hover:text-ink text-xs h-9 px-2.5"
            aria-label={`Edit address for ${address.recipientName}`}
          >
            Edit
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(address)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            className="text-ink-subtle hover:text-danger hover:bg-danger-light/20 text-xs h-9 px-2.5"
            aria-label={`Delete address for ${address.recipientName}`}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
