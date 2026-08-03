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
  /**
   * When the query failed. Without this a failed request falls through to the
   * empty state and reads as "no results", which is a different fact entirely.
   */
  isError?: boolean;
  errorTitle?: string;
  errorDescription?: string;
  retryLabel?: string;
  onRetry?: () => void;
  /**
   * Accessible name for the table, rendered as a visually hidden <caption>.
   * Without it screen readers announce an unnamed table.
   */
  caption?: string;
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
  caption,
  isError,
  errorTitle = 'Could not load data',
  errorDescription,
  retryLabel = 'Try again',
  onRetry,
}: DataTableProps<T>) {
  const rowHeight = compact ? 'h-11' : 'h-13';

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-border-default bg-surface-primary">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  // Checked before the empty case — an error is not an empty result.
  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-semantic-danger/30 bg-surface-primary"
      >
        <EmptyState
          title={errorTitle}
          description={errorDescription}
          action={
            onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white transition-colors hover:bg-brand-blue-500"
              >
                {retryLabel}
              </button>
            ) : undefined
          }
        />
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
        {/*
          min-width keeps columns at a readable size and lets the scroller do
          its job. Without it `w-full` crushes 5-6 columns into a phone width,
          which is unreadable rather than merely scrollable. Scales with column
          count so narrow tables do not scroll unnecessarily.
        */}
        <table
          className="w-full border-collapse text-left"
          style={{ minWidth: `${Math.min(columns.length * 140, 900)}px` }}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border-default bg-surface-canvas">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
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
                    ? 'cursor-pointer hover:bg-surface-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue-600'
                    : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                // Rows carrying onClick must be reachable and operable by
                // keyboard, otherwise every detail page is unreachable without
                // a mouse (WCAG 2.1.1). This is a stopgap: the correct fix is a
                // real <Link> in the first cell, which lands with DataTable v2.
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          // Space would otherwise scroll the page.
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
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
