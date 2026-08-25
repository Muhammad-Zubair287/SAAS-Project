'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { LoadingSpinner } from '../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../constants/routes.constants';
import { useApprovalsInbox } from '../../../modules/workflow/hooks/use-approvals';

export function ApprovalsPageClient() {
  const t = useTranslations('tenant.approvals');
  const tn = useTranslations('tenant.nav');
  const inbox = useApprovalsInbox();
  const items = inbox.data?.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('approvals') },
        ]}
      />
      <h2 className="text-title-md font-semibold text-text-primary">{t('tabs.assigned')}</h2>
      {inbox.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-primary">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-canvas">
                <th className="px-4 py-3 text-left">{t('columns.type')}</th>
                <th className="px-4 py-3 text-left">{t('columns.employee')}</th>
                <th className="px-4 py-3 text-left">{t('columns.title')}</th>
                <th className="px-4 py-3 text-left">{t('columns.status')}</th>
                <th className="px-4 py-3 text-left">{t('columns.submittedAt')}</th>
                <th className="px-4 py-3 text-left">{t('columns.open')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const href =
                    item.type === 'LEAVE' && item.hrefLeaveRequestId
                      ? ROUTES.TENANT.LEAVE.REQUEST_DETAIL(item.hrefLeaveRequestId)
                      : ROUTES.TENANT.APPROVALS.DETAIL(item.id);
                  return (
                    <tr key={`${item.type}-${item.id}`}>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-surface-canvas px-2 py-1 text-label-md">
                          {t(`types.${item.type}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.employeeName ?? item.employeeId}</td>
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">
                        {item.submittedAt
                          ? new Date(item.submittedAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={href} className="text-brand-blue-600 hover:underline">
                          {t('columns.open')}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
