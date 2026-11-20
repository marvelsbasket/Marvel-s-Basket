'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { SellerService } from '@/features/seller/services/seller.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import { User, MapPin, Clock, Compass, ArrowRight, ShieldCheck } from 'lucide-react';

interface SellerProfileData {
  id?: string;
  storeDisplayName?: string;
  businessName?: string;
  status?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

interface StoreData {
  id?: string;
  storeDisplayName?: string;
  storeCategory?: string;
  openingTime?: string;
  closingTime?: string;
  serviceRadiusKm?: number;
}

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([SellerService.getMyProfile(), SellerService.getMyStore()])
      .then(([prof, st]) => {
        setProfile(prof);
        setStore(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-subtle py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">Store & Merchant Profile</h1>
              <p className="text-xs text-ink-muted mt-0.5">
                Manage your active store parameters, operating hours, and contact information.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/seller/inventory">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold text-xs border-border bg-white text-ink"
                >
                  Manage Inventory &amp; Stock
                </Button>
              </Link>
              <Link href="/seller/store">
                <Button size="sm" className="bg-brand text-white font-bold text-xs">
                  Edit Store Settings
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <Card className="border-border bg-white p-12 flex justify-center">
              <Spinner size="lg" />
            </Card>
          ) : !profile ? (
            <Card className="border-border bg-white p-8 text-center space-y-3">
              <h3 className="font-bold text-ink">Seller Account Not Active</h3>
              <p className="text-xs text-ink-muted">
                Your store profile is only available once your seller onboarding application is
                approved.
              </p>
              <Link href="/seller/application">
                <Button size="sm">Check Application Status</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Store Summary Card */}
              <Card className="md:col-span-2 border-border bg-white shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-ink">
                          {store?.storeDisplayName ||
                            profile.storeDisplayName ||
                            profile.businessName}
                        </h2>
                        <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {profile.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Category: {store?.storeCategory || 'Groceries & Staples'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-border">
                    <div className="space-y-1">
                      <span className="text-ink-muted text-[11px] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand" />
                        Operating Hours
                      </span>
                      <span className="font-semibold text-ink">
                        {store?.openingTime || '07:00'} – {store?.closingTime || '22:00'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-ink-muted text-[11px] flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-brand" />
                        Delivery Radius
                      </span>
                      <span className="font-semibold text-ink">
                        {store?.serviceRadiusKm || 5} km
                      </span>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <span className="text-ink-muted text-[11px] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-brand" />
                        Store Address
                      </span>
                      <span className="font-medium text-ink">
                        {[
                          profile.addressLine1,
                          profile.addressLine2,
                          profile.landmark,
                          profile.city,
                          profile.state,
                          profile.postalCode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Account Card */}
              <Card className="border-border bg-white shadow-xs">
                <CardContent className="p-6 space-y-3 text-xs">
                  <h3 className="font-bold text-ink flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-brand" />
                    Authorized Merchant
                  </h3>
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div>
                      <span className="text-ink-muted text-[11px] block">Name:</span>
                      <span className="font-semibold text-ink">{profile.ownerName}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Email:</span>
                      <span className="font-semibold text-ink">{profile.ownerEmail}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[11px] block">Mobile:</span>
                      <span className="font-semibold text-ink">{profile.ownerPhone || '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
