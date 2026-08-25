'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransferEmployee } from '../../../../../modules/employee/hooks/use-employees';
import { useLegalEntities } from '../../../../../modules/organisation/hooks/use-legal-entities';
import { useBranches } from '../../../../../modules/organisation/hooks/use-branches';
import { useDepartments } from '../../../../../modules/organisation/hooks/use-departments';
import { usePositions } from '../../../../../modules/organisation/hooks/use-positions';
import { ROUTES } from '../../../../../constants/routes.constants';

const INPUT_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none';

export function TransferFormClient({ employeeId }: { employeeId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const transfer = useTransferEmployee(employeeId);

  const [legalEntityId, setLegalEntityId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');

  const legalEntities = useLegalEntities({ pageSize: 100, status: 'ACTIVE' });
  const branches = useBranches({ pageSize: 100, status: 'ACTIVE', legalEntityId: legalEntityId || undefined });
  const departments = useDepartments({ pageSize: 100, status: 'ACTIVE', legalEntityId: legalEntityId || undefined });
  const positions = usePositions({ pageSize: 100, status: 'ACTIVE', legalEntityId: legalEntityId || undefined });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await transfer.mutateAsync({
      legalEntityId: legalEntityId || undefined,
      branchId: branchId || undefined,
      departmentId: departmentId || undefined,
      positionId: positionId || undefined,
      effectiveDate,
      reason: reason || undefined,
    });
    router.push(ROUTES.TENANT.EMPLOYEES.DETAIL(employeeId));
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-2xl space-y-4">
      <select className={INPUT_CLS} value={legalEntityId} onChange={(e) => setLegalEntityId(e.target.value)} required>
        <option value="">{t('employees.fields.legalEntity')}</option>
        {(legalEntities.data?.data ?? []).map((entity) => (
          <option key={entity.id} value={entity.id}>{entity.name}</option>
        ))}
      </select>
      <select className={INPUT_CLS} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
        <option value="">{t('employees.fields.branch')}</option>
        {(branches.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select className={INPUT_CLS} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
        <option value="">{t('employees.fields.department')}</option>
        {(departments.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select className={INPUT_CLS} value={positionId} onChange={(e) => setPositionId(e.target.value)}>
        <option value="">{t('employees.fields.position')}</option>
        {(positions.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
      <input className={INPUT_CLS} type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
      <textarea className={INPUT_CLS} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('employees.transfer.reason')} />
      <div className="flex justify-end">
        <button type="submit" disabled={transfer.isPending} className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {transfer.isPending ? t('common.loading') : 'Apply transfer'}
        </button>
      </div>
    </form>
  );
}
