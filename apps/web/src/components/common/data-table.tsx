'use client';

import type { ReactNode } from 'react';
import { LoadingSpinner } from '../feedback/loading-spinner';
import { EmptyState } from '../feedback/empty-state';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  compact?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyTitle = 'No records found',
  emptyDescription,
  keyExtractor,
  onRowClick,
  compact = false,
}: DataTableProps<T>) {
  const rowHeight = compact ? 'h-11' : 'h-13';

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-border-default bg-surface-primary">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-primary">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-surface-primary">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-default bg-surface-canvas">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-label-md font-semibold text-text-secondary"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={`${rowHeight} transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-surface-canvas'
                    : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-body-md text-text-primary"
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
