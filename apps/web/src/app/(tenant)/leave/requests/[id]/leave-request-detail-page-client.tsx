'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../../constants/routes.constants';
import {
  useApproveLeaveRequest,
  useLeaveRequest,
  useRejectLeaveRequest,
} from '../../../../../modules/leave/hooks/use-leave';

export function LeaveRequestDetailPageClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('tenant.leave');
  const tn = useTranslations('tenant.nav');
  const tc = useTranslations('common');
  const request = useLeaveRequest(id);
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();
  const row = request.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('detail.title')}
        description={t('detail.description')}
        breadcrumbs={[
          { label: tn('home'), href: ROUTES.TENANT.DASHBOARD },
          { label: tn('leave'), href: ROUTES.TENANT.LEAVE.ROOT },
          { label: t('requests.title'), href: ROUTES.TENANT.LEAVE.REQUESTS },
          { label: t('detail.title') },
        ]}
      />
      {request.isLoading || !row ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <dl className="grid gap-4 rounded-xl border border-border-default bg-surface-primary p-6 sm:grid-cols-2">
            <div>
              <dt className="text-label-md text-text-secondary">{t('columns.employee')}</dt>
              <dd className="mt-1 text-body-md text-text-primary">
                {row.employee.displayName ?? row.employeeId}
              </dd>
            </div>
            <div>
              <dt className="text-label-md text-text-secondary">{t('columns.type')}</dt>
              <dd className="mt-1 text-body-md text-text-primary">{row.leaveType.name}</dd>
            </div>
            <div>
              <dt className="text-label-md text-text-secondary">{t('columns.dates')}</dt>
              <dd className="mt-1 text-body-md text-text-primary">
                {row.startsOn} → {row.endsOn}
              </dd>
            </div>
            <div>
              <dt className="text-label-md text-text-secondary">{t('columns.status')}</dt>
              <dd className="mt-1 text-body-md text-text-primary">{t(`status.${row.status}`)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-label-md text-text-secondary">{t('columns.reason')}</dt>
              <dd className="mt-1 text-body-md text-text-primary">{row.reason ?? '—'}</dd>
            </div>
          </dl>
          {row.status === 'SUBMITTED' && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={approve.isPending || reject.isPending}
                onClick={() => void approve.mutateAsync(row.id)}
                className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm font-semibold text-white disabled:opacity-50"
              >
                {t('detail.approve')}
              </button>
              <button
                type="button"
                disabled={approve.isPending || reject.isPending}
                onClick={() => void reject.mutateAsync(row.id)}
                className="rounded-md border border-border-default px-4 py-2 text-body-sm font-semibold text-text-primary disabled:opacity-50"
              >
                {t('detail.reject')}
              </button>
            </div>
          )}
          {row.status !== 'SUBMITTED' && (
            <p className="text-body-sm text-text-secondary">{t('detail.noActions')}</p>
          )}
          <p className="sr-only">{tc('actions')}</p>
        </>
      )}
    </div>
  );
}
