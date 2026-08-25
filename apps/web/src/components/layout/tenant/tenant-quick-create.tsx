'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ROUTES } from '../../../constants/routes.constants';

export function TenantQuickCreate() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-blue-600 text-white hover:bg-brand-blue-500"
        aria-label={t('tenant.chrome.quickCreate.label')}
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-56 rounded-xl border border-border-default bg-surface-primary py-1 shadow-elevation-3">
          <Link
            href={ROUTES.TENANT.EMPLOYEES.NEW}
            className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
            onClick={() => setOpen(false)}
          >
            {t('tenant.chrome.quickCreate.addEmployee')}
          </Link>
          <Link
            href={ROUTES.TENANT.LEAVE.NEW}
            className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
            onClick={() => setOpen(false)}
          >
            {t('tenant.chrome.quickCreate.requestLeave')}
          </Link>
          <Link
            href={ROUTES.TENANT.ATTENDANCE.RECORDS}
            className="block px-4 py-2 text-body-sm text-text-primary hover:bg-surface-canvas"
            onClick={() => setOpen(false)}
          >
            {t('tenant.chrome.quickCreate.recordAttendance')}
          </Link>
        </div>
      )}
    </div>
  );
}
