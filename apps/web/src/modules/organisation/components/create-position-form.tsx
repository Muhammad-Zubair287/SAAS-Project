'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreatePosition } from '../hooks/use-positions';
import { useLegalEntities } from '../hooks/use-legal-entities';
import { useDepartments } from '../hooks/use-departments';
import { useCostCentres } from '../hooks/use-cost-centres';
import { ROUTES } from '../../../constants/routes.constants';
import type { CreatePositionPayload } from '../types/organisation.types';

const INITIAL: CreatePositionPayload = {
  legalEntityId: '',
  title: '',
  code: '',
  isManager: false,
};

export function CreatePositionForm() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreatePosition();
  const [form, setForm] = useState<CreatePositionPayload>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const { data: leData }   = useLegalEntities();
  const { data: deptData } = useDepartments(form.legalEntityId ? { legalEntityId: form.legalEntityId } : undefined);
  const { data: ccData }   = useCostCentres(form.legalEntityId ? { legalEntityId: form.legalEntityId } : undefined);

  function update<K extends keyof CreatePositionPayload>(key: K, value: CreatePositionPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await create.mutateAsync({
        ...form,
        departmentId: form.departmentId || undefined,
        costCentreId: form.costCentreId || undefined,
        grade:        form.grade        || undefined,
        description:  form.description  || undefined,
      });
      router.push(ROUTES.TENANT.ORGANISATION.POSITION_DETAIL(result.data.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  const legalEntities = leData?.data  ?? [];
  const departments   = deptData?.data ?? [];
  const costCentres   = ccData?.data   ?? [];

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">{error}</div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
        <h2 className="text-heading-h2 font-semibold text-text-primary">
          {t('organisation.positions.create.sectionDetails')}
        </h2>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.positions.fields.legalEntity')} <span className="text-semantic-danger">*</span>
          </label>
          <select required value={form.legalEntityId}
            onChange={(e) => { update('legalEntityId', e.target.value); update('departmentId', undefined); }}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.positions.fields.legalEntityPlaceholder')}</option>
            {legalEntities.map((le) => (<option key={le.id} value={le.id}>{le.name}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.positions.fields.title')} <span className="text-semantic-danger">*</span>
            </label>
            <input type="text" required maxLength={200} value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.positions.fields.code')} <span className="text-semantic-danger">*</span>
            </label>
            <input type="text" required maxLength={40} value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 font-mono text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.positions.fields.department')}
            </label>
            <select value={form.departmentId ?? ''} onChange={(e) => update('departmentId', e.target.value || undefined)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
              <option value="">{t('organisation.positions.fields.departmentPlaceholder')}</option>
              {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.positions.fields.grade')}
            </label>
            <input type="text" maxLength={40} value={form.grade ?? ''}
              onChange={(e) => update('grade', e.target.value || undefined)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.positions.fields.costCentre')}
          </label>
          <select value={form.costCentreId ?? ''} onChange={(e) => update('costCentreId', e.target.value || undefined)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.positions.fields.costCentrePlaceholder')}</option>
            {costCentres.map((cc) => (<option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>))}
          </select>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.positions.fields.description')}
          </label>
          <textarea rows={3} maxLength={500} value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value || undefined)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 resize-none" />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="isManager" checked={form.isManager ?? false}
            onChange={(e) => update('isManager', e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-brand-blue-600 focus:ring-brand-blue-600" />
          <label htmlFor="isManager" className="text-body-md text-text-primary cursor-pointer">
            {t('organisation.positions.fields.isManager')}
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={create.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors">
          {create.isPending ? t('common.loading') : t('organisation.positions.create.submitButton')}
        </button>
      </div>
    </form>
  );
}
