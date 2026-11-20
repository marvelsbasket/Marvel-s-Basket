import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User, Phone, Mail } from 'lucide-react';

export interface StepPersonalProfileProps {
  formData: {
    ownerName: string;
    businessPhone: string;
    ownerEmail: string;
    isEmailVerified?: boolean;
  };
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function StepPersonalProfile({ formData, onChange, errors = {} }: StepPersonalProfileProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Seller Account & Signatory Profile</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Provide the personal details of the store owner or primary authorized signatory.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand" />
            Full Name of Owner / Signatory <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.ownerName}
            onChange={(e) => onChange('ownerName', e.target.value)}
            placeholder="e.g. Rajesh Kumar Gupta"
            className={errors.ownerName ? 'border-red-500' : ''}
          />
          {errors.ownerName && (
            <p className="text-[11px] text-red-500 font-medium">{errors.ownerName}</p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-brand" />
            Contact Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-lg border border-border bg-surface-subtle text-xs font-semibold text-ink-secondary">
              +91
            </div>
            <Input
              type="tel"
              value={formData.businessPhone}
              onChange={(e) =>
                onChange('businessPhone', e.target.value.replace(/\D/g, '').slice(0, 10))
              }
              placeholder="9876543210"
              className={errors.businessPhone ? 'border-red-500' : ''}
            />
          </div>
          {errors.businessPhone ? (
            <p className="text-[11px] text-red-500 font-medium">{errors.businessPhone}</p>
          ) : (
            <p className="text-[11px] text-ink-muted">
              Used for operational notifications and delivery logistics coordination.
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand" />
              Registered Account Email
            </span>
            <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified via OTP
            </Badge>
          </label>
          <Input
            type="email"
            value={formData.ownerEmail}
            disabled
            className="bg-surface-subtle text-ink-secondary cursor-not-allowed"
          />
          <p className="text-[11px] text-ink-muted">
            Linked to your authenticated Marvel&apos;s Basket account for settlement alerts and
            compliance notices.
          </p>
        </div>
      </div>
    </div>
  );
}
