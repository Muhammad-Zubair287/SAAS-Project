'use client';

import { useEffect, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  required?: boolean;
  onSearchChange?: (search: string) => void;
}

const BTN_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-left flex items-center justify-between focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 transition-colors';

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  isLoading = false,
  disabled = false,
  required = false,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const displayed =
    onSearchChange
      ? options
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            (o.sublabel?.toLowerCase().includes(search.toLowerCase()) ?? false),
        );

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
        onSearchChange?.('');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onSearchChange]);

  function handleSearchChange(val: string) {
    setSearch(val);
    onSearchChange?.(val);
  }

  function handleSelect(option: SelectOption | undefined) {
    onChange(option?.value);
    setOpen(false);
    setSearch('');
    onSearchChange?.('');
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled || isLoading}
        className={`${BTN_CLS} ${disabled || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-border-strong'}`}
        onClick={() => !disabled && !isLoading && setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-text-primary' : 'text-text-secondary'}>
          {isLoading ? 'Loading…' : (selected?.label ?? placeholder)}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border-default bg-surface-primary shadow-elevation-2">
          <div className="border-b border-border-default p-2">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-border-default bg-surface-canvas px-2 py-1.5 text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
            />
          </div>
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {!required && (
              <li
                role="option"
                aria-selected={value === undefined}
                onClick={() => handleSelect(undefined)}
                className="cursor-pointer px-3 py-2 text-body-md text-text-secondary hover:bg-surface-canvas"
              >
                — None —
              </li>
            )}
            {displayed.length === 0 ? (
              <li className="px-3 py-4 text-center text-body-md text-text-secondary">
                No results found
              </li>
            ) : (
              displayed.map((o) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => handleSelect(o)}
                  className={`cursor-pointer px-3 py-2 text-body-md hover:bg-surface-canvas ${
                    o.value === value
                      ? 'bg-brand-blue-600/5 font-medium text-brand-blue-600'
                      : 'text-text-primary'
                  }`}
                >
                  {o.label}
                  {o.sublabel && (
                    <span className="mt-0.5 block text-body-sm text-text-secondary">
                      {o.sublabel}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
