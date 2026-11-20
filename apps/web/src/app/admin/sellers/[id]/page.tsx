'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import {
  AdminSellerDetail,
  AdminSellerService,
} from '@/features/seller/services/admin-seller.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Store,
  CreditCard,
  Eye,
  Check,
  X,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface PreviewDocState {
  id: string;
  documentType: string;
  documentUrl: string;
  originalFilename?: string | null;
  signedPreviewUrl?: string;
  mimeType?: string;
  isPdf?: boolean;
}

export default function AdminSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sellerId } = use(params);

  const [seller, setSeller] = useState<AdminSellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // In-App Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);

  // Action Modals State
  const [rejectDocModal, setRejectDocModal] = useState<{ docId: string; docType: string } | null>(
    null,
  );
  const [docRejectReason, setDocRejectReason] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectAppModal, setShowRejectAppModal] = useState(false);
  const [appRejectReason, setAppRejectReason] = useState('');

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadSeller = () => {
    setLoading(true);
    AdminSellerService.getApplicationDetail(sellerId)
      .then((data) => setSeller(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load seller details'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSeller();
  }, [sellerId]);

  // Document Verification Actions
  const handleVerifyDocument = async (docId: string) => {
    setActionLoading(true);
    try {
      await AdminSellerService.reviewDocument(sellerId, docId, 'VERIFIED');
      setActionSuccess('Document marked as verified');
      loadSeller();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify document');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDocumentConfirm = async () => {
    if (!rejectDocModal || !docRejectReason.trim()) return;
    setActionLoading(true);
    try {
      await AdminSellerService.reviewDocument(
        sellerId,
        rejectDocModal.docId,
        'REJECTED',
        docRejectReason,
      );
      setRejectDocModal(null);
      setDocRejectReason('');
      setActionSuccess('Document marked as rejected with feedback');
      loadSeller();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject document');
    } finally {
      setActionLoading(false);
    }
  };

  // Application Lifecycle Actions
  const handleApproveSellerConfirm = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await AdminSellerService.approveSeller(sellerId);
      setShowApproveModal(false);
      setActionSuccess('Seller successfully approved and store activated!');
      loadSeller();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve seller');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAppConfirm = async () => {
    if (!appRejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await AdminSellerService.rejectSeller(sellerId, appRejectReason);
      setShowRejectAppModal(false);
      setAppRejectReason('');
      setActionSuccess('Application rejected with feedback for merchant correction.');
      loadSeller();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendSellerConfirm = async () => {
    if (!suspendReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await AdminSellerService.suspendSeller(sellerId, suspendReason);
      setShowSuspendModal(false);
      setSuspendReason('');
      setActionSuccess('Store suspended successfully.');
      loadSeller();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to suspend store');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSeller = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await AdminSellerService.reactivateSeller(sellerId);
      setActionSuccess('Store successfully reactivated!');
      loadSeller();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate store');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-surface-subtle py-8 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/sellers">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-ink">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Queue
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-ink truncate">
                {seller?.store.storeDisplayName || seller?.businessName || 'Seller Application'}
              </h1>
            </div>

            {seller && (
              <div className="flex flex-wrap items-center gap-2">
                {(seller.status === 'PENDING_VERIFICATION' || seller.status === 'UNDER_REVIEW') && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setShowApproveModal(true)}
                      className="bg-brand text-white font-bold text-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve Store
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectAppModal(true)}
                      className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject Application
                    </Button>
                  </>
                )}

                {(seller.status === 'APPROVED_ACTIVE' || seller.status === 'APPROVED') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuspendModal(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                    Suspend Store
                  </Button>
                )}

                {seller.status === 'SUSPENDED' && (
                  <Button
                    size="sm"
                    onClick={handleReactivateSeller}
                    disabled={actionLoading}
                    className="bg-brand text-white font-bold text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Reactivate Store
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Action Success / Error Notifications */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                {actionSuccess}
              </span>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-700 font-bold">
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-red-700 font-bold">
                ✕
              </button>
            </div>
          )}

          {loading || !seller ? (
            <Card className="border-border bg-white p-16 flex justify-center">
              <Spinner size="lg" />
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header Overview Card */}
              <Card className="border-border bg-white shadow-xs">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-ink">
                          {seller.store.storeDisplayName || seller.businessName}
                        </h2>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {seller.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-muted">Application ID: {seller.id}</p>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-ink-muted block text-[11px]">Submitted On:</span>
                      <span className="font-semibold text-ink">
                        {seller.submittedAt
                          ? new Date(seller.submittedAt).toLocaleString()
                          : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-ink-muted text-[11px] block">Owner / Applicant:</span>
                      <span className="font-semibold text-ink">{seller.owner.name}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Account Email:</span>
                      <span className="font-semibold text-ink">{seller.owner.email}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Contact Mobile:</span>
                      <span className="font-semibold text-ink">
                        {seller.businessPhone || seller.owner.phone || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Category:</span>
                      <span className="font-semibold text-ink">{seller.store.storeCategory}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grid 2-cols: Store & Business */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Store Details */}
                <Card className="border-border bg-white shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <h3 className="font-bold text-ink flex items-center gap-1.5 text-xs sm:text-sm border-b border-border pb-2">
                      <Store className="w-4 h-4 text-brand" />
                      Physical Store Information
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-ink-muted text-[11px] block">Address:</span>
                        <span className="font-medium text-ink">
                          {[
                            seller.store.addressLine1,
                            seller.store.addressLine2,
                            seller.store.landmark,
                            seller.store.city,
                            seller.store.state,
                            seller.store.postalCode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-ink-muted text-[11px] block">Geo Coordinates:</span>
                          <span className="font-mono text-ink">
                            {seller.store.latitude}, {seller.store.longitude}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">Service Radius:</span>
                          <span className="font-semibold text-ink">
                            {seller.store.serviceRadiusKm} km
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-ink-muted text-[11px] block">Operating Hours:</span>
                          <span className="font-semibold text-ink">
                            {seller.store.openingTime} – {seller.store.closingTime}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">Weekly Off:</span>
                          <span className="font-semibold text-ink">
                            {seller.store.weeklyOffDays || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Business & Tax Details */}
                <Card className="border-border bg-white shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <h3 className="font-bold text-ink flex items-center gap-1.5 text-xs sm:text-sm border-b border-border pb-2">
                      <Building2 className="w-4 h-4 text-brand" />
                      Legal Business & Compliance
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-ink-muted text-[11px] block">Legal Entity Name:</span>
                        <span className="font-semibold text-ink">
                          {seller.business.legalBusinessName}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-ink-muted text-[11px] block">Entity Type:</span>
                          <span className="font-semibold text-ink">
                            {seller.business.businessEntityType}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">PAN Number:</span>
                          <span className="font-mono font-bold text-ink">
                            {seller.business.pan}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-ink-muted text-[11px] block">GSTIN:</span>
                          <span className="font-mono text-ink">
                            {seller.business.gstin || 'Not Provided (Exempt)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">
                            FSSAI License No:
                          </span>
                          <span className="font-mono text-ink">
                            {seller.business.fssaiNumber || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bank Details */}
              <Card className="border-border bg-white shadow-xs text-xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-ink flex items-center gap-1.5 text-xs sm:text-sm border-b border-border pb-2">
                    <CreditCard className="w-4 h-4 text-brand" />
                    Settlement Bank Account
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-ink-muted text-[11px] block">Beneficiary Name:</span>
                      <span className="font-semibold text-ink">
                        {seller.bank.accountHolderName}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Masked Account:</span>
                      <span className="font-mono font-bold text-ink">
                        {seller.bank.accountNumberMasked}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">IFSC Code:</span>
                      <span className="font-mono font-semibold text-ink">
                        {seller.bank.ifscCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Bank Name:</span>
                      <span className="font-semibold text-ink">{seller.bank.bankName}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KYC Documents Section with In-App Preview */}
              <Card className="border-border bg-white shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-bold text-ink flex items-center gap-2 text-sm sm:text-base">
                        <FileText className="w-4 h-4 text-brand" />
                        Submitted KYC Documents ({seller.documents.length})
                      </h3>
                      <p className="text-xs text-ink-muted">
                        Inspect submitted evidence inside the application before authorizing store
                        approval.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {seller.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-border bg-surface-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink">
                              {doc.documentType.replace(/_/g, ' ')}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                doc.verificationStatus === 'VERIFIED'
                                  ? 'bg-emerald-50 text-brand border-emerald-200'
                                  : doc.verificationStatus === 'REJECTED'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {doc.verificationStatus}
                            </Badge>
                          </div>
                          <p className="text-ink-muted text-[11px]">
                            {doc.originalFilename || 'document-file'}{' '}
                            {doc.fileSize ? `(${(doc.fileSize / 1024).toFixed(0)} KB)` : ''}
                          </p>
                          {doc.rejectionReason && (
                            <p className="text-red-600 font-medium text-[11px]">
                              Rejection Notes: {doc.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDoc(doc)}
                            className="text-xs font-semibold h-8"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Inspect In-App
                          </Button>

                          {doc.verificationStatus !== 'VERIFIED' && (
                            <Button
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleVerifyDocument(doc.id)}
                              className="bg-brand text-white font-bold text-xs h-8"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Verify
                            </Button>
                          )}

                          {doc.verificationStatus !== 'REJECTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() =>
                                setRejectDocModal({ docId: doc.id, docType: doc.documentType })
                              }
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status History & Audit Trail */}
              {seller.statusHistory && seller.statusHistory.length > 0 && (
                <Card className="border-border bg-white shadow-xs">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-bold text-ink text-xs uppercase tracking-wider">
                      Application Status History & Audit Trail
                    </h4>
                    <div className="space-y-2 text-xs">
                      {seller.statusHistory.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-start justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <div>
                            <span className="font-semibold text-ink">
                              {h.fromStatus} → {h.toStatus}
                            </span>
                            {h.reason && (
                              <p className="text-[11px] text-ink-muted mt-0.5">{h.reason}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-ink-muted">
                            {new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* IN-APP DOCUMENT PREVIEW MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-brand" />
                  <h4 className="text-sm font-bold text-ink truncate">
                    Inspection: {previewDoc.documentType.replace(/_/g, ' ')} (
                    {previewDoc.originalFilename || 'Document'})
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                  className="font-bold text-xs"
                >
                  Close Preview
                </Button>
              </div>

              <div className="p-4 flex-1 overflow-auto flex items-center justify-center min-h-[400px] bg-slate-900/5">
                {previewDoc.mimeType === 'application/pdf' ||
                previewDoc.originalFilename?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewDoc.signedPreviewUrl || previewDoc.documentUrl}
                    className="w-full h-[600px] rounded-lg border border-border shadow-xs bg-white"
                    title="KYC PDF Preview"
                  />
                ) : (
                  <img
                    src={previewDoc.signedPreviewUrl || previewDoc.documentUrl}
                    alt="KYC Document Preview"
                    className="max-h-[600px] w-auto object-contain rounded-lg shadow-md"
                  />
                )}
              </div>

              <div className="p-3 border-t border-border flex items-center justify-between bg-white">
                <a
                  href={previewDoc.signedPreviewUrl || previewDoc.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Open in External Tab
                  </Button>
                </a>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectDocModal({
                        docId: previewDoc.id,
                        docType: previewDoc.documentType,
                      });
                      setPreviewDoc(null);
                    }}
                    className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reject Document
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleVerifyDocument(previewDoc.id);
                      setPreviewDoc(null);
                    }}
                    className="bg-brand text-white font-bold text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Mark Verified
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REJECT DOCUMENT MODAL */}
        {rejectDocModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-ink text-base">
                Reject {rejectDocModal.docType.replace(/_/g, ' ')}
              </h3>
              <p className="text-xs text-ink-muted">
                Provide a clear reason explaining why this document cannot be accepted so the
                merchant can replace it.
              </p>
              <textarea
                value={docRejectReason}
                onChange={(e) => setDocRejectReason(e.target.value)}
                placeholder="e.g. Scanned copy is illegible. Please provide a clear, color photo of the original PAN card."
                rows={3}
                className="w-full p-3 text-xs rounded-lg border border-border focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectDocModal(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!docRejectReason.trim() || actionLoading}
                  onClick={handleRejectDocumentConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE SELLER MODAL */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-brand flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Approve Store & Activate?</h3>
              <p className="text-xs text-ink-muted">
                This will activate <strong>{seller?.store?.storeDisplayName || 'the store'}</strong>
                , assign the SELLER role to the merchant, and dispatch an approval email.
              </p>
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApproveModal(false)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleApproveSellerConfirm}
                  className="flex-1 bg-brand text-white font-bold text-xs"
                >
                  {actionLoading ? 'Approving...' : 'Confirm Approval'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT SELLER APPLICATION MODAL */}
        {showRejectAppModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-ink text-base">Reject Seller Application</h3>
              <p className="text-xs text-ink-muted">
                Specify feedback on what issues must be corrected by the seller before resubmitting.
              </p>
              <textarea
                value={appRejectReason}
                onChange={(e) => setAppRejectReason(e.target.value)}
                placeholder="e.g. FSSAI registration number does not match license certificate. Please correct license number and re-upload certificate."
                rows={4}
                className="w-full p-3 text-xs rounded-lg border border-border focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectAppModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!appRejectReason.trim() || actionLoading}
                  onClick={handleRejectAppConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SUSPEND SELLER MODAL */}
        {showSuspendModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-ink text-base">Suspend Active Store</h3>
              <p className="text-xs text-ink-muted">
                Provide a reason for store suspension. Suspended stores are barred from receiving
                new customer orders.
              </p>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Expired municipal trade license or food safety complaint pending audit."
                rows={3}
                className="w-full p-3 text-xs rounded-lg border border-border focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuspendModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!suspendReason.trim() || actionLoading}
                  onClick={handleSuspendSellerConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Confirm Suspension
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
