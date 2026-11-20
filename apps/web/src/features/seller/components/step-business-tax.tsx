import React from 'react';
import { Input } from '@/components/ui/input';
import { Building2, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export interface StepBusinessTaxProps {
  formData: {
    legalBusinessName: string;
    businessEntityType: string;
    pan: string;
    gstin?: string;
    fssaiNumber?: string;
    fssaiExpiryDate?: string;
    shopEstablishmentNumber?: string;
    storeCategory?: string;
  };
  onChange: (field: string, value: string | number | boolean | null) => void;
  errors?: Record<string, string>;
}

const ENTITY_TYPES = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership Firm' },
  { value: 'LLP', label: 'Limited Liability Partnership (LLP)' },
  { value: 'PRIVATE_LIMITED', label: 'Private Limited Company (Pvt Ltd)' },
  { value: 'OTHER', label: 'Other Legally Registered Entity' },
];

export function StepBusinessTax({ formData, onChange, errors = {} }: StepBusinessTaxProps) {
  const isFoodCategory = [
    'GROCERY',
    'FRUITS_VEGETABLES',
    'MEAT_DAIRY',
    'BAKERY',
    'BEVERAGES',
    'FOOD',
  ].includes((formData.storeCategory || '').toUpperCase());

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Business & Regulatory Tax Details</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Enter legal business identification numbers matching your government certificates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Legal Business Name */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand" />
            Legal Business Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.legalBusinessName}
            onChange={(e) => onChange('legalBusinessName', e.target.value)}
            placeholder="e.g. Gupta Enterprises LLP"
            className={errors.legalBusinessName ? 'border-red-500' : ''}
          />
          {errors.legalBusinessName && (
            <p className="text-[11px] text-red-500 font-medium">{errors.legalBusinessName}</p>
          )}
          <p className="text-[11px] text-ink-muted">
            Must match your PAN card or business registration certificate.
          </p>
        </div>

        {/* Business Entity Type */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Business Entity Structure <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.businessEntityType || 'SOLE_PROPRIETORSHIP'}
            onChange={(e) => onChange('businessEntityType', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Permanent Account Number (PAN) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            PAN Number <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.pan}
            onChange={(e) =>
              onChange(
                'pan',
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 10),
              )
            }
            placeholder="e.g. ABCDE1234F"
            className={errors.pan ? 'border-red-500' : ''}
          />
          {errors.pan && <p className="text-[11px] text-red-500 font-medium">{errors.pan}</p>}
          <p className="text-[11px] text-ink-muted">10-character alphanumeric PAN.</p>
        </div>

        {/* GSTIN (Optional/Conditional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand" />
            GSTIN (Optional / Conditional)
          </label>
          <Input
            value={formData.gstin || ''}
            onChange={(e) =>
              onChange(
                'gstin',
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 15),
              )
            }
            placeholder="e.g. 09ABCDE1234F1Z5"
            className={errors.gstin ? 'border-red-500' : ''}
          />
          {errors.gstin ? (
            <p className="text-[11px] text-red-500 font-medium">{errors.gstin}</p>
          ) : (
            <p className="text-[11px] text-ink-muted">
              15-character GST number (if registered under GST Act).
            </p>
          )}
        </div>

        {/* FSSAI License Number (Conditional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            FSSAI License / Registration No.{' '}
            {isFoodCategory ? (
              <span className="text-red-500 font-bold">* (Mandatory for Grocery)</span>
            ) : (
              <span className="text-ink-muted">(If applicable)</span>
            )}
          </label>
          <Input
            value={formData.fssaiNumber || ''}
            onChange={(e) =>
              onChange('fssaiNumber', e.target.value.replace(/\D/g, '').slice(0, 14))
            }
            placeholder="e.g. 12345678901234"
            className={errors.fssaiNumber ? 'border-red-500' : ''}
          />
          {errors.fssaiNumber && (
            <p className="text-[11px] text-red-500 font-medium">{errors.fssaiNumber}</p>
          )}
          <p className="text-[11px] text-ink-muted">
            14-digit FSSAI food safety registration code.
          </p>
        </div>

        {/* FSSAI Expiry Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">FSSAI Expiry Date</label>
          <Input
            type="date"
            value={formData.fssaiExpiryDate ? formData.fssaiExpiryDate.split('T')[0] : ''}
            onChange={(e) => onChange('fssaiExpiryDate', e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Shop & Establishment */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Shop & Establishment License Number (Optional)
          </label>
          <Input
            value={formData.shopEstablishmentNumber || ''}
            onChange={(e) => onChange('shopEstablishmentNumber', e.target.value)}
            placeholder="e.g. SHOP/AZM/2026/894"
          />
        </div>
      </div>
    </div>
  );
}
