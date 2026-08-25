'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { ROUTES } from '../../../../constants/routes.constants';
import { organisationApi } from '../../../../modules/organisation/api/organisation-api';
import { ORG_OVERVIEW_KEYS, useCreateGrade, useDeleteGrade, useGrades } from '../../../../modules/organisation/hooks/use-org-overview';

const INPUT_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary focus:border-brand-blue-600 focus:outline-none';

export function GradesPageClient({ title, description }: { title: string; description: string }) {
  const t = useTranslations();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [descriptionText, setDescriptionText] = useState('');

  const grades = useGrades({ pageSize: 100 });
  const createGrade = useCreateGrade();
  const deleteGrade = useDeleteGrade();
  const qc = useQueryClient();
  const updateGrade = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      organisationApi.grades.update(id, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ORG_OVERVIEW_KEYS.all });
    },
  });

  async function create() {
    await createGrade.mutateAsync({ code, name, description: descriptionText || undefined });
    setCode('');
    setName('');
    setDescriptionText('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: t('tenant.nav.dashboard'), href: ROUTES.TENANT.DASHBOARD },
          { label: t('tenant.nav.organisation'), href: ROUTES.TENANT.ORGANISATION.ROOT },
          { label: title },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:grid-cols-3">
        <input className={INPUT_CLS} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input className={INPUT_CLS} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={INPUT_CLS} placeholder="Description" value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} />
        <div className="sm:col-span-3">
          <button type="button" onClick={() => void create()} disabled={createGrade.isPending || !code || !name} className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {createGrade.isPending ? t('common.loading') : 'Create grade'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-primary">
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-canvas">
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {(grades.data?.data ?? []).map((grade) => (
              <tr key={grade.id}>
                <td className="px-4 py-3">{grade.code}</td>
                <td className="px-4 py-3">{grade.name}</td>
                <td className="px-4 py-3">{grade.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void updateGrade.mutateAsync({ id: grade.id, status: grade.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} className="text-brand-blue-600 hover:underline">
                      {t('common.edit')}
                    </button>
                    <button type="button" onClick={() => void deleteGrade.mutateAsync(grade.id)} className="text-semantic-danger hover:underline">
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
