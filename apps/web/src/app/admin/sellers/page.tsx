'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import {
  AdminSellerListItem,
  AdminSellerService,
} from '@/features/seller/services/admin-seller.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/feedback/spinner';
import {
  Search,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'All Applications' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'APPROVED_ACTIVE', label: 'Approved Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DRAFT', label: 'Drafts' },
];

export default function AdminSellersListPage() {
  const [items, setItems] = useState<AdminSellerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('PENDING_VERIFICATION');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchApplications = () => {
    setLoading(true);
    AdminSellerService.listApplications({
      search: search || undefined,
      status: selectedStatus || undefined,
      page,
      limit: 15,
    })
      .then((res) => {
        setItems(res.items);
        setTotalPages(res.totalPages);
        setTotalCount(res.total);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedStatus, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED_ACTIVE':
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-50 text-brand border border-emerald-200 text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'PENDING_VERIFICATION':
      case 'PENDING':
        return (
          <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-[10px]">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      case 'DRAFT':
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-ink-muted">
            Draft
          </Badge>
        );
    }
  };

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-surface-subtle py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink">Seller Verification Queue</h1>
              <p className="text-xs text-ink-muted mt-0.5">
                Inspect merchant applications, review submitted KYC documents, and manage store
                activations.
              </p>
            </div>
            <div className="text-xs font-semibold text-ink-secondary bg-white px-3 py-1.5 rounded-lg border border-border shadow-2xs">
              Total Applications: <span className="text-brand font-bold">{totalCount}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <Card className="border-border bg-white shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search store name, owner, or business email..."
                      className="pl-9 text-xs"
                    />
                  </div>
                  <Button type="submit" size="sm" className="bg-brand text-white text-xs">
                    Search
                  </Button>
                </form>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="w-4 h-4 text-ink-muted shrink-0" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {STATUS_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table / Cards */}
          {loading ? (
            <Card className="border-border bg-white p-12 flex justify-center">
              <Spinner size="lg" />
            </Card>
          ) : items.length === 0 ? (
            <Card className="border-border bg-white p-12 text-center space-y-3">
              <Store className="w-10 h-10 text-ink-muted mx-auto" />
              <h3 className="font-bold text-ink">No Seller Applications Found</h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                No merchant applications match the selected status filter or search query.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((app) => (
                <Card
                  key={app.id}
                  className="border-border bg-white shadow-xs hover:border-brand/40 transition-colors"
                >
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-ink text-sm sm:text-base">
                          {app.storeDisplayName || app.businessName}
                        </h3>
                        {getStatusBadge(app.status)}
                        <Badge variant="outline" className="text-[10px]">
                          {app.storeCategory}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
                        <span>
                          Owner: <strong className="text-ink">{app.ownerName}</strong>
                        </span>
                        <span>
                          Email: <strong className="text-ink">{app.ownerEmail}</strong>
                        </span>
                        {app.ownerPhone && (
                          <span>
                            Phone: <strong className="text-ink">+91 {app.ownerPhone}</strong>
                          </span>
                        )}
                        <span>
                          Submitted:{' '}
                          <strong className="text-ink">
                            {app.submittedAt
                              ? new Date(app.submittedAt).toLocaleDateString()
                              : 'Draft'}
                          </strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-ink-muted pt-0.5">
                        KYC Documents: {app.verifiedDocuments} / {app.totalDocuments} Verified
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <Link href={`/admin/sellers/${app.id}`}>
                        <Button size="sm" className="bg-brand text-white font-bold text-xs">
                          Inspect Application
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-ink-muted">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
