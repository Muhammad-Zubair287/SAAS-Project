'use client';

import { useTranslations } from 'next-intl';

type Scope = 'tenant' | 'legalEntity' | 'branch';

interface Props {
  legalEntityId: string | null;
  branchId: string | null;
}

const SCOPE_COLORS: Record<Scope, string> = {
  branch: 'bg-purple-100 text-purple-800',
  legalEntity: 'bg-blue-100 text-blue-800',
  tenant: 'bg-gray-100 text-gray-700',
};

export function AttendancePolicyScopeBadge({ legalEntityId, branchId }: Props) {
  const t = useTranslations('attendance.policy');

  const scope: Scope = branchId ? 'branch' : legalEntityId ? 'legalEntity' : 'tenant';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SCOPE_COLORS[scope]}`}>
      {t(`scope.${scope}`)}
    </span>
  );
}
