'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateCostCentre } from '../hooks/use-cost-centres';
import { useLegalEntities } from '../hooks/use-legal-entities';
import { ROUTES } from '../../../constants/routes.constants';
import type { CreateCostCentrePayload } from '../types/organisation.types';

const INITIAL: CreateCostCentrePayload = {
  legalEntityId: '',
  code: '',
  name: '',
  description: '',
};

export function CreateCostCentreForm() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateCostCentre();
  const { data: leData } = useLegalEntities();
  const [form, setForm] = useState<CreateCostCentrePayload>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CreateCostCentrePayload>(key: K, value: CreateCostCentrePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await create.mutateAsync({ ...form, description: form.description || undefined });
      router.push(ROUTES.TENANT.ORGANISATION.COST_CENTRE_DETAIL(result.data.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  const legalEntities = leData?.data ?? [];

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">{error}</div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
        <h2 className="text-heading-h2 font-semibold text-text-primary">
          {t('organisation.costCentres.create.sectionDetails')}
        </h2>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.costCentres.fields.legalEntity')} <span className="text-semantic-danger">*</span>
          </label>
          <select required value={form.legalEntityId} onChange={(e) => update('legalEntityId', e.target.value)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600">
            <option value="">{t('organisation.costCentres.fields.legalEntityPlaceholder')}</option>
            {legalEntities.map((le) => (<option key={le.id} value={le.id}>{le.name}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.costCentres.fields.name')} <span className="text-semantic-danger">*</span>
            </label>
            <input type="text" required maxLength={200} value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
          <div>
            <label className="block text-label-md font-medium text-text-primary mb-1">
              {t('organisation.costCentres.fields.code')} <span className="text-semantic-danger">*</span>
            </label>
            <input type="text" required maxLength={40} value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 font-mono text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600" />
          </div>
        </div>

        <div>
          <label className="block text-label-md font-medium text-text-primary mb-1">
            {t('organisation.costCentres.fields.description')}
          </label>
          <textarea rows={3} maxLength={500} value={form.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
            className="w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 resize-none" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={create.isPending}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors">
          {create.isPending ? t('common.loading') : t('organisation.costCentres.create.submitButton')}
        </button>
      </div>
    </form>
  );
}
