'use client';

import { useState } from 'react';
import { useEmployees } from '../hooks/use-employees';
import { useDebounce } from '../../../hooks/use-debounce';
import { SearchableSelect, type SelectOption } from '../../../components/common/searchable-select';

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ManagerSelect({
  value,
  onChange,
  excludeId,
  placeholder = 'Search by name or email…',
  disabled,
}: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useEmployees({
    search: debouncedSearch || undefined,
    pageSize: 50,
  });

  const options: SelectOption[] = (data?.data ?? [])
    .filter((e) => e.id !== excludeId)
    .map((e) => ({
      value: e.id,
      label: e.displayName,
      sublabel: `${e.employeeNumber} · ${e.emailWork}`,
    }));

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      isLoading={isLoading && !debouncedSearch}
      disabled={disabled}
      onSearchChange={setSearch}
      searchPlaceholder="Search by name or email…"
    />
  );
}
