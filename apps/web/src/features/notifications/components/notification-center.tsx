'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Lock, Settings, Trash2 } from 'lucide-react';
import {
  NotificationCategoryType,
  NotificationItem,
  NotificationPreferencesResponse,
} from '@marvels-basket/shared';
import { NotificationsService } from '@/features/notifications/services/notifications.service';
import { Button } from '@/components/ui/button';

const CATEGORIES: Array<{ value: NotificationCategoryType | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ORDER', label: 'Orders' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'REFUND', label: 'Refunds' },
  { value: 'REVIEW', label: 'Reviews' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'PROMOTION', label: 'Promotions' },
];

export function NotificationCenter({ scope = 'customer' }: { scope?: 'customer' | 'seller' }) {
  const [tab, setTab] = useState<'INBOX' | 'PREFERENCES'>('INBOX');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategoryType | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferencesResponse | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await NotificationsService.list(scope, {
        type: categoryFilter || undefined,
        unreadOnly: unreadOnly || undefined,
        limit: 30,
      });
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      setError('Unable to load notifications right now.');
    } finally {
      setLoading(false);
    }
  }, [scope, categoryFilter, unreadOnly]);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await NotificationsService.getPreferences(scope);
      setPrefs(res);
    } catch {
      // Ignore
    }
  }, [scope]);

  useEffect(() => {
    if (tab === 'INBOX') {
      loadInbox();
    } else {
      loadPreferences();
    }
  }, [tab, loadInbox, loadPreferences]);

  const handleMarkRead = async (id: string) => {
    await NotificationsService.markAsRead(id, scope);
    await loadInbox();
  };

  const handleMarkAllRead = async () => {
    await NotificationsService.markAllAsRead(scope);
    await loadInbox();
  };

  const handleDismiss = async (id: string) => {
    await NotificationsService.dismiss(id);
    await loadInbox();
  };

  const toggleChannel = async (key: 'inApp' | 'email', next: boolean) => {
    if (!prefs) return;
    setSavingPrefs(true);
    try {
      const updated = await NotificationsService.updatePreferences({ [key]: next }, scope);
      setPrefs(updated);
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleCategory = async (
    category: NotificationCategoryType,
    channel: 'IN_APP' | 'EMAIL',
    next: boolean,
  ) => {
    setSavingPrefs(true);
    try {
      const updated = await NotificationsService.updatePreferences(
        { categories: [{ category, channel, isEnabled: next }] },
        scope,
      );
      setPrefs(updated);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">
              {scope === 'seller' ? 'Seller Notifications' : 'Notifications'}
            </h1>
            <p className="text-xs text-muted">
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={tab === 'INBOX' ? 'primary' : 'outline'}
            onClick={() => setTab('INBOX')}
          >
            Inbox
          </Button>
          <Button
            size="sm"
            variant={tab === 'PREFERENCES' ? 'primary' : 'outline'}
            onClick={() => setTab('PREFERENCES')}
          >
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Preferences
          </Button>
        </div>
      </div>

      {tab === 'INBOX' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCategoryFilter(c.value)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    categoryFilter === c.value
                      ? 'bg-brand text-white'
                      : 'bg-surface text-ink-muted hover:text-ink'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-line text-brand"
                />
                Unread only
              </label>
              {unreadCount > 0 && (
                <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-10 text-center">
              <p className="text-sm font-bold text-ink">No notifications found</p>
              <p className="mt-1 text-xs text-muted">
                Important order, payment, and account updates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    item.isRead ? 'border-line bg-white' : 'border-brand/30 bg-brand/5'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-black uppercase text-ink-muted">
                          {item.type}
                        </span>
                        <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                      </div>
                      <p className="text-xs text-ink-muted">{item.message}</p>
                      <p className="text-[11px] text-muted">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.actionUrl && item.actionUrl.startsWith('/') && (
                        <Link
                          href={item.actionUrl}
                          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand/90"
                        >
                          Open
                        </Link>
                      )}
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          title="Mark as read"
                          className="rounded-xl border border-line bg-white p-1.5 text-ink-muted hover:text-brand"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {scope === 'customer' && (
                        <button
                          type="button"
                          onClick={() => handleDismiss(item.id)}
                          title="Dismiss"
                          className="rounded-xl border border-line bg-white p-1.5 text-ink-muted hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-6 space-y-6">
          <div>
            <h2 className="text-base font-black text-ink">Channel Preferences</h2>
            <p className="text-xs text-muted">
              Mandatory security, payment, and refund notifications remain active even if optional channels are turned off.
            </p>
          </div>

          {prefs && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between rounded-xl border border-line p-3.5">
                  <div>
                    <p className="text-sm font-bold text-ink">In-App Notifications</p>
                    <p className="text-xs text-muted">Bell &amp; notification center updates</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={savingPrefs}
                    checked={prefs.channels.inApp}
                    onChange={(e) => toggleChannel('inApp', e.target.checked)}
                    className="h-4 w-4 rounded text-brand"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-line p-3.5">
                  <div>
                    <p className="text-sm font-bold text-ink">Email Notifications</p>
                    <p className="text-xs text-muted">Sent via verified Resend delivery</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={savingPrefs}
                    checked={prefs.channels.email}
                    onChange={(e) => toggleChannel('email', e.target.checked)}
                    className="h-4 w-4 rounded text-brand"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black text-ink">Category Controls</h3>
                <div className="divide-y divide-line rounded-xl border border-line">
                  {prefs.categories
                    .filter((c) => c.channel === 'EMAIL')
                    .map((cat) => (
                      <div
                        key={`${cat.channel}:${cat.category}`}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">{cat.category}</span>
                          {cat.isMandatory && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                              <Lock className="h-3 w-3" /> Mandatory
                            </span>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          disabled={savingPrefs || cat.isMandatory}
                          checked={cat.isEnabled}
                          onChange={(e) =>
                            toggleCategory(cat.category, 'EMAIL', e.target.checked)
                          }
                          className="h-4 w-4 rounded text-brand disabled:opacity-50"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
