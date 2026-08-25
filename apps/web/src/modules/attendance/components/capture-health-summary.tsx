'use client';

import { useTranslations } from 'next-intl';
import { StatCard } from '../../../components/common/stat-card';
import { Skeleton } from '../../../components/feedback/skeleton';
import type { CaptureHealthCounts } from '../utils/capture-health';

interface CaptureHealthSummaryProps {
  counts: CaptureHealthCounts;
  isLoading?: boolean;
}

/**
 * Operational KPI strip derived from GET /attendance/devices/health row counts.
 */
export function CaptureHealthSummary({
  counts,
  isLoading = false,
}: CaptureHealthSummaryProps) {
  const t = useTranslations('attendance.capture.summary');

  if (isLoading) {
    return (
      <section aria-busy="true" aria-label={t('title')}>
        <h2 className="mb-3 text-heading-h3 font-semibold text-text-primary">
          {t('title')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" aria-label={t('title')} />
          ))}
        </div>
      </section>
    );
  }

  const cards: Array<{
    key: string;
    title: string;
    value: number;
    variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  }> = [
    { key: 'total', title: t('total'), value: counts.total, variant: 'default' },
    { key: 'healthy', title: t('healthy'), value: counts.HEALTHY, variant: 'success' },
    { key: 'degraded', title: t('degraded'), value: counts.DEGRADED, variant: 'warning' },
    { key: 'unhealthy', title: t('unhealthy'), value: counts.UNHEALTHY, variant: 'danger' },
    { key: 'offline', title: t('offline'), value: counts.OFFLINE, variant: 'info' },
    { key: 'suspended', title: t('suspended'), value: counts.SUSPENDED, variant: 'warning' },
    {
      key: 'decommissioned',
      title: t('decommissioned'),
      value: counts.DECOMMISSIONED,
      variant: 'default',
    },
  ];

  return (
    <section aria-label={t('title')}>
      <h2 className="mb-3 text-heading-h3 font-semibold text-text-primary">
        {t('title')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            variant={card.variant}
            className="p-4"
          />
        ))}
      </div>
    </section>
  );
}
