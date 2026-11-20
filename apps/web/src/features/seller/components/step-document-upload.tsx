import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SellerService } from '../services/seller.service';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Eye,
  Loader2,
} from 'lucide-react';

export interface DocumentItem {
  id: string;
  documentType: string;
  documentUrl: string;
  signedPreviewUrl?: string;
  originalFilename?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  verificationStatus: string;
  rejectionReason?: string | null;
}

export interface StepDocumentUploadProps {
  documents: DocumentItem[];
  storeCategory?: string;
  hasGstin?: boolean;
  onDocumentUploaded: (newDoc: DocumentItem) => void;
  onDocumentDeleted: (docId: string) => void;
  errors?: Record<string, string>;
}

interface DocConfig {
  type: string;
  title: string;
  description: string;
  required: boolean;
}

export function StepDocumentUpload({
  documents,
  storeCategory,
  hasGstin,
  onDocumentUploaded,
  onDocumentDeleted,
  errors = {},
}: StepDocumentUploadProps) {
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFoodCategory = [
    'GROCERY',
    'FRUITS_VEGETABLES',
    'MEAT_DAIRY',
    'BAKERY',
    'BEVERAGES',
    'FOOD',
  ].includes((storeCategory || '').toUpperCase());

  const docConfigs: DocConfig[] = [
    {
      type: 'PAN_CARD',
      title: 'PAN Card Copy',
      description: 'Clear soft copy of Proprietor or Business PAN card.',
      required: true,
    },
    {
      type: 'BANK_PROOF',
      title: 'Cancelled Cheque / Bank Passbook',
      description: 'Showing account number, IFSC, and beneficiary name clearly.',
      required: true,
    },
    {
      type: 'ADDRESS_PROOF',
      title: 'Store Physical Address Proof',
      description: 'Electricity bill, rent agreement, or trade license of the shop counter.',
      required: true,
    },
    {
      type: 'FSSAI_CERTIFICATE',
      title: 'FSSAI License / Registration Certificate',
      description: 'Mandatory government certificate for all grocery and food categories.',
      required: isFoodCategory,
    },
    ...(hasGstin
      ? [
          {
            type: 'GST_CERTIFICATE',
            title: 'GST Registration Certificate',
            description: 'Required since GSTIN was provided in Business Details.',
            required: true,
          },
        ]
      : []),
  ];

  const handleFileSelected = async (type: string, file: File) => {
    setActionError(null);
    setUploadingType(type);

    try {
      const uploaded = await SellerService.uploadDocument(file, type);
      onDocumentUploaded(uploaded);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to upload document. Please try again.',
      );
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (docId: string) => {
    setActionError(null);
    try {
      await SellerService.deleteDocument(docId);
      onDocumentDeleted(docId);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'REJECTED':
      case 'NEEDS_RESUBMISSION':
        return (
          <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" />
            Action Required
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
            Pending Verification
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">KYC Document Uploads</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Upload clear PDF, JPG, or PNG copies (max 10 MB per file). All files are safely stored in
          encrypted private cloud storage.
        </p>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="space-y-4">
        {docConfigs.map((cfg) => {
          const uploaded = documents.find((d) => d.documentType === cfg.type);
          const isUploading = uploadingType === cfg.type;

          return (
            <Card
              key={cfg.type}
              className={`border transition-all ${
                uploaded
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : cfg.required && errors[cfg.type]
                    ? 'border-red-300 bg-red-50/10'
                    : 'border-border bg-white'
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-ink">{cfg.title}</h4>
                    {cfg.required ? (
                      <span className="text-[11px] font-semibold text-red-500">Required</span>
                    ) : (
                      <span className="text-[11px] text-ink-muted">Optional</span>
                    )}
                    {uploaded && getStatusBadge(uploaded.verificationStatus)}
                  </div>
                  <p className="text-xs text-ink-muted">{cfg.description}</p>

                  {uploaded?.originalFilename && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-brand font-medium">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{uploaded.originalFilename}</span>
                      {uploaded.fileSize && (
                        <span className="text-ink-muted">
                          ({(uploaded.fileSize / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                  )}

                  {uploaded?.rejectionReason && (
                    <p className="text-xs text-red-600 font-medium pt-1">
                      Reason: {uploaded.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {uploaded ? (
                    <>
                      {uploaded.signedPreviewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDoc(uploaded)}
                          className="text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-ink-muted" />
                          Preview
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(uploaded.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Replace
                      </Button>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelected(cfg.type, file);
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-brand" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 mr-1 text-brand" />
                            Upload File
                          </>
                        )}
                      </Button>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* In-App Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" />
                <h4 className="text-xs sm:text-sm font-bold text-ink truncate">
                  {previewDoc.originalFilename || previewDoc.documentType}
                </h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="text-xs font-bold"
              >
                Close
              </Button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-50">
              {previewDoc.mimeType === 'application/pdf' ||
              previewDoc.originalFilename?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.signedPreviewUrl || previewDoc.documentUrl}
                  className="w-full h-[500px] rounded-lg border border-border"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewDoc.signedPreviewUrl || previewDoc.documentUrl}
                  alt="KYC Document Preview"
                  className="max-h-[500px] w-auto object-contain rounded-lg shadow-xs"
                />
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-end gap-2 bg-white">
              <a
                href={previewDoc.signedPreviewUrl || previewDoc.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open in New Tab
                </Button>
              </a>
              <Button
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="bg-brand text-white text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
