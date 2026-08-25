'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../constants/routes.constants';
import { useApprovalsInbox } from '../../../../modules/workflow/hooks/use-approvals';

/**
 * SCR-WFL-02 — resolve inbox item to the owning module detail screen.
 */
export default function ApprovalDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const inbox = useApprovalsInbox();

  useEffect(() => {
    if (!id || inbox.isLoading) return;

    const item = inbox.data?.data?.items.find((row) => row.id === id);

    if (item?.type === 'LEAVE' && item.hrefLeaveRequestId) {
      router.replace(ROUTES.TENANT.LEAVE.REQUEST_DETAIL(item.hrefLeaveRequestId));
      return;
    }

    if (item?.type === 'CHANGE_REQUEST') {
      const changeId = item.hrefChangeRequestId ?? item.id;
      router.replace(
        `${ROUTES.TENANT.EMPLOYEES.DETAIL(item.employeeId)}?changeRequest=${encodeURIComponent(changeId)}`,
      );
      return;
    }

    if (!inbox.isLoading) {
      router.replace(
        `${ROUTES.TENANT.EMPLOYEES.ROOT}?changeRequest=${encodeURIComponent(id)}`,
      );
    }
  }, [id, inbox.data, inbox.isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <LoadingSpinner size="lg" />
      <p className="text-body-sm text-text-secondary">{t('common.loading')}</p>
    </div>
  );
}
