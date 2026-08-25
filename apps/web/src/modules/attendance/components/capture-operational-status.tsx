'use client';

import { useTranslations } from 'next-intl';

interface CaptureOperationalStatusProps {
  lastUpdatedAt?: Date | null;
  rowCount: number;
}

/**
 * Frontend refresh metadata — not device heartbeat time.
 */
export function CaptureOperationalStatus({
  lastUpdatedAt,
  rowCount,
}: CaptureOperationalStatusProps) {
  const t = useTranslations('attendance.capture');

  const timeLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleString()
    : '—';

  return (
    <section
      className="rounded-lg border border-border-default bg-surface-primary p-4"
      aria-label={t('operational.title')}
    >
      <h2 className="text-heading-h3 font-semibold text-text-primary">
        {t('operational.title')}
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-label-md text-text-secondary">{t('lastUpdated')}</dt>
          <dd dir="ltr" className="mt-0.5 font-mono text-body-sm tabular-nums text-text-primary">
            {timeLabel}
          </dd>
        </div>
        <div>
          <dt className="text-label-md text-text-secondary">{t('operational.dataSource')}</dt>
          <dd className="mt-0.5 text-body-sm text-text-primary">
            {t('operational.rowCount', { count: rowCount })}
          </dd>
        </div>
      </dl>
    </section>
  );
}
