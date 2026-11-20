'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { SellerService, SellerStatusOverview } from '@/features/seller/services/seller.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  FileText,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';

export default function SellerApplicationStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get('submitted') === 'true';

  const [statusOverview, setStatusOverview] = useState<SellerStatusOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = () => {
    setLoading(true);
    setError(null);
    SellerService.getMyStatus()
      .then((res) => {
        setStatusOverview(res);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to fetch application status');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'APPROVED_ACTIVE':
      case 'APPROVED':
        return {
          title: 'Store Approved & Active',
          badgeClass: 'bg-emerald-50 text-brand border-emerald-200',
          icon: <CheckCircle2 className="w-8 h-8 text-brand" />,
          description:
            'Congratulations! Your seller application has been verified and approved. Your store is now active on Marvel’s Basket.',
          actionButton: (
            <Button
              className="bg-brand text-white font-bold"
              onClick={() => router.push('/seller/profile')}
            >
              Go to Store Management
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ),
        };
      case 'REJECTED':
        return {
          title: 'Action Required: Revisions Requested',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          icon: <AlertCircle className="w-8 h-8 text-red-600" />,
          description:
            'Our compliance team has reviewed your application and requested corrections before approval.',
          actionButton: (
            <Button
              className="bg-brand text-white font-bold"
              onClick={() => router.push('/seller/onboarding')}
            >
              Edit & Resubmit Application
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ),
        };
      case 'SUSPENDED':
        return {
          title: 'Store Suspended',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          icon: <ShieldAlert className="w-8 h-8 text-red-600" />,
          description:
            'Your store has been temporarily suspended by platform administration. Contact support@marvelsbasket.com for assistance.',
          actionButton: (
            <Link href="mailto:support@marvelsbasket.com">
              <Button variant="outline">Contact Support</Button>
            </Link>
          ),
        };
      case 'DRAFT':
        return {
          title: 'Registration Incomplete (Draft)',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <FileText className="w-8 h-8 text-slate-600" />,
          description:
            'You have an incomplete registration draft. Complete and submit all 5 steps for verification.',
          actionButton: (
            <Button
              className="bg-brand text-white font-bold"
              onClick={() => router.push('/seller/onboarding')}
            >
              Continue Onboarding Form
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ),
        };
      case 'PENDING_VERIFICATION':
      default:
        return {
          title: 'Application Under Review',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Clock className="w-8 h-8 text-amber-600" />,
          description:
            'Your application and submitted KYC documents have been received and are currently queued for admin compliance review.',
          actionButton: (
            <Button variant="outline" onClick={fetchStatus}>
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
              Refresh Status
            </Button>
          ),
        };
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-surface-subtle py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {justSubmitted && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-brand-dark text-sm">
                  Application Submitted Successfully!
                </h4>
                <p className="mt-0.5 text-ink-secondary">
                  We have dispatched a confirmation email to your registered address. Our compliance
                  team is reviewing your documents.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <Card className="border-border bg-white p-12 flex flex-col items-center justify-center space-y-3">
              <Spinner size="lg" />
              <p className="text-xs text-ink-muted">Fetching your application status...</p>
            </Card>
          ) : error || !statusOverview ? (
            <Card className="border-border bg-white p-8 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="font-bold text-ink">No Seller Application Found</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                You haven&apos;t started a seller registration yet. Click below to begin your
                application.
              </p>
              <Link href="/sell-on-marvels-basket">
                <Button className="bg-brand text-white font-bold">Start Seller Application</Button>
              </Link>
            </Card>
          ) : (
            (() => {
              const display = getStatusDisplay(statusOverview.status);

              return (
                <div className="space-y-6">
                  {/* Status Card */}
                  <Card className="border-border bg-white shadow-xs overflow-hidden">
                    <CardContent className="p-6 sm:p-8 space-y-6">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                        <div className="p-3 rounded-2xl bg-surface-subtle shrink-0">
                          {display.icon}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-ink">
                              {display.title}
                            </h2>
                            <Badge
                              className={`text-[11px] font-semibold border ${display.badgeClass}`}
                            >
                              {statusOverview.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-ink-secondary leading-relaxed max-w-xl">
                            {display.description}
                          </p>
                        </div>
                      </div>

                      {/* Rejection / Suspension Feedback Box */}
                      {statusOverview.rejectionReason && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                          <span className="font-bold text-red-800 block">
                            Reviewer Feedback & Action Items:
                          </span>
                          <p className="text-red-700 leading-relaxed font-medium">
                            {statusOverview.rejectionReason}
                          </p>
                        </div>
                      )}

                      {statusOverview.suspensionReason && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                          <span className="font-bold text-red-800 block">
                            Reason for Suspension:
                          </span>
                          <p className="text-red-700 leading-relaxed font-medium">
                            {statusOverview.suspensionReason}
                          </p>
                        </div>
                      )}

                      {/* Timeline Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border text-xs">
                        <div>
                          <span className="text-ink-muted text-[11px] block">Submitted On:</span>
                          <span className="font-semibold text-ink">
                            {statusOverview.submittedAt
                              ? new Date(statusOverview.submittedAt).toLocaleDateString()
                              : 'Not submitted'}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">Documents:</span>
                          <span className="font-semibold text-ink">
                            {statusOverview.verifiedDocuments} / {statusOverview.totalDocuments}{' '}
                            Verified
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">Review ETA:</span>
                          <span className="font-semibold text-ink">1–2 Business Days</span>
                        </div>
                        <div>
                          <span className="text-ink-muted text-[11px] block">Approval Date:</span>
                          <span className="font-semibold text-ink">
                            {statusOverview.approvalDate
                              ? new Date(statusOverview.approvalDate).toLocaleDateString()
                              : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">{display.actionButton}</div>
                    </CardContent>
                  </Card>

                  {/* Status History Audit Trail */}
                  {statusOverview.recentHistory && statusOverview.recentHistory.length > 0 && (
                    <Card className="border-border bg-white shadow-xs">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                          Application Timeline & Events
                        </h4>
                        <div className="space-y-3">
                          {statusOverview.recentHistory.map((h) => (
                            <div
                              key={h.id}
                              className="flex items-start gap-3 text-xs border-b border-border/60 pb-3 last:border-0 last:pb-0"
                            >
                              <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                              <div className="flex-1 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-ink">
                                    Status changed from {h.fromStatus} to {h.toStatus}
                                  </span>
                                  <span className="text-[10px] text-ink-muted">
                                    {new Date(h.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                {h.reason && (
                                  <p className="text-[11px] text-ink-secondary">{h.reason}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
