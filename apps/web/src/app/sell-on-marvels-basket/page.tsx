'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { SellerService } from '@/features/seller';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import {
  Store,
  ShieldCheck,
  TrendingUp,
  Clock,
  FileText,
  CreditCard,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function SellOnMarvelsBasketPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingStatus(true);
      SellerService.getMyStatus()
        .then((res) => {
          setAppStatus(res?.status || null);
        })
        .catch(() => {
          setAppStatus(null);
        })
        .finally(() => {
          setLoadingStatus(false);
        });
    }
  }, [isAuthenticated]);

  const handleCtaClick = () => {
    if (!isAuthenticated) {
      router.push('/register?redirect=/seller/onboarding');
      return;
    }

    if (appStatus === 'PENDING_VERIFICATION') {
      router.push('/seller/application');
    } else if (appStatus === 'APPROVED_ACTIVE' || appStatus === 'APPROVED') {
      router.push('/seller/profile');
    } else {
      router.push('/seller/onboarding');
    }
  };

  const getCtaLabel = () => {
    if (authLoading || loadingStatus) return 'Loading...';
    if (!isAuthenticated) return 'Register as a Seller';
    if (appStatus === 'PENDING_VERIFICATION') return 'Track Application Status';
    if (appStatus === 'APPROVED_ACTIVE' || appStatus === 'APPROVED') return 'Go to Store Dashboard';
    if (appStatus === 'REJECTED') return 'Review & Resubmit Application';
    if (appStatus === 'DRAFT') return 'Continue Registration';
    return 'Start Seller Application';
  };

  return (
    <div className="min-h-screen bg-surface-subtle pb-20">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-forest via-brand-dark to-brand py-16 px-4 sm:px-6 lg:px-8 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative mx-auto max-w-5xl text-center space-y-6">
          <Badge className="bg-citrus text-ink font-bold hover:bg-citrus-light px-3.5 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-dark" />
            PARTNER PROGRAM
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Grow Your Local Grocery Business with Marvel&apos;s Basket
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-emerald-100 leading-relaxed">
            Join India&apos;s hyper-local grocery marketplace. Connect with neighborhood customers,
            manage store inventory easily, and offer rapid 10–30 minute delivery fulfilled by
            platform riders.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleCtaClick}
              className="w-full sm:w-auto bg-citrus text-ink hover:bg-citrus-light font-bold text-base px-8 shadow-lg transition-transform active:scale-95"
            >
              {getCtaLabel()}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            {!isAuthenticated && (
              <Link href="/login?redirect=/seller/onboarding" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
                >
                  Existing Partner Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 4 Core Merchant Value Props */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Direct Store Control</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Retain complete pricing autonomy, customize delivery radius, set operating hours,
                and showcase your local supermarket brand.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">10–30 Min Fulfilment</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Platform-managed logistics riders pick up packed grocery baskets directly from your
                shop counter for fast doorstep delivery.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Weekly Bank Payouts</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Enjoy transparent accounting with detailed double-entry financial ledger statements
                and regular automated direct bank account settlements.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink text-base">Verified Merchant Badge</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Build high customer trust with our admin-verified KYC credential, establishing your
                store as an authorized neighborhood grocery destination.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3 Simple Onboarding Steps */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
            How Seller Onboarding Works
          </h2>
          <p className="text-sm text-ink-muted">
            A structured, 5-step digital registration process that you can save as draft anytime
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand text-white font-bold flex items-center justify-center text-base">
              1
            </div>
            <h4 className="font-bold text-ink text-base">Fill Store & Business Info</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Enter your store name, physical address, geo-coordinates, operating hours, and
              business PAN.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand text-white font-bold flex items-center justify-center text-base">
              2
            </div>
            <h4 className="font-bold text-ink text-base">Upload KYC Documents</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Upload clear copies of your PAN card, bank passbook or cancelled cheque, store address
              proof, and FSSAI certificate.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-border shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand text-white font-bold flex items-center justify-center text-base">
              3
            </div>
            <h4 className="font-bold text-ink text-base">Admin Verification & Activation</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Our compliance team verifies your documents. Once approved, your store is activated to
              publish listings and accept orders!
            </p>
          </div>
        </div>
      </section>

      {/* Mandatory Requirements Checklist */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="bg-emerald-50/70 border-b border-emerald-100 p-6">
            <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand" />
              What You Need to Register
            </h3>
            <p className="text-xs text-ink-secondary mt-1">
              Keep these details and soft copies handy before starting the 5-step registration
              wizard
            </p>
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle">
                <FileText className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-ink">PAN Card</h5>
                  <p className="text-[11px] text-ink-muted">
                    Proprietor or Business PAN number and clear PDF/JPG copy.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle">
                <CreditCard className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-ink">Bank Account Details</h5>
                  <p className="text-[11px] text-ink-muted">
                    Account number, IFSC code, and cancelled cheque or front page passbook.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle">
                <Building2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-ink">Store Address Proof</h5>
                  <p className="text-[11px] text-ink-muted">
                    Electricity bill, rent agreement, or trade license matching the shop location.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle">
                <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-ink">FSSAI License (Food & Grocery)</h5>
                  <p className="text-[11px] text-ink-muted">
                    14-digit FSSAI food safety license or registration number and certificate.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={handleCtaClick}
                className="bg-brand hover:bg-brand-dark text-white font-bold px-8 shadow-sm"
              >
                {getCtaLabel()}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
