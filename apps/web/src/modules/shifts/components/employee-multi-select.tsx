'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SearchableSelect } from '../../../components/common/searchable-select';
import { useDebounce } from '../../../hooks/use-debounce';
import { useEmployees } from '../../employee/hooks/use-employees';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function EmployeeMultiSelect({ value, onChange, disabled }: Props) {
  const t = useTranslations('shifts.assign');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data, isLoading } = useEmployees({
    search: debounced || undefined,
    pageSize: 50,
  });

  const options = useMemo(
    () =>
      (data?.data ?? [])
        .filter((e) => !value.includes(e.id))
        .map((e) => ({
          value: e.id,
          label: e.displayName,
          sublabel: `${e.employeeNumber} · ${e.emailWork}`,
        })),
    [data?.data, value],
  );

  const selectedLabels = useMemo(() => {
    const map = new Map(
      (data?.data ?? []).map((e) => [
        e.id,
        `${e.displayName} (${e.employeeNumber})`,
      ]),
    );
    return value.map((id) => ({ id, label: map.get(id) ?? id }));
  }, [data?.data, value]);

  return (
    <div className="space-y-3">
      <SearchableSelect
        value={undefined}
        onChange={(id) => {
          if (id && !value.includes(id)) onChange([...value, id]);
        }}
        options={options}
        placeholder={t('employeeSearch')}
        isLoading={isLoading && !debounced}
        disabled={disabled}
        onSearchChange={setSearch}
        searchPlaceholder={t('employeeSearch')}
      />
      {selectedLabels.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('selectedEmployees')}>
          {selectedLabels.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-default bg-surface-canvas px-3 py-1.5 text-body-sm"
                onClick={() => onChange(value.filter((v) => v !== item.id))}
                disabled={disabled}
              >
                <span>{item.label}</span>
                <span aria-hidden="true">×</span>
                <span className="sr-only">{t('removeEmployee')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
