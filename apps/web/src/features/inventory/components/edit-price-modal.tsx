'use client';

import React, { useState, useEffect } from 'react';
import { SellerListingItem } from '@marvels-basket/shared';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/feedback/spinner';
import { InventoryService } from '../services/inventory.service';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface EditPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: SellerListingItem | null;
  storeId: string;
  onSuccess: () => void;
}

export function EditPriceModal({
  isOpen,
  onClose,
  listing,
  storeId,
  onSuccess,
}: EditPriceModalProps) {
  const [price, setPrice] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listing) {
      setPrice(listing.sellingPrice);
      setError(null);
    }
  }, [listing]);

  if (!listing) return null;

  const numPrice = typeof price === 'number' ? price : 0;
  const isExceedingMrp = numPrice > listing.mrp;
  const isValid = numPrice > 0 && !isExceedingMrp;
  const discountPercent =
    listing.mrp > 0 && numPrice > 0 && numPrice < listing.mrp
      ? Math.round(((listing.mrp - numPrice) / listing.mrp) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await InventoryService.updateListingPrice(storeId, listing.id, {
        sellingPrice: numPrice,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update selling price');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <div className="text-base font-bold text-ink">Update Store Selling Price</div>
          <p className="text-xs text-ink-muted">
            {listing.productName} —{' '}
            <span className="font-semibold text-ink">{listing.variantName}</span>
          </p>
        </div>
      }
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-surface-subtle border border-border text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-ink-muted">Platform MRP:</span>
            <span className="font-bold text-ink">₹{listing.mrp.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Current Selling Price:</span>
            <span className="font-bold text-brand">₹{listing.sellingPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink">New Selling Price (₹)</label>
            {discountPercent > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {discountPercent}% OFF MRP
              </span>
            )}
          </div>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={listing.mrp}
            value={price}
            onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
            className={`h-9 text-xs ${isExceedingMrp ? 'border-red-500 focus:ring-red-500' : ''}`}
            required
            autoFocus
          />
          {isExceedingMrp ? (
            <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Price cannot exceed Platform MRP (₹{listing.mrp.toFixed(2)}).
            </p>
          ) : (
            <p className="text-[11px] text-ink-muted">
              Must be &gt; 0 and &le; MRP (₹{listing.mrp.toFixed(2)}).
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!isValid || submitting}
            className="bg-brand text-white font-bold text-xs"
          >
            {submitting ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save Price
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
