'use client';

import React, { useState } from 'react';
import { SellerListingItem } from '@marvels-basket/shared';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/feedback/spinner';
import { InventoryService } from '../services/inventory.service';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: SellerListingItem | null;
  storeId: string;
  onSuccess: () => void;
}

type StockOperation =
  | 'RESTOCK'
  | 'MANUAL_INCREASE'
  | 'MANUAL_DECREASE'
  | 'DAMAGED_STOCK_WRITEOFF'
  | 'EXPIRED_STOCK_WRITEOFF'
  | 'INVENTORY_CORRECTION';

const OPERATIONS: {
  value: StockOperation;
  label: string;
  desc: string;
  type: 'add' | 'subtract';
}[] = [
  {
    value: 'RESTOCK',
    label: 'Restock / Shipment Inward',
    desc: 'New stock units received from vendor or warehouse',
    type: 'add',
  },
  {
    value: 'MANUAL_INCREASE',
    label: 'Manual Increase',
    desc: 'Physical audit count revealed extra units',
    type: 'add',
  },
  {
    value: 'MANUAL_DECREASE',
    label: 'Manual Decrease',
    desc: 'Physical count adjustment or off-platform sale',
    type: 'subtract',
  },
  {
    value: 'DAMAGED_STOCK_WRITEOFF',
    label: 'Damaged Stock Write-Off',
    desc: 'Write off unsellable damaged or broken items',
    type: 'subtract',
  },
  {
    value: 'EXPIRED_STOCK_WRITEOFF',
    label: 'Expired Stock Write-Off',
    desc: 'Write off items past shelf-life or expiry date',
    type: 'subtract',
  },
  {
    value: 'INVENTORY_CORRECTION',
    label: 'Inventory Correction',
    desc: 'Direct correction after comprehensive audit',
    type: 'subtract',
  },
];

export function AdjustStockModal({
  isOpen,
  onClose,
  listing,
  storeId,
  onSuccess,
}: AdjustStockModalProps) {
  const [operation, setOperation] = useState<StockOperation>('RESTOCK');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [note, setNote] = useState('');
  const [referenceType, setReferenceType] = useState('PO_RECEIPT');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!listing) return null;

  const currentOp = OPERATIONS.find((o) => o.value === operation) || OPERATIONS[0];
  const numQty = typeof quantity === 'number' ? quantity : 0;
  const isAddition = currentOp.type === 'add';

  const currentStockOnHand = listing.stockOnHand;
  const currentReserved = listing.reservedStock;
  const currentAvailable = listing.availableStock;

  const projectedStockOnHand = isAddition
    ? currentStockOnHand + numQty
    : currentStockOnHand - numQty;

  const projectedAvailable = Math.max(0, projectedStockOnHand - currentReserved);

  // Invariant Violation Check
  const isNegativeStock = projectedStockOnHand < 0;
  const violatesReservedStock =
    !isAddition &&
    currentOp.value !== 'DAMAGED_STOCK_WRITEOFF' &&
    currentOp.value !== 'EXPIRED_STOCK_WRITEOFF' &&
    projectedStockOnHand < currentReserved;

  const isValid =
    numQty > 0 && note.trim().length >= 3 && !isNegativeStock && !violatesReservedStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      await InventoryService.adjustStock(storeId, listing.id, {
        operation,
        quantity: numQty,
        note: note.trim(),
        referenceType: referenceType.trim() || undefined,
        referenceId: referenceId.trim() || undefined,
        idempotencyKey: `adj_${listing.id}_${Date.now()}`,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to adjust inventory stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="space-y-1">
          <div className="text-base font-bold text-ink">Adjust Stock on Hand</div>
          <p className="text-xs text-ink-muted">
            {listing.productName} —{' '}
            <span className="font-semibold text-ink">{listing.variantName}</span>
          </p>
        </div>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current State vs Projected State */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-subtle border border-border text-xs">
          <div>
            <span className="text-[11px] font-semibold text-ink-muted block uppercase">
              Current Stock
            </span>
            <div className="mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">On Hand:</span>
                <span className="font-bold text-ink">{currentStockOnHand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Reserved:</span>
                <span className="font-bold text-purple-700">{currentReserved}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-0.5">
                <span className="text-ink-muted font-medium">Available:</span>
                <span className="font-black text-brand">{currentAvailable}</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-ink-muted block uppercase">
              Projected After Adjustment
            </span>
            <div className="mt-1 space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">New On Hand:</span>
                <span className={`font-black ${isNegativeStock ? 'text-red-600' : 'text-ink'}`}>
                  {projectedStockOnHand}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Reserved:</span>
                <span className="font-medium text-purple-700">{currentReserved}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-0.5">
                <span className="text-ink-muted font-medium">New Available:</span>
                <span className="font-black text-teal-600">{projectedAvailable}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Warnings */}
        {violatesReservedStock && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Reserved Stock Protection (Section 12)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Cannot reduce stock below currently reserved units ({currentReserved} units). Active
              customer checkout carts are holding this stock. For emergency write-offs of damaged or
              expired goods, please choose &quot;Damaged Stock Write-Off&quot; or &quot;Expired
              Stock Write-Off&quot;.
            </p>
          </div>
        )}

        {isNegativeStock && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Adjustment would cause physical stock on hand to fall below zero.</span>
          </div>
        )}

        {/* Operation Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink">Adjustment Operation</label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as StockOperation)}
            className="w-full text-xs h-9 rounded-lg border border-border bg-white px-2.5 font-medium text-ink focus:outline-hidden focus:ring-2 focus:ring-brand"
          >
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label} ({op.type === 'add' ? '+ Add' : '– Deduct'})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-muted">{currentOp.desc}</p>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink">
            Units to {isAddition ? 'Add' : 'Deduct'}
          </label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value ? parseInt(e.target.value, 10) : '')}
            placeholder="Enter unit quantity"
            className="h-9 text-xs"
            required
          />
        </div>

        {/* Mandatory Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink">
            Audit Reason / Note <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Weekly delivery received from distributor invoice #INV-492"
            rows={2}
            className="text-xs"
            required
          />
          <p className="text-[11px] text-ink-muted">
            All inventory adjustments are permanently recorded in the immutable audit ledger.
          </p>
        </div>

        {/* Optional Reference */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted">
              Reference Type (Optional)
            </label>
            <Input
              type="text"
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              placeholder="PO_RECEIPT, RETURN, etc."
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted">Reference ID / Doc #</label>
            <Input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. PO-8921"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!isValid || loading}
            className="bg-brand text-white font-bold text-xs"
          >
            {loading ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
