'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EMPLOYEE_BOTTOM_NAV_ITEMS } from '../../../modules/employee-self-service/constants/ess-nav.constants';

function BottomIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z',
    attendance:
      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    requests:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    payslips:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    more: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z',
  };

  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] ?? paths.more!} />
    </svg>
  );
}

/** SCR-EMP-NAV-02 — five-item mobile bottom navigation. */
export function EmployeeBottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('employee.nav.bottomLabel')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border-default bg-surface-primary pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {EMPLOYEE_BOTTOM_NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-caption font-medium transition-colors ${
                  active
                    ? 'text-brand-blue-700'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <BottomIcon name={item.key} />
                <span className="truncate">{t(item.labelKey as Parameters<typeof t>[0])}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
