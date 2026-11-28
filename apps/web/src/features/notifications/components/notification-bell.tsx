'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationItem } from '@marvels-basket/shared';
import { NotificationsService } from '@/features/notifications/services/notifications.service';

function safeActionHref(actionUrl: string | null): string | null {
  if (!actionUrl || !actionUrl.startsWith('/') || actionUrl.startsWith('//')) return null;
  if (actionUrl.startsWith('/admin')) return null;
  return actionUrl;
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadUnread = useCallback(async () => {
    try {
      const count = await NotificationsService.getUnreadCount('customer');
      setUnreadCount(count);
    } catch {
      // Ignore silent background poll failures
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const timer = setInterval(loadUnread, 45000);
    return () => clearInterval(timer);
  }, [loadUnread]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const res = await NotificationsService.list('customer', { limit: 6 });
        setItems(res.items);
        setUnreadCount(res.unreadCount);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    await NotificationsService.markAllAsRead('customer');
    setUnreadCount(0);
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-black text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface/60">
            <span className="text-sm font-black text-ink">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-ink-muted hover:text-brand"
              >
                View all
              </Link>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted">Loading notifications...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                You&apos;re all caught up! No notifications yet.
              </div>
            ) : (
              items.map((item) => {
                const href = safeActionHref(item.actionUrl);
                const content = (
                  <div
                    className={`px-4 py-3 transition-colors hover:bg-surface/60 ${
                      !item.isRead ? 'bg-brand/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-ink">{item.title}</p>
                      {!item.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2">{item.message}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
                return href ? (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={() => {
                      if (!item.isRead) {
                        void NotificationsService.markAsRead(item.id, 'customer');
                      }
                      setOpen(false);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={item.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
