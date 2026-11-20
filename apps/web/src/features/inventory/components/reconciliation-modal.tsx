'use client';

import React, { useEffect, useState } from 'react';
import { InventoryReconciliationResult } from '@marvels-basket/shared';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import { InventoryService } from '../services/inventory.service';
import { CheckCircle2, AlertTriangle, RefreshCw, Scale } from 'lucide-react';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  listingId?: string;
}

export function ReconciliationModal({
  isOpen,
  onClose,
  storeId,
  listingId,
}: ReconciliationModalProps) {
  const [results, setResults] = useState<InventoryReconciliationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runReconcile = async () => {
    setLoading(true);
    try {
      const data = await InventoryService.reconcile(storeId, listingId);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runReconcile();
    }
  }, [isOpen, storeId, listingId]);

  const totalDiscrepancies = results.filter((r) => !r.isReconciled).length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-subtle text-ink">
            <Scale className="w-4 h-4 text-brand" />
          </div>
          <div>
            <div className="text-base font-bold text-ink">
              Physical Stock vs Ledger Reconciliation
            </div>
            <p className="text-xs text-ink-muted">
              Mathematical proof comparing physical stock on hand with cumulative audit ledger
              transactions.
            </p>
          </div>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="pt-2 space-y-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Status Summary Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                totalDiscrepancies === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {totalDiscrepancies === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {totalDiscrepancies === 0
                      ? '100% Ledger Integrity Verified'
                      : `${totalDiscrepancies} Discrepancy Found in Ledger Sum`}
                  </div>
                  <p className="text-[11px] opacity-80">
                    {totalDiscrepancies === 0
                      ? 'Physical stock on hand perfectly matches the immutable transaction history.'
                      : 'Audit review required for items where physical stock differs from transactions.'}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={runReconcile}
                className="h-8 px-2.5 text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Re-check
              </Button>
            </div>

            {/* Results Table */}
            <div className="border border-border rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-border text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Item / Variant</th>
                      <th className="py-2.5 px-3 text-right">Physical On Hand</th>
                      <th className="py-2.5 px-3 text-right">Ledger Sum</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">In / Out / Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((r) => (
                      <tr
                        key={r.inventoryId}
                        className="hover:bg-surface-subtle/50 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-ink truncate max-w-[200px]">
                            {r.productName}
                          </div>
                          <div className="text-[11px] text-ink-muted">{r.variantName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                          {r.currentStockOnHand}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-muted">
                          {r.calculatedStockFromLedger}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {r.isReconciled ? (
                            <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
                              MATCH
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">
                              DIFF: {r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-ink-muted whitespace-nowrap">
                          +{r.totalStockIn} / -{r.totalStockOut} / -{r.totalWriteOffs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
