'use client';

import { useTranslations } from 'next-intl';
import { useEmployeeTimeline } from '../../../../../modules/employee/hooks/use-employees';

export function TimelinePageClient({ employeeId }: { employeeId: string }) {
  const t = useTranslations();
  const timeline = useEmployeeTimeline(employeeId);

  if (timeline.isLoading) {
    return <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-text-secondary">{t('common.loading')}</div>;
  }

  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-6">
      <div className="space-y-3">
        {(timeline.data?.data ?? []).map((item) => (
          <div key={item.id} className="rounded-md border border-border-default p-4">
            <p className="text-body-sm font-semibold text-text-primary">{item.summary}</p>
            <p className="text-caption text-text-secondary">{new Date(item.occurredAt).toLocaleString()}</p>
            <p className="text-caption text-text-secondary">{item.eventType}</p>
          </div>
        ))}
        {timeline.data?.data?.length === 0 && <p className="text-text-secondary">{t('common.noData')}</p>}
      </div>
    </div>
  );
}
