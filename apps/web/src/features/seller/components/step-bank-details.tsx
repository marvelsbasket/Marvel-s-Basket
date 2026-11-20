import React from 'react';
import { Input } from '@/components/ui/input';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';

export interface StepBankDetailsProps {
  formData: {
    bankAccountHolderName: string;
    bankAccountNumber: string;
    confirmBankAccountNumber: string;
    bankAccountNumberMasked?: string | null;
    bankIfscCode: string;
    bankName: string;
    bankAccountType: string;
    upiId?: string;
  };
  onChange: (field: string, value: string | number | boolean | null) => void;
  errors?: Record<string, string>;
}

export function StepBankDetails({ formData, onChange, errors = {} }: StepBankDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Bank & Settlement Account Details</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Enter verified bank account details where weekly order payouts will be directly
          transferred.
        </p>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
        <Lock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="text-xs font-bold text-brand-dark">Bank-Grade Data Encryption</h5>
          <p className="text-[11px] text-ink-secondary leading-relaxed">
            Your bank account number is strictly encrypted at rest using AES-256-GCM cryptography.
            It is never logged and is masked in all normal responses to ensure absolute financial
            privacy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Holder Name */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-brand" />
            Beneficiary Account Holder Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.bankAccountHolderName}
            onChange={(e) => onChange('bankAccountHolderName', e.target.value)}
            placeholder="e.g. Gupta Enterprises LLP"
            className={errors.bankAccountHolderName ? 'border-red-500' : ''}
          />
          {errors.bankAccountHolderName && (
            <p className="text-[11px] text-red-500 font-medium">{errors.bankAccountHolderName}</p>
          )}
          <p className="text-[11px] text-ink-muted">
            Must match your registered business or proprietor name.
          </p>
        </div>

        {/* Bank Account Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Bank Account Number <span className="text-red-500">*</span>
          </label>
          <Input
            type="password"
            value={formData.bankAccountNumber}
            onChange={(e) =>
              onChange('bankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))
            }
            placeholder={
              formData.bankAccountNumberMasked
                ? `Saved: ${formData.bankAccountNumberMasked}`
                : 'Enter 9 to 18-digit account number'
            }
            className={errors.bankAccountNumber ? 'border-red-500' : ''}
          />
          {errors.bankAccountNumber && (
            <p className="text-[11px] text-red-500 font-medium">{errors.bankAccountNumber}</p>
          )}
          {formData.bankAccountNumberMasked && (
            <p className="text-[11px] text-brand-dark font-medium">
              Currently saved: {formData.bankAccountNumberMasked}
            </p>
          )}
        </div>

        {/* Confirm Bank Account Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Confirm Bank Account Number <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.confirmBankAccountNumber}
            onChange={(e) =>
              onChange('confirmBankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))
            }
            placeholder="Re-enter bank account number"
            className={errors.confirmBankAccountNumber ? 'border-red-500' : ''}
          />
          {errors.confirmBankAccountNumber && (
            <p className="text-[11px] text-red-500 font-medium">
              {errors.confirmBankAccountNumber}
            </p>
          )}
        </div>

        {/* IFSC Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.bankIfscCode}
            onChange={(e) =>
              onChange(
                'bankIfscCode',
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 11),
              )
            }
            placeholder="e.g. SBIN0001234"
            className={errors.bankIfscCode ? 'border-red-500' : ''}
          />
          {errors.bankIfscCode && (
            <p className="text-[11px] text-red-500 font-medium">{errors.bankIfscCode}</p>
          )}
        </div>

        {/* Bank Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.bankName}
            onChange={(e) => onChange('bankName', e.target.value)}
            placeholder="e.g. State Bank of India"
            className={errors.bankName ? 'border-red-500' : ''}
          />
          {errors.bankName && (
            <p className="text-[11px] text-red-500 font-medium">{errors.bankName}</p>
          )}
        </div>

        {/* Account Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Account Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.bankAccountType || 'CURRENT'}
            onChange={(e) => onChange('bankAccountType', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="CURRENT">Current Account (Recommended for Business)</option>
            <option value="SAVINGS">Savings Account</option>
          </select>
        </div>

        {/* UPI ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">UPI ID (Optional)</label>
          <Input
            value={formData.upiId || ''}
            onChange={(e) => onChange('upiId', e.target.value)}
            placeholder="e.g. guptamart@okhdfcbank"
          />
          <p className="text-[11px] text-ink-muted">Optional secondary payout identifier.</p>
        </div>
      </div>
    </div>
  );
}
