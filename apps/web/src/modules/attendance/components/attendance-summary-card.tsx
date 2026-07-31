'use client';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  colorClass?: string;
}

export function AttendanceSummaryCard({
  title,
  value,
  subtitle,
  colorClass = 'text-text-primary',
}: Props) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-primary p-5 flex flex-col gap-1">
      <p className="text-body-sm text-text-secondary">{title}</p>
      <p className={`text-heading-h2 font-bold ${colorClass}`}>{value}</p>
      {subtitle && <p className="text-caption text-text-secondary">{subtitle}</p>}
    </div>
  );
}
