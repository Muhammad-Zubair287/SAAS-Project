'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateDepartment } from '../hooks/use-departments';
import { useLegalEntities } from '../hooks/use-legal-entities';
import { useBranches } from '../hooks/use-branches';
import { useDepartments } from '../hooks/use-departments';
import { useCostCentres } from '../hooks/use-cost-centres';
import { ROUTES } from '../../../constants/routes.constants';
import type { CreateDepartmentPayload } from '../types/organisation.types';

const INITIAL: CreateDepartmentPayload = {
  legalEntityId: '',
  name: '',
  code: '',
};

export function CreateDepartmentForm() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateDepartment();
  const [form, setForm] = useState<CreateDepartmentPayload>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const { data: leData }  = useLegalEntities();
  const { data: brData }  = useBranches(form.legalEntityId ? { legalEntityId: form.legalEntityId } : undefined);
  const { data: deptData } = useDepartments(form.legalEntityId ? { legalEntityId: form.legalEntityId } : undefined);
  const { data: ccData }  = useCostCentres(form.legalEntityId ? { legalEntityId: form.legalEntityId } : undefined);

  function update<K extends keyof CreateDepartmentPayload>(key: K, value: CreateDepartmentPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: CreateDepartmentPayload = {
        ...form,
        branchId:     form.branchId     || undefined,
        parentId:     form.parentId     || undefined,
        costCentreId: form.costCentreId || undefined,
      };
      const result = await create.mutateAsync(payload);
      router.push(ROUTES.TENANT.ORGANISATION.DEPARTMENT_DETAIL(result.data.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  const legalEntities = leData?.data  ?? [];
  const branches      = brData?.data  ?? [];
  const departments   = deptData?.data ?? [];
  const costCentres   = ccData?.data   ?? [];

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">{error}</div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
        <h2 className="text-heading-h2 font-semibold text-text-primary">
          {t('organisation.departments.create.sectionDetails')}
        </h2>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.departments.fields.legalEntity')} <span className="text-semantic-danger">*</span>
          </label>
          <select required value={form.legalEntityId}
            onChange={(e) => { update('legalEntityId', e.target.value); update('branchId', undefined); update('parentId', undefined); }}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.departments.fields.legalEntityPlaceholder')}</option>
            {legalEntities.map((le) => (<option key={le.id} value={le.id}>{le.name}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.departments.fields.name')} <span className="text-semantic-danger">*</span>
            </label>
            <input type="text" required maxLength={200} value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.departments.fields.code')} <span className="text-semantic-danger">*</span>
            </label>
            <input type="text" required maxLength={40} value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 font-mono text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.departments.fields.branch')}
          </label>
          <select value={form.branchId ?? ''} onChange={(e) => update('branchId', e.target.value || undefined)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.departments.fields.branchPlaceholder')}</option>
            {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.departments.fields.parentDepartment')}
          </label>
          <select value={form.parentId ?? ''} onChange={(e) => update('parentId', e.target.value || undefined)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.departments.fields.parentDepartmentPlaceholder')}</option>
            {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.departments.fields.costCentre')}
          </label>
          <select value={form.costCentreId ?? ''} onChange={(e) => update('costCentreId', e.target.value || undefined)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.departments.fields.costCentrePlaceholder')}</option>
            {costCentres.map((cc) => (<option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={create.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors">
          {create.isPending ? t('common.loading') : t('organisation.departments.create.submitButton')}
        </button>
      </div>
    </form>
  );
}
