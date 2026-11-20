'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { SellerService } from '@/features/seller/services/seller.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/feedback/spinner';
import { ArrowLeft, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export default function SellerStoreEditPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    storeDisplayName: '',
    openingTime: '07:00',
    closingTime: '22:00',
    weeklyOffDays: 'None',
    serviceRadiusKm: 5,
    preparationTime: 15,
  });

  useEffect(() => {
    SellerService.getMyStore()
      .then((st) => {
        if (st) {
          setFormData({
            storeDisplayName: (st.storeDisplayName as string) || '',
            openingTime: (st.openingTime as string) || '07:00',
            closingTime: (st.closingTime as string) || '22:00',
            weeklyOffDays: (st.weeklyOffDays as string) || 'None',
            serviceRadiusKm: Number(st.serviceRadiusKm) || 5,
            preparationTime: Number(st.preparationTime) || 15,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await SellerService.updateMyStore({
        ...formData,
        serviceRadiusKm: Number(formData.serviceRadiusKm),
        preparationTime: Number(formData.preparationTime),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-subtle py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/seller/profile">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-ink">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Profile
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-ink">Edit Store Settings</h1>
          </div>

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
              <span>Store parameters updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <Card className="border-border bg-white p-12 flex justify-center">
              <Spinner size="lg" />
            </Card>
          ) : (
            <Card className="border-border bg-white shadow-xs">
              <CardContent className="p-6">
                <form onSubmit={handleSave} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink">Store Display Name</label>
                    <Input
                      value={formData.storeDisplayName}
                      onChange={(e) =>
                        setFormData({ ...formData, storeDisplayName: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-ink">Opening Time (24h)</label>
                      <Input
                        type="time"
                        value={formData.openingTime}
                        onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-ink">Closing Time (24h)</label>
                      <Input
                        type="time"
                        value={formData.closingTime}
                        onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink">Weekly Off Days</label>
                    <select
                      value={formData.weeklyOffDays}
                      onChange={(e) => setFormData({ ...formData, weeklyOffDays: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="None">Open All 7 Days</option>
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-ink">Delivery Radius (km)</label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.serviceRadiusKm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            serviceRadiusKm: parseInt(e.target.value, 10),
                          })
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-ink">Prep Time (mins)</label>
                      <Input
                        type="number"
                        min={5}
                        max={60}
                        value={formData.preparationTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            preparationTime: parseInt(e.target.value, 10),
                          })
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-brand text-white font-bold text-xs"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
