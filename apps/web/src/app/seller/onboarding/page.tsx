'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuth } from '@/features/auth/context/auth-context';
import { SellerService } from '@/features/seller/services/seller.service';
import { StepIndicator } from '@/features/seller/components/step-indicator';
import { StepPersonalProfile } from '@/features/seller/components/step-personal-profile';
import { StepStoreInfo } from '@/features/seller/components/step-store-info';
import { StepBusinessTax } from '@/features/seller/components/step-business-tax';
import { StepBankDetails } from '@/features/seller/components/step-bank-details';
import {
  StepDocumentUpload,
  DocumentItem,
} from '@/features/seller/components/step-document-upload';
import { StepReviewSubmit } from '@/features/seller/components/step-review-submit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/feedback/spinner';
import { ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Step 1
    ownerName: '',
    businessPhone: '',
    ownerEmail: '',
    isEmailVerified: true,

    // Step 2
    storeDisplayName: '',
    storeCategory: 'GROCERY',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: 26.0688,
    longitude: 83.1859,
    serviceRadiusKm: 5,
    openingTime: '07:00',
    closingTime: '22:00',
    weeklyOffDays: 'None',

    // Step 3
    legalBusinessName: '',
    businessEntityType: 'SOLE_PROPRIETORSHIP',
    pan: '',
    gstin: '',
    fssaiNumber: '',
    fssaiExpiryDate: '',
    shopEstablishmentNumber: '',

    // Step 4
    bankAccountHolderName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    bankAccountNumberMasked: null as string | null,
    bankIfscCode: '',
    bankName: '',
    bankAccountType: 'CURRENT',
    upiId: '',
  });

  // Load or create application draft on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    SellerService.getOrCreateApplication()
      .then((app) => {
        if (!isMounted) return;

        // If application is already submitted or approved, redirect to status or profile
        if (app.status === 'PENDING_VERIFICATION') {
          router.replace('/seller/application');
          return;
        }
        if (app.status === 'APPROVED_ACTIVE' || app.status === 'APPROVED') {
          router.replace('/seller/profile');
          return;
        }

        setFormData((prev) => ({
          ...prev,
          ownerName: app.ownerName || user?.name || '',
          businessPhone: app.businessPhone || user?.phone || '',
          ownerEmail: app.ownerEmail || user?.email || '',
          isEmailVerified: user?.isEmailVerified ?? true,
          storeDisplayName: app.storeDisplayName || app.businessName || '',
          storeCategory: app.storeCategory || 'GROCERY',
          addressLine1:
            app.addressLine1 && app.addressLine1 !== 'Pending store address'
              ? app.addressLine1
              : '',
          addressLine2: app.addressLine2 || '',
          landmark: app.landmark || '',
          city: app.city && app.city !== 'Pending' ? app.city : '',
          state: app.state && app.state !== 'Pending' ? app.state : '',
          postalCode: app.postalCode && app.postalCode !== '000000' ? app.postalCode : '',
          latitude: app.latitude || 26.0688,
          longitude: app.longitude || 83.1859,
          serviceRadiusKm: app.serviceRadiusKm || 5,
          openingTime: app.openingTime || '07:00',
          closingTime: app.closingTime || '22:00',
          weeklyOffDays: app.weeklyOffDays || 'None',
          legalBusinessName: app.legalBusinessName || '',
          businessEntityType: app.businessEntityType || 'SOLE_PROPRIETORSHIP',
          pan: app.pan || '',
          gstin: app.gstin || '',
          fssaiNumber: app.fssaiNumber || '',
          fssaiExpiryDate: app.fssaiExpiryDate || '',
          shopEstablishmentNumber: app.shopEstablishmentNumber || '',
          bankAccountHolderName: app.bankAccountHolderName || '',
          bankAccountNumberMasked: app.bankAccountNumberMasked || null,
          bankIfscCode: app.bankIfscCode || '',
          bankName: app.bankName || '',
          bankAccountType: app.bankAccountType || 'CURRENT',
          upiId: app.upiId || '',
        }));

        setDocuments(app.documents || []);
        const step = Math.min(Math.max(app.currentStep || 1, 1), 5);
        setCurrentStep(step);
        setMaxStepReached(Math.max(step, 1));
      })
      .catch(() => {
        setFormError('Failed to load application draft. Please refresh.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router, user]);

  const handleFieldChange = (field: string, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccessMessage(null);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateCurrentStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.ownerName.trim()) {
        newErrors.ownerName = 'Owner full name is required';
      }
      if (!formData.businessPhone.trim() || !/^[6-9]\d{9}$/.test(formData.businessPhone)) {
        newErrors.businessPhone = 'Valid 10-digit Indian mobile number required';
      }
    } else if (step === 2) {
      if (!formData.storeDisplayName.trim()) {
        newErrors.storeDisplayName = 'Store display name is required';
      }
      if (!formData.addressLine1.trim()) {
        newErrors.addressLine1 = 'Shop/building address line 1 is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.state.trim()) {
        newErrors.state = 'State is required';
      }
      if (!formData.postalCode.trim() || !/^\d{6}$/.test(formData.postalCode)) {
        newErrors.postalCode = 'Valid 6-digit Indian PIN code required';
      }
    } else if (step === 3) {
      if (!formData.legalBusinessName.trim()) {
        newErrors.legalBusinessName = 'Legal business name is required';
      }
      if (!formData.pan.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
        newErrors.pan = 'Valid 10-character PAN number required (e.g. ABCDE1234F)';
      }
      const isFood = [
        'GROCERY',
        'FRUITS_VEGETABLES',
        'MEAT_DAIRY',
        'BAKERY',
        'BEVERAGES',
        'FOOD',
      ].includes(formData.storeCategory.toUpperCase());
      if (isFood && (!formData.fssaiNumber || !/^\d{14}$/.test(formData.fssaiNumber))) {
        newErrors.fssaiNumber =
          '14-digit FSSAI license number is mandatory for Grocery and Food sales';
      }
      if (
        formData.gstin &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)
      ) {
        newErrors.gstin = 'Invalid GSTIN format (15 characters required)';
      }
    } else if (step === 4) {
      if (!formData.bankAccountHolderName.trim()) {
        newErrors.bankAccountHolderName = 'Account beneficiary name is required';
      }
      if (!formData.bankAccountNumberMasked && !formData.bankAccountNumber) {
        newErrors.bankAccountNumber = 'Bank account number is required';
      }
      if (
        formData.bankAccountNumber &&
        formData.bankAccountNumber !== formData.confirmBankAccountNumber
      ) {
        newErrors.confirmBankAccountNumber = 'Account numbers do not match';
      }
      if (!formData.bankIfscCode.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankIfscCode)) {
        newErrors.bankIfscCode = 'Valid 11-character IFSC code required (e.g. SBIN0001234)';
      }
      if (!formData.bankName.trim()) {
        newErrors.bankName = 'Bank name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    setSavingDraft(true);
    setSaveSuccessMessage(null);
    setFormError(null);

    try {
      const rawPayload: Record<string, unknown> = {
        currentStep,
        ownerName: formData.ownerName,
        businessPhone: formData.businessPhone,
        storeDisplayName: formData.storeDisplayName,
        storeCategory: formData.storeCategory,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        landmark: formData.landmark,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        serviceRadiusKm: formData.serviceRadiusKm ? Number(formData.serviceRadiusKm) : 5,
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        weeklyOffDays: formData.weeklyOffDays,
        legalBusinessName: formData.legalBusinessName,
        businessEntityType: formData.businessEntityType,
        pan: formData.pan,
        gstin: formData.gstin,
        fssaiNumber: formData.fssaiNumber,
        fssaiExpiryDate: formData.fssaiExpiryDate,
        shopEstablishmentNumber: formData.shopEstablishmentNumber,
        bankAccountHolderName: formData.bankAccountHolderName,
        bankIfscCode: formData.bankIfscCode,
        bankName: formData.bankName,
        bankAccountType: formData.bankAccountType,
        upiId: formData.upiId,
      };

      if (formData.bankAccountNumber) {
        rawPayload.bankAccountNumber = formData.bankAccountNumber;
        rawPayload.confirmBankAccountNumber = formData.confirmBankAccountNumber;
      }

      // Filter out empty strings and null/undefined values so unfinished steps don't fail regex/min-length
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawPayload)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed !== '') {
            payload[key] = trimmed;
          }
        } else {
          payload[key] = value;
        }
      }

      const res = await SellerService.updateMyApplication(payload);
      if (res.bankAccountNumberMasked) {
        setFormData((prev) => ({
          ...prev,
          bankAccountNumberMasked: res.bankAccountNumberMasked ?? null,
          bankAccountNumber: '',
          confirmBankAccountNumber: '',
        }));
      }

      setSaveSuccessMessage('Draft saved successfully! You can resume anytime.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
      return true;
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save draft. Please check your inputs.',
      );
      return false;
    } finally {
      setSavingDraft(false);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep(currentStep)) {
      return;
    }

    // Auto-save draft on step transition
    const saved = await handleSaveDraft();
    if (!saved) return;

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setMaxStepReached((prev) => Math.max(prev, nextStep));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitFinal = async () => {
    setSubmitting(true);
    setFormError(null);

    try {
      await SellerService.submitApplication();
      router.push('/seller/application?submitted=true');
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to submit application. Please verify all mandatory details and documents.',
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-subtle py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Seller Onboarding Wizard
              </h1>
              <p className="text-xs text-ink-muted mt-1">
                Step {currentStep <= 5 ? currentStep : 5} of 5:{' '}
                {currentStep === 1 && 'Account & Personal Profile'}
                {currentStep === 2 && 'Store Information'}
                {currentStep === 3 && 'Business & Tax Details'}
                {currentStep === 4 && 'Bank Details'}
                {currentStep === 5 && 'KYC Document Uploads'}
                {currentStep === 6 && 'Final Review & Submission'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savingDraft || loading}
                className="text-xs font-semibold bg-white"
              >
                <Save className="w-3.5 h-3.5 mr-1.5 text-brand" />
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </Button>
            </div>
          </div>

          {/* Save Status / Error Feedback */}
          {saveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Visual Step Indicator */}
          <StepIndicator
            currentStep={Math.min(currentStep, 5)}
            onStepClick={(s) => setCurrentStep(s)}
            maxStepReached={maxStepReached}
          />

          {/* Form Step Body */}
          <Card className="border-border bg-white shadow-xs overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Spinner size="lg" />
                  <p className="text-xs text-ink-muted">Loading your application details...</p>
                </div>
              ) : (
                <>
                  {currentStep === 1 && (
                    <StepPersonalProfile
                      formData={formData}
                      onChange={handleFieldChange}
                      errors={errors}
                    />
                  )}

                  {currentStep === 2 && (
                    <StepStoreInfo
                      formData={formData}
                      onChange={handleFieldChange}
                      errors={errors}
                    />
                  )}

                  {currentStep === 3 && (
                    <StepBusinessTax
                      formData={formData}
                      onChange={handleFieldChange}
                      errors={errors}
                    />
                  )}

                  {currentStep === 4 && (
                    <StepBankDetails
                      formData={formData}
                      onChange={handleFieldChange}
                      errors={errors}
                    />
                  )}

                  {currentStep === 5 && (
                    <StepDocumentUpload
                      documents={documents}
                      storeCategory={formData.storeCategory}
                      hasGstin={!!formData.gstin}
                      onDocumentUploaded={(newDoc) => {
                        setDocuments((prev) => {
                          const filtered = prev.filter(
                            (d) => d.documentType !== newDoc.documentType,
                          );
                          return [newDoc, ...filtered];
                        });
                      }}
                      onDocumentDeleted={(docId) => {
                        setDocuments((prev) => prev.filter((d) => d.id !== docId));
                      }}
                      errors={errors}
                    />
                  )}

                  {currentStep === 6 && (
                    <StepReviewSubmit
                      formData={formData}
                      documents={documents}
                      onEditStep={(s) => setCurrentStep(s)}
                      onSubmit={handleSubmitFinal}
                      isSubmitting={submitting}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Bottom Sticky Action Bar */}
          {!loading && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="text-xs font-semibold bg-white"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Previous Step
              </Button>

              <div className="flex items-center gap-3">
                {currentStep < 5 && (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-brand hover:bg-brand-dark text-white font-bold text-xs px-6 shadow-xs"
                  >
                    Next Step
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}

                {currentStep === 5 && (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(6)}
                    className="bg-brand-forest hover:bg-brand-dark text-white font-bold text-xs px-6 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Review & Submit
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
