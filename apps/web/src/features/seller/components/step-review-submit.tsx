import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  Store,
  Building2,
  CreditCard,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';

export interface ReviewFormData {
  ownerName?: string;
  businessPhone?: string;
  ownerEmail?: string;
  storeDisplayName?: string;
  storeCategory?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  openingTime?: string;
  closingTime?: string;
  weeklyOffDays?: string;
  serviceRadiusKm?: number;
  legalBusinessName?: string;
  businessEntityType?: string;
  pan?: string;
  gstin?: string;
  fssaiNumber?: string;
  fssaiExpiryDate?: string;
  shopEstablishmentNumber?: string;
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  bankAccountNumberMasked?: string | null;
  bankIfscCode?: string;
  bankName?: string;
  bankAccountType?: string;
  upiId?: string;
  [key: string]: unknown;
}

export interface ReviewDocumentItem {
  id: string;
  documentType: string;
  originalFilename?: string | null;
  status?: string;
  verificationStatus?: string;
  rejectionReason?: string | null;
  signedPreviewUrl?: string;
  documentUrl: string;
}

export interface StepReviewSubmitProps {
  formData: ReviewFormData;
  documents: ReviewDocumentItem[];
  onEditStep: (step: number) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function StepReviewSubmit({
  formData,
  documents,
  onEditStep,
  onSubmit,
  isSubmitting,
}: StepReviewSubmitProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validation Check
  const isFoodCategory = [
    'GROCERY',
    'FRUITS_VEGETABLES',
    'MEAT_DAIRY',
    'BAKERY',
    'BEVERAGES',
    'FOOD',
  ].includes((formData.storeCategory || '').toUpperCase());

  const missingErrors: string[] = [];
  if (!formData.ownerName?.trim()) missingErrors.push('Owner full name (Step 1)');
  if (!formData.businessPhone?.trim()) missingErrors.push('Contact mobile number (Step 1)');
  if (!formData.storeDisplayName?.trim()) missingErrors.push('Store display name (Step 2)');
  if (!formData.addressLine1?.trim()) missingErrors.push('Store address line 1 (Step 2)');
  if (!formData.city?.trim()) missingErrors.push('City (Step 2)');
  if (!formData.state?.trim()) missingErrors.push('State (Step 2)');
  if (!formData.postalCode?.trim()) missingErrors.push('PIN code (Step 2)');
  if (!formData.legalBusinessName?.trim()) missingErrors.push('Legal business name (Step 3)');
  if (!formData.pan?.trim()) missingErrors.push('PAN number (Step 3)');
  if (isFoodCategory && !formData.fssaiNumber?.trim()) {
    missingErrors.push('FSSAI license number (Step 3 - Mandatory for Grocery)');
  }
  if (!formData.bankAccountHolderName?.trim())
    missingErrors.push('Bank account holder name (Step 4)');
  if (!formData.bankAccountNumber && !formData.bankAccountNumberMasked) {
    missingErrors.push('Bank account number (Step 4)');
  }
  if (!formData.bankIfscCode?.trim()) missingErrors.push('Bank IFSC code (Step 4)');

  const docTypes = new Set(documents.map((d) => d.documentType));
  if (!docTypes.has('PAN_CARD')) missingErrors.push('PAN card copy document (Step 5)');
  if (!docTypes.has('BANK_PROOF')) missingErrors.push('Cancelled cheque or passbook (Step 5)');
  if (!docTypes.has('ADDRESS_PROOF')) missingErrors.push('Store address proof document (Step 5)');
  if (isFoodCategory && !docTypes.has('FSSAI_CERTIFICATE')) {
    missingErrors.push('FSSAI license certificate document (Step 5)');
  }
  if (formData.gstin && !docTypes.has('GST_CERTIFICATE')) {
    missingErrors.push('GST registration certificate (Step 5)');
  }

  const isComplete = missingErrors.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Final Review & Submission</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Carefully review all submitted details before applying for administrative verification.
        </p>
      </div>

      {/* Validation Checklist Banner */}
      {!isComplete ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Missing Mandatory Information ({missingErrors.length})</span>
          </div>
          <p className="text-[11px] text-amber-700">
            Please complete the following required fields before final submission:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1 font-medium">
            {missingErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
          <div>
            <h5 className="font-bold text-brand-dark">All Mandatory Information Complete!</h5>
            <p className="text-[11px] text-emerald-800">
              Your application is ready for verification review by Marvel&apos;s Basket compliance.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="space-y-4 text-xs">
        {/* Step 1 & 2: Store & Personal */}
        <Card className="border-border bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="font-bold text-ink flex items-center gap-2 text-xs sm:text-sm">
                <Store className="w-4 h-4 text-brand" />
                Store & Owner Information
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(2)}
                className="text-xs text-brand hover:text-brand-dark h-7 px-2"
              >
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-ink-muted block text-[11px]">Store Display Name:</span>
                <span className="font-semibold text-ink">{formData.storeDisplayName || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Category:</span>
                <span className="font-semibold text-ink">{formData.storeCategory || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Owner / Signatory:</span>
                <span className="font-semibold text-ink">{formData.ownerName || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Contact Mobile:</span>
                <span className="font-semibold text-ink">{formData.businessPhone || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Service Radius:</span>
                <span className="font-semibold text-ink">{formData.serviceRadiusKm || 5} km</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Operating Hours:</span>
                <span className="font-semibold text-ink">
                  {formData.openingTime || '07:00'} - {formData.closingTime || '22:00'}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-ink-muted block text-[11px]">Store Address:</span>
                <span className="font-medium text-ink">
                  {[
                    formData.addressLine1,
                    formData.addressLine2,
                    formData.city,
                    formData.state,
                    formData.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Business & Tax */}
        <Card className="border-border bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="font-bold text-ink flex items-center gap-2 text-xs sm:text-sm">
                <Building2 className="w-4 h-4 text-brand" />
                Business & Tax Compliance
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(3)}
                className="text-xs text-brand hover:text-brand-dark h-7 px-2"
              >
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-ink-muted block text-[11px]">Legal Business Name:</span>
                <span className="font-semibold text-ink">{formData.legalBusinessName || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Entity Structure:</span>
                <span className="font-semibold text-ink">{formData.businessEntityType || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">PAN Number:</span>
                <span className="font-semibold text-ink font-mono">{formData.pan || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">GSTIN:</span>
                <span className="font-semibold text-ink font-mono">
                  {formData.gstin || 'None (Exempt)'}
                </span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">FSSAI License No:</span>
                <span className="font-semibold text-ink font-mono">
                  {formData.fssaiNumber || '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Bank Details */}
        <Card className="border-border bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="font-bold text-ink flex items-center gap-2 text-xs sm:text-sm">
                <CreditCard className="w-4 h-4 text-brand" />
                Settlement Bank Account
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(4)}
                className="text-xs text-brand hover:text-brand-dark h-7 px-2"
              >
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-ink-muted block text-[11px]">Account Beneficiary:</span>
                <span className="font-semibold text-ink">
                  {formData.bankAccountHolderName || '—'}
                </span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Masked Account No:</span>
                <span className="font-semibold text-ink font-mono">
                  {formData.bankAccountNumberMasked ||
                    '••••••••' + (formData.bankAccountNumber?.slice(-4) || '••••')}
                </span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">IFSC Code:</span>
                <span className="font-semibold text-ink font-mono">
                  {formData.bankIfscCode || '—'}
                </span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Bank Name:</span>
                <span className="font-semibold text-ink">{formData.bankName || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[11px]">Account Type:</span>
                <span className="font-semibold text-ink">
                  {formData.bankAccountType || 'CURRENT'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Uploaded Documents */}
        <Card className="border-border bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="font-bold text-ink flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-brand" />
                Submitted KYC Documents ({documents.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(5)}
                className="text-xs text-brand hover:text-brand-dark h-7 px-2"
              >
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 rounded-lg bg-surface-subtle flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="font-medium text-ink truncate text-xs">
                      {d.documentType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {d.verificationStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms & Declarations */}
      <div className="p-4 rounded-xl border border-border bg-white space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 rounded border-border text-brand focus:ring-brand mt-0.5 shrink-0"
          />
          <span className="text-xs text-ink-secondary leading-relaxed">
            I hereby certify that all information and KYC documents submitted are authentic,
            accurate, and comply with all applicable Indian laws, including the Food Safety and
            Standards Act (FSSAI) and local municipal guidelines. I agree to the{' '}
            <a href="/terms" target="_blank" className="text-brand font-semibold hover:underline">
              Marvel&apos;s Basket Seller Terms of Service
            </a>
            .
          </span>
        </label>
      </div>

      {/* Final Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          disabled={!isComplete || !agreedToTerms || isSubmitting}
          onClick={() => setShowConfirmModal(true)}
          className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white font-bold px-8 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Application for Verification
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-brand flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Submit Application for Review?</h3>
              <p className="text-xs text-ink-muted">
                Once submitted, your application details will be locked while our compliance team
                inspects your documents. You will receive an email update once verified.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Review Again
              </Button>
              <Button
                className="flex-1 bg-brand text-white font-bold text-xs"
                disabled={isSubmitting}
                onClick={async () => {
                  setShowConfirmModal(false);
                  await onSubmit();
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
