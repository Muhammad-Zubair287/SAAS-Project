'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { ROUTES } from '../../../constants/routes.constants';
import { usePermissions } from '../../../lib/permissions/use-permissions';
import { REPORT_CATALOGUE } from '../../../modules/reports/constants/reports.constants';

interface ReportsPageClientProps {
  title: string;
  description: string;
}

export function ReportsPageClient({ title, description }: ReportsPageClientProps) {
  const t = useTranslations();
  const { hasPermission } = usePermissions();
  const visible = REPORT_CATALOGUE.filter((item) => hasPermission(item.permission));

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.home'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.reports') },
        ]}
      />
      {visible.length === 0 ? (
        <p className="text-body-md text-text-secondary">{t('tenant.reports.empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((report) => (
            <li key={report.code}>
              <article className="flex h-full flex-col rounded-xl border border-border-default bg-surface-primary p-4">
                <h2 className="text-title-md font-semibold text-text-primary">
                  {t(report.titleKey as Parameters<typeof t>[0])}
                </h2>
                <p className="mt-2 flex-1 text-body-sm text-text-secondary">
                  {t(report.descriptionKey as Parameters<typeof t>[0])}
                </p>
                <Link
                  href={report.href}
                  className="mt-4 inline-flex w-fit rounded-md bg-brand-blue-600 px-3 py-1.5 text-body-sm font-medium text-white hover:bg-brand-blue-500"
                >
                  {t('tenant.reports.run')}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
