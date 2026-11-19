'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Lock, Save } from 'lucide-react';
import { CustomerProfileResponse, UpdateProfileRequest } from '@marvels-basket/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profileService } from '../services/profile.service';

export interface ProfileFormProps {
  initialProfile: CustomerProfileResponse;
  onSuccess?: (updated: CustomerProfileResponse) => void;
}

export function ProfileForm({ initialProfile, onSuccess }: ProfileFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    name: initialProfile.name,
    avatarUrl: initialProfile.avatarUrl ?? '',
    dateOfBirth: initialProfile.dateOfBirth ?? '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateProfileRequest = {
        name: formData.name?.trim(),
        avatarUrl: formData.avatarUrl?.trim() || null,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null,
      };

      const updated = await profileService.updateProfile(payload);
      setSuccessMessage('Your profile has been updated successfully.');
      onSuccess?.(updated);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to update profile. Please verify your inputs and try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-light/40 p-4 text-xs font-medium text-success sm:text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-light/40 p-4 text-xs font-medium text-danger sm:text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Editable Fields Section */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-ink sm:text-lg">Personal Information</h2>

        <div>
          <label htmlFor="name" className="block text-xs font-bold text-ink mb-1.5 sm:text-sm">
            Full Name <span className="text-danger">*</span>
          </label>
          <Input
            id="name"
            type="text"
            required
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Rohan Sharma"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="avatarUrl" className="block text-xs font-bold text-ink mb-1.5 sm:text-sm">
            Profile Image URL
          </label>
          <Input
            id="avatarUrl"
            type="url"
            value={formData.avatarUrl || ''}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            placeholder="https://example.com/avatar.jpg"
            className="w-full"
          />
          <p className="mt-1 text-[11px] text-ink-subtle">
            Paste a secure image link to display as your customer profile picture.
          </p>
        </div>

        <div>
          <label htmlFor="dob" className="block text-xs font-bold text-ink mb-1.5 sm:text-sm">
            Date of Birth
          </label>
          <Input
            id="dob"
            type="date"
            value={formData.dateOfBirth || ''}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            className="w-full"
          />
        </div>
      </div>

      {/* Read-Only Account Identity Section */}
      <div className="rounded-2xl border border-border bg-surface-subtle p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <Lock className="h-4 w-4 text-ink-subtle" />
            Protected Account Identity
          </h3>
          <span className="text-[11px] text-ink-muted">Read-Only</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Registered Email Address
          </label>
          <Input
            type="email"
            readOnly
            disabled
            value={initialProfile.email}
            className="w-full cursor-not-allowed bg-white/70"
          />
          <p className="mt-1 text-[11px] text-ink-subtle">
            To update your verified email address, please contact customer support.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Account Status</label>
            <div className="rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-bold text-brand uppercase">
              {initialProfile.status}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Account Role</label>
            <div className="rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-bold text-ink uppercase">
              {initialProfile.roles.join(', ') || 'Customer'}
            </div>
          </div>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="brand"
          size="md"
          isLoading={isLoading}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
