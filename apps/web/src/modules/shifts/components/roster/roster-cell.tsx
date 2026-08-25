'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../lib/utils/cn';
import type { RosterAssignment } from '../../types/roster.types';

interface RosterCellProps {
  assignment?: RosterAssignment;
  onOpen: () => void;
  canAssign: boolean;
  dateLabel: string;
  employeeLabel: string;
}

export function RosterCell({
  assignment,
  onOpen,
  canAssign,
  dateLabel,
  employeeLabel,
}: RosterCellProps) {
  const t = useTranslations('roster.cell');

  if (!assignment) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={!canAssign}
        className={cn(
          'flex min-h-14 w-full flex-col items-start justify-center rounded-md border border-dashed border-border-subtle px-2 py-1 text-start text-xs text-text-tertiary',
          canAssign && 'hover:border-border-default hover:bg-surface-secondary',
          !canAssign && 'cursor-default opacity-70',
        )}
        aria-label={t('emptyAria', { employee: employeeLabel, date: dateLabel })}
      >
        <span>—</span>
      </button>
    );
  }

  const isDraft = assignment.rosterStatus === 'DRAFT' || assignment.isDraftTip;
  const isPublished =
    assignment.rosterStatus === 'PUBLISHED' || assignment.isEffectivePublished;
  const title = assignment.isRestDay
    ? t('restDay')
    : `${assignment.shiftCode ?? ''} ${assignment.startLocalTime ?? ''}–${assignment.endLocalTime ?? ''}`.trim();

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-14 w-full flex-col gap-1 rounded-md border px-2 py-1 text-start text-xs',
        isDraft && 'border-border-default bg-surface-secondary',
        isPublished && !isDraft && 'border-border-subtle bg-surface-primary',
        'hover:ring-1 hover:ring-border-default',
      )}
      aria-label={t('filledAria', {
        employee: employeeLabel,
        date: dateLabel,
        status: isDraft ? t('draft') : t('published'),
        detail: title,
      })}
    >
      <span className="flex flex-wrap items-center gap-1">
        <Badge variant={isDraft ? 'warning' : 'success'} className="text-[10px]">
          {isDraft ? t('draft') : t('published')}
        </Badge>
        {assignment.isRestDay ? (
          <Badge variant="neutral" className="text-[10px]">
            {t('restDay')}
          </Badge>
        ) : null}
      </span>
      {assignment.isRestDay ? (
        <span className="font-medium text-text-secondary">{t('restDay')}</span>
      ) : (
        <>
          <span className="font-medium text-text-primary" dir="ltr">
            {assignment.shiftCode ?? assignment.shiftName}
          </span>
          <span className="text-text-tertiary" dir="ltr">
            {assignment.startLocalTime}–{assignment.endLocalTime}
            {assignment.crossesMidnight ? ` · ${t('overnight')}` : ''}
          </span>
        </>
      )}
    </button>
  );
}
