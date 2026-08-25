'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useCommitEmployeeImport,
  useEmployeeImportJob,
  useStartEmployeeImport,
} from '../../../../modules/employee/hooks/use-employees';

const SAMPLE_ROWS = JSON.stringify(
  [
    {
      firstName: 'Ayesha',
      lastName: 'Khan',
      emailWork: 'ayesha.khan@company.com',
      legalEntityId: '00000000-0000-0000-0000-000000000000',
      hireDate: '2026-01-01',
      employmentType: 'FULL_TIME',
    },
  ],
  null,
  2,
);

export function ImportPageClient() {
  const t = useTranslations();
  const startImport = useStartEmployeeImport();
  const [rowsJson, setRowsJson] = useState(SAMPLE_ROWS);
  const [importId, setImportId] = useState<string | undefined>();
  const [parseError, setParseError] = useState<string | null>(null);
  const importJob = useEmployeeImportJob(importId);
  const commitImport = useCommitEmployeeImport(importId);

  const rows = useMemo(() => {
    try {
      setParseError(null);
      const parsed = JSON.parse(rowsJson) as unknown;
      return Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [];
    } catch {
      setParseError('Invalid JSON');
      return [];
    }
  }, [rowsJson]);

  async function startValidation() {
    if (parseError || rows.length === 0) return;
    const result = await startImport.mutateAsync({ rows });
    setImportId(result.data.id);
  }

  async function commit() {
    await commitImport.mutateAsync();
  }

  return (
    <div className="space-y-4">
      <textarea
        value={rowsJson}
        onChange={(e) => setRowsJson(e.target.value)}
        className="min-h-[280px] w-full rounded-md border border-border-default bg-surface-primary p-3 font-mono text-body-sm"
      />
      {parseError && <p className="text-semantic-danger">{parseError}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void startValidation()} disabled={startImport.isPending || Boolean(parseError) || rows.length === 0} className="rounded-md bg-brand-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {startImport.isPending ? t('common.loading') : t('employees.import.validate')}
        </button>
        {importJob.data?.data.status === 'VALIDATED' && (
          <button type="button" onClick={() => void commit()} disabled={commitImport.isPending} className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-text-primary">
            {commitImport.isPending ? t('common.loading') : t('employees.import.commit')}
          </button>
        )}
      </div>

      {importJob.data?.data && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-4">
          <p className="text-body-sm">{t('employees.import.status')}: <span className="font-semibold">{importJob.data.data.status}</span></p>
          <p className="text-body-sm">{t('employees.import.counts', { valid: importJob.data.data.validRows, warning: importJob.data.data.warningRows, error: importJob.data.data.errorRows })}</p>
          <div className="mt-3 space-y-2">
            {(importJob.data.data.rows ?? []).slice(0, 20).map((row) => (
              <div key={row.id} className="rounded-md border border-border-default p-2 text-body-sm">
                #{row.rowNumber} - {row.status}
                {row.errors && row.errors.length > 0 && <p className="text-semantic-danger">{row.errors.join(', ')}</p>}
                {row.warnings && row.warnings.length > 0 && <p className="text-semantic-warning">{row.warnings.join(', ')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
