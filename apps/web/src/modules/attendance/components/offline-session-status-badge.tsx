'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeVariant } from '../../../components/ui/badge';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'info',
  CLOSED: 'neutral',
  COMPLETED: 'success',
};

interface OfflineSessionStatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Localized offline capture-session status badge.
 * Labels carry meaning; semantic tokens support colour (not colour alone).
 */
export function OfflineSessionStatusBadge({
  status,
  size = 'sm',
  className,
}: OfflineSessionStatusBadgeProps) {
  const t = useTranslations('attendance.offline.sessionStatus');
  const key = (status ?? '').toUpperCase();
  const variant = STATUS_VARIANT[key] ?? 'neutral';
  const label =
    key === 'ACTIVE' || key === 'CLOSED' || key === 'COMPLETED'
      ? t(key)
      : status || '—';

  return (
    <Badge
      variant={variant}
      size={size}
      dot
      className={className}
      title={label}
    >
      {label}
    </Badge>
  );
}
