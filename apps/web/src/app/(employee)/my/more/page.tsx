'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { EMPLOYEE_MORE_LINKS } from '../../../../modules/employee-self-service/constants/ess-nav.constants';
import { usePermissions } from '../../../../lib/permissions/use-permissions';
import { useAuth } from '../../../../lib/auth/auth-provider';

const CARD =
  'flex min-h-11 items-center justify-between rounded-xl border border-border-default bg-surface-primary px-4 py-3 text-body-md font-semibold text-text-primary transition-colors hover:border-brand-blue-300';

/** SCR-ESS-04 adjacent — More hub for overflow destinations on mobile. */
export default function EmployeeMorePage() {
  const t = useTranslations();
  const { hasPermission } = usePermissions();
  const { logout } = useAuth();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-heading-h2 font-bold text-text-primary">{t('employee.nav.more')}</h1>
        <p className="mt-1 text-body-sm text-text-secondary">{t('ess.more.description')}</p>
      </div>

      <ul className="space-y-2">
        {EMPLOYEE_MORE_LINKS.filter(
          (item) => !item.permission || hasPermission(item.permission),
        ).map((item) => (
          <li key={item.key}>
            <Link href={item.href} className={CARD}>
              <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
              <span aria-hidden="true" className="text-text-tertiary">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-semantic-danger/40 bg-semantic-danger/5 px-4 py-3 text-body-md font-semibold text-semantic-danger"
      >
        {t('tenant.chrome.userMenu.logout')}
      </button>
    </div>
  );
}
