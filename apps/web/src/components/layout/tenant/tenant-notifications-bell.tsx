'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  useEssNotifications,
  useEssUnreadNotifications,
  useMarkEssNotificationRead,
  useMarkAllEssNotificationsRead,
} from '../../../modules/employee-self-service/hooks/use-ess';
import { ROUTES } from '../../../constants/routes.constants';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TenantNotificationsBell() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: countData } = useEssUnreadNotifications();
  const { data: notifData, refetch } = useEssNotifications({ status: 'UNREAD', pageSize: 10 });
  const markRead = useMarkEssNotificationRead();
  const markAll = useMarkAllEssNotificationsRead();

  const unreadCount = countData?.data.count ?? 0;
  const notifications = (notifData?.data ?? []).map((n) => ({
    ...n,
    isRead: Boolean(n.readAt),
  }));

  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600"
        aria-label={t('tenant.chrome.notifications.label')}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-semantic-danger text-caption font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 rounded-xl border border-border-default bg-surface-primary shadow-elevation-3">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <h2 className="text-label-md font-semibold text-text-primary">{t('tenant.chrome.notifications.title')}</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAll.isPending}
                onClick={() => void markAll.mutateAsync()}
                className="text-body-sm font-medium text-brand-blue-600 hover:underline disabled:opacity-50"
              >
                {t('tenant.chrome.notifications.markAll')}
              </button>
            )}
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-border-default">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-body-sm text-text-secondary">
                {t('tenant.chrome.notifications.empty')}
              </li>
            )}
            {notifications.map((n) => (
              <li key={n.id} className={`px-4 py-3 ${!n.isRead ? 'bg-brand-blue-50/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-text-primary">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-caption text-text-secondary">{n.body}</p>
                    )}
                    <p className="mt-1 text-caption text-text-secondary">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      disabled={markRead.isPending}
                      onClick={() => void markRead.mutateAsync(n.id)}
                      className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-blue-600 hover:bg-brand-blue-500"
                      aria-label={t('tenant.chrome.notifications.markRead')}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border-default p-2">
            <Link
              href={ROUTES.EMPLOYEE.NOTIFICATIONS}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-1.5 text-body-sm font-medium text-brand-blue-600 hover:bg-surface-canvas"
            >
              {t('tenant.chrome.notifications.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
