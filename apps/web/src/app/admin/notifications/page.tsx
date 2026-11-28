'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import {
  AdminNotificationDeliveryItem,
  AdminNotificationHealthResponse,
  AdminOutboxEventItem,
} from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { NotificationsService } from '@/features/notifications/services/notifications.service';
import { Button } from '@/components/ui/button';

export default function AdminNotificationsPage() {
  const [health, setHealth] = useState<AdminNotificationHealthResponse | null>(null);
  const [deliveries, setDeliveries] = useState<AdminNotificationDeliveryItem[]>([]);
  const [outbox, setOutbox] = useState<AdminOutboxEventItem[]>([]);
  const [tab, setTab] = useState<'DELIVERIES' | 'OUTBOX'>('DELIVERIES');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [h, d, o] = await Promise.all([
      NotificationsService.adminGetHealth(),
      NotificationsService.adminListDeliveries({ limit: 30 }),
      NotificationsService.adminListOutbox(1, 30),
    ]);
    setHealth(h);
    setDeliveries(d.items);
    setOutbox(o.items);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetry = async (id: string) => {
    setBusyId(id);
    try {
      await NotificationsService.adminRetryDelivery(id);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-surface-tile/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-ink">Admin Notification Monitoring</h1>
              <p className="text-xs text-muted">
                Channel health, BullMQ queue metrics, transactional outbox, and delivery retries
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={loadData}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {health && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-semibold text-muted">Channels</p>
                <p className="mt-1 text-xs font-bold text-ink">
                  In-App: {health.channels.inApp ? 'ON' : 'OFF'} | Email:{' '}
                  {health.channels.email ? 'ON' : 'OFF'}
                </p>
                <p className="text-[11px] text-muted">
                  SMS: {health.channels.sms ? 'ON' : 'OFF'} | Push:{' '}
                  {health.channels.push ? 'ON' : 'OFF'}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-semibold text-muted">BullMQ Queue</p>
                <p className="mt-1 text-lg font-black text-ink">
                  {health.queue ? `${health.queue.waiting} waiting` : 'Unavailable'}
                </p>
                <p className="text-[11px] text-muted">
                  {health.queue ? `${health.queue.failed} failed` : 'Outbox fallback active'}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-semibold text-muted">Outbox</p>
                <p className="mt-1 text-lg font-black text-ink">{health.outbox.pending} pending</p>
                <p className="text-[11px] text-muted">{health.outbox.failed} failed</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-semibold text-muted">Delivery Issues</p>
                <p className="mt-1 text-lg font-black text-ink">
                  {health.deliveries.failed} failed
                </p>
                <p className="text-[11px] text-muted">
                  {health.deliveries.bounced} bounced | {health.deliveries.complained} complained
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === 'DELIVERIES' ? 'primary' : 'outline'}
              onClick={() => setTab('DELIVERIES')}
            >
              Deliveries
            </Button>
            <Button
              size="sm"
              variant={tab === 'OUTBOX' ? 'primary' : 'outline'}
              onClick={() => setTab('OUTBOX')}
            >
              Outbox Events
            </Button>
          </div>

          {tab === 'DELIVERIES' ? (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface/60 text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">Event</th>
                    <th className="px-4 py-3 font-bold">Channel</th>
                    <th className="px-4 py-3 font-bold">Provider</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Attempts</th>
                    <th className="px-4 py-3 font-bold">Error</th>
                    <th className="px-4 py-3 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 font-bold text-ink">{d.eventKey}</td>
                      <td className="px-4 py-3">{d.channel}</td>
                      <td className="px-4 py-3">{d.provider}</td>
                      <td className="px-4 py-3 font-semibold">{d.status}</td>
                      <td className="px-4 py-3">{d.attemptCount}</td>
                      <td className="px-4 py-3 text-red-600 max-w-xs truncate">
                        {d.failureReason || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(d.status === 'FAILED' || d.status === 'RETRY_SCHEDULED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === d.id}
                            onClick={() => handleRetry(d.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface/60 text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">Event</th>
                    <th className="px-4 py-3 font-bold">Aggregate</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Attempts</th>
                    <th className="px-4 py-3 font-bold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {outbox.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 font-bold text-ink">{e.eventKey}</td>
                      <td className="px-4 py-3">
                        {e.aggregateType}:{e.aggregateId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-semibold">{e.status}</td>
                      <td className="px-4 py-3">{e.attempts}</td>
                      <td className="px-4 py-3 text-red-600 max-w-xs truncate">
                        {e.errorMessage || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
