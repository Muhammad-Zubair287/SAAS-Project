'use client';

import type { OrgEntityStatus } from '../types/organisation.types';

interface OrgStatusBadgeProps {
  status: OrgEntityStatus;
}

const CONFIG: Record<OrgEntityStatus, { label: string; classes: string }> = {
  ACTIVE:   { label: 'Active',   classes: 'bg-semantic-success/10 text-semantic-success' },
  INACTIVE: { label: 'Inactive', classes: 'bg-surface-canvas text-text-secondary' },
};

export function OrgStatusBadge({ status }: OrgStatusBadgeProps) {
  const { label, classes } = CONFIG[status] ?? CONFIG.INACTIVE;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium ${classes}`}>
      {label}
    </span>
  );
}
