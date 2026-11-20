'use client';

import React, { useEffect, useState } from 'react';
import { InventoryAdjustmentHistoryItem, SellerListingItem } from '@marvels-basket/shared';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import { InventoryService } from '../services/inventory.service';
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  MinusCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: SellerListingItem | null;
  storeId: string;
}

export function StockHistoryModal({ isOpen, onClose, listing, storeId }: StockHistoryModalProps) {
  const [history, setHistory] = useState<InventoryAdjustmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = async (p: number) => {
    if (!listing) return;
    setLoading(true);
    try {
      const res = await InventoryService.getHistory(storeId, listing.id, p, 10);
      setHistory(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
      setPage(res.page);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && listing) {
      setPage(1);
      fetchHistory(1);
    }
  }, [isOpen, listing?.id]);

  if (!listing) return null;

  const getTypeBadge = (type: string, _qty: number) => {
    switch (type) {
      case 'RESTOCK':
      case 'INITIAL_STOCK':
      case 'MANUAL_INCREASE':
        return (
          <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            {type.replace(/_/g, ' ')}
          </Badge>
        );
      case 'DAMAGED_STOCK_WRITEOFF':
      case 'EXPIRED_STOCK_WRITEOFF':
      case 'PICKER_SHORTAGE_WRITEOFF':
        return (
          <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">
            <MinusCircle className="w-3 h-3 mr-0.5" />
            {type.replace(/_/g, ' ')}
          </Badge>
        );
      case 'ORDER_COMMITTED':
        return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
            <ArrowDownRight className="w-3 h-3 mr-0.5" />
            ORDER FULFILLED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-surface-subtle text-ink-muted border border-border text-[10px]">
            {type.replace(/_/g, ' ')}
          </Badge>
        );
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-subtle text-ink">
            <History className="w-4 h-4 text-brand" />
          </div>
          <div>
            <div className="text-base font-bold text-ink">Stock Audit Ledger History</div>
            <p className="text-xs text-ink-muted">
              {listing.productName} —{' '}
              <span className="font-semibold text-ink">{listing.variantName}</span> ({totalCount}{' '}
              audited transactions)
            </p>
          </div>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="pt-2 space-y-3">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-subtle border border-border">
            <FileText className="w-8 h-8 mx-auto text-ink-muted opacity-50 mb-2" />
            <p className="text-xs font-bold text-ink">No transaction history found</p>
            <p className="text-[11px] text-ink-muted">
              All inventory adjustments, receipts, and order fulfillments will appear here.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Delta</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Reason / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((tx) => {
                    const isPositive = tx.quantity > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-2.5 px-3 text-ink-muted whitespace-nowrap text-[11px]">
                          {new Date(tx.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {getTypeBadge(tx.type, tx.quantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isPositive ? 'text-brand' : 'text-red-600'}>
                            {isPositive ? `+${tx.quantity}` : tx.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-[11px] text-ink-muted font-mono">
                          {tx.stockBefore} →{' '}
                          <span className="font-bold text-ink">{tx.stockAfter}</span>
                        </td>
                        <td className="py-2.5 px-3 text-ink max-w-[200px]">
                          <div className="truncate font-medium text-[11px]">{tx.note || '—'}</div>
                          {tx.referenceId && (
                            <div className="text-[10px] text-ink-muted truncate font-mono">
                              Ref: {tx.referenceType || 'DOC'} #{tx.referenceId}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-2.5 border-t border-border flex items-center justify-between text-xs bg-surface-subtle">
                <span className="text-ink-muted text-[11px]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchHistory(page - 1)}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchHistory(page + 1)}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
