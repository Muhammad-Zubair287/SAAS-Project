'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '../../../components/ui/badge';

interface ShiftStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function ShiftStatusBadge({ status, size = 'sm' }: ShiftStatusBadgeProps) {
  const t = useTranslations('shifts.status');
  const normalized = status.toUpperCase();
  const variant = normalized === 'ACTIVE' ? 'success' : 'neutral';
  const label =
    normalized === 'ACTIVE'
      ? t('ACTIVE')
      : normalized === 'INACTIVE'
        ? t('INACTIVE')
        : status;

  return (
    <Badge variant={variant} size={size} dot>
      {label}
    </Badge>
  );
}
