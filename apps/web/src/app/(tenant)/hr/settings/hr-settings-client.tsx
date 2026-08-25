'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';

const LINKS = [
  { href: ROUTES.TENANT.ATTENDANCE.POLICIES, labelKey: 'hr.settings.attendancePolicies' },
  { href: ROUTES.TENANT.ORGANISATION.ROOT, labelKey: 'hr.settings.organisation' },
  { href: ROUTES.TENANT.SETTINGS_SECURITY, labelKey: 'hr.settings.security' },
  { href: ROUTES.TENANT.SETTINGS_REGIONAL, labelKey: 'hr.settings.regional' },
  { href: ROUTES.TENANT.EMPLOYEES.DATA_QUALITY, labelKey: 'hr.settings.dataQuality' },
] as const;

export function HrSettingsClient() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('hr.settings.title')}
        description={t('hr.settings.description')}
        breadcrumbs={[
          { label: t('hr.dashboard.title'), href: ROUTES.TENANT.HR.ROOT },
          { label: t('hr.settings.title') },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-border-default bg-surface-primary p-5 text-body-md font-medium text-text-primary hover:border-brand-blue-600"
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}
