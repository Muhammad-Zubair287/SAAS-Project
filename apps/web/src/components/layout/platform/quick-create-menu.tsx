'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ROUTES } from '../../../constants/routes.constants';
import { platformApi } from '../../../modules/platform/api/platform-api';

export function QuickCreateMenu() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function submitAnnouncement() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await platformApi.announcements.create({ title: title.trim(), body: body.trim() || undefined });
      setAnnounceOpen(false);
      setTitle('');
      setBody('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-blue-600 text-white hover:bg-brand-blue-500"
        aria-label={t('platform.chrome.quickCreate.label')}
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {open && !announceOpen && (
        <div className="absolute end-0 top-full z-50 mt-1 w-56 rounded-xl border border-border-default bg-surface-primary shadow-elevation-3 py-1">
          <Link
            href={ROUTES.PLATFORM.TENANTS_NEW}
            className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
            onClick={() => setOpen(false)}
          >
            {t('platform.chrome.quickCreate.createTenant')}
          </Link>
          <button
            type="button"
            className="block w-full px-4 py-2 text-start text-body-sm text-text-primary hover:bg-surface-canvas"
            onClick={() => setAnnounceOpen(true)}
          >
            {t('platform.chrome.quickCreate.announcement')}
          </button>
          <Link
            href={ROUTES.PLATFORM.TENANTS}
            className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
            onClick={() => setOpen(false)}
          >
            {t('platform.chrome.quickCreate.inviteUser')}
          </Link>
        </div>
      )}
      {open && announceOpen && (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 rounded-xl border border-border-default bg-surface-primary shadow-elevation-3 p-4">
          <p className="text-label-md font-semibold text-text-primary mb-2">
            {t('platform.chrome.quickCreate.announcement')}
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('platform.chrome.quickCreate.announcementTitle')}
            className="mb-2 w-full rounded-md border border-border-default px-3 py-1.5 text-body-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('platform.chrome.quickCreate.announcementBody')}
            rows={3}
            className="mb-3 w-full rounded-md border border-border-default px-3 py-1.5 text-body-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="text-body-sm text-text-secondary" onClick={() => setAnnounceOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => void submitAnnouncement()}
              className="rounded-md bg-brand-blue-600 px-3 py-1.5 text-body-sm font-medium text-white disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
