'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { AccountOverviewResponse, AccountPreferencesResponse } from '@marvels-basket/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { profileService } from '../services/profile.service';

export interface AccountSettingsCardProps {
  overview?: AccountOverviewResponse | null;
  initialPreferences?: AccountPreferencesResponse | null;
  onLogout?: () => void;
}

export function AccountSettingsCard({
  overview,
  initialPreferences,
  onLogout,
}: AccountSettingsCardProps) {
  const [preferences, setPreferences] = useState<AccountPreferencesResponse>({
    emailNotifications: initialPreferences?.emailNotifications ?? true,
    smsNotifications: initialPreferences?.smsNotifications ?? true,
    pushNotifications: initialPreferences?.pushNotifications ?? true,
    inAppNotifications: initialPreferences?.inAppNotifications ?? true,
    promotionalEmails: initialPreferences?.promotionalEmails ?? false,
  });

  const [isSavingPref, setIsSavingPref] = useState(false);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handlePreferenceToggle = async (key: keyof AccountPreferencesResponse, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setIsSavingPref(true);
    setPrefSaveSuccess(false);

    try {
      await profileService.updatePreferences({ [key]: value });
      setPrefSaveSuccess(true);
      setTimeout(() => setPrefSaveSuccess(false), 2500);
    } catch {
      // Revert state on failure
      setPreferences(preferences);
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await profileService.deactivateAccount();
      setIsDeactivateModalOpen(false);
      onLogout?.();
      window.location.href = '/login?deactivated=true';
    } catch {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Communication & Alerts Preferences */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-ink sm:text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand" />
              Communication Preferences
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Choose how Marvel&apos;s Basket notifies you about orders, delivery, and promotions.
            </p>
          </div>
          {prefSaveSuccess && (
            <span className="flex items-center text-xs font-bold text-success animate-fade-in">
              <CheckCircle2 className="h-4 w-4 mr-1 inline" /> Saved
            </span>
          )}
        </div>

        <div className="divide-y divide-border/60">
          <div className="flex items-center justify-between py-4 min-h-[52px]">
            <div className="pr-4">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Mail className="h-4 w-4 text-ink-muted" />
                Email Order Updates
              </p>
              <p className="text-xs text-ink-muted">
                Receive order confirmation receipts and packing alerts via email.
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(val) => handlePreferenceToggle('emailNotifications', val)}
              disabled={isSavingPref}
            />
          </div>

          <div className="flex items-center justify-between py-4 min-h-[52px]">
            <div className="pr-4">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-ink-muted" />
                Mobile Push Alerts
              </p>
              <p className="text-xs text-ink-muted">
                Receive real-time delivery notifications when the partner is on the way.
              </p>
            </div>
            <Switch
              checked={preferences.pushNotifications}
              onCheckedChange={(val) => handlePreferenceToggle('pushNotifications', val)}
              disabled={isSavingPref}
            />
          </div>

          <div className="flex items-center justify-between py-4 min-h-[52px]">
            <div className="pr-4">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-ink-muted" />
                SMS Notifications
              </p>
              <p className="text-xs text-ink-muted">
                Critical transactional SMS regarding dispatch and OTPs.
              </p>
            </div>
            <Switch
              checked={preferences.smsNotifications}
              onCheckedChange={(val) => handlePreferenceToggle('smsNotifications', val)}
              disabled={isSavingPref}
            />
          </div>

          <div className="flex items-center justify-between py-4 min-h-[52px]">
            <div className="pr-4">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Bell className="h-4 w-4 text-ink-muted" />
                Special Offers & Promotions
              </p>
              <p className="text-xs text-ink-muted">
                Periodic discount coupons, festive grocery deals, and seasonal discounts.
              </p>
            </div>
            <Switch
              checked={preferences.promotionalEmails}
              onCheckedChange={(val) => handlePreferenceToggle('promotionalEmails', val)}
              disabled={isSavingPref}
            />
          </div>
        </div>
      </div>

      {/* 2. Security & Session Overview */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-ink sm:text-lg flex items-center gap-2">
          <Lock className="h-5 w-5 text-brand" />
          Account Security
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface-subtle p-4">
            <span className="text-xs font-semibold text-ink-muted">Account Status</span>
            <p className="mt-1 text-sm font-bold text-brand uppercase">
              {overview?.status || 'Active'}
            </p>
            <p className="text-[11px] text-ink-subtle mt-0.5">Protected with JWT token family</p>
          </div>

          <div className="rounded-xl border border-border bg-surface-subtle p-4">
            <span className="text-xs font-semibold text-ink-muted">Saved Delivery Addresses</span>
            <p className="mt-1 text-sm font-bold text-ink">
              {overview?.totalAddresses ?? 0} Address(es)
            </p>
            <p className="text-[11px] text-ink-subtle mt-0.5">Isolated customer records</p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLogout}
            leftIcon={<LogOut className="h-4 w-4" />}
            className="text-danger hover:bg-danger-light/20 hover:text-danger hover:border-danger/30"
          >
            Sign Out of Account
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDeactivateModalOpen(true)}
            className="text-ink-subtle hover:text-danger"
          >
            Deactivate Account
          </Button>
        </div>
      </div>

      {/* 3. Account Deactivation Confirmation Dialog */}
      <Dialog
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Deactivate Customer Account?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-light/30 p-3 text-xs text-ink leading-relaxed">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <span>
              Deactivating your account will immediately revoke all active sessions. Your profile,
              order history, and addresses will be archived safely in accordance with data retention
              requirements.
            </span>
          </div>

          <p className="text-xs text-ink-muted">
            You can reactivate your account at any time by signing in and contacting Marvel&apos;s
            Basket customer support.
          </p>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeactivateModalOpen(false)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              isLoading={isDeactivating}
              leftIcon={<ShieldAlert className="h-4 w-4" />}
            >
              Yes, Deactivate
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
