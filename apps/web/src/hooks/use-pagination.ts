'use client';

import { useCallback, useState } from 'react';
import { APP_CONSTANTS } from '../constants/app.constants';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const [page, setPage] = useState(options.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(
    options.initialPageSize ?? APP_CONSTANTS.DEFAULT_PAGE_SIZE,
  );

  const goToPage = useCallback(
    (newPage: number) => setPage(Math.max(1, newPage)),
    [],
  );

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const previousPage = useCallback(
    () => setPage((p) => Math.max(1, p - 1)),
    [],
  );

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(
      Math.min(APP_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, newSize)),
    );
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setPage(1);
    setPageSize(
      options.initialPageSize ?? APP_CONSTANTS.DEFAULT_PAGE_SIZE,
    );
  }, [options.initialPageSize]);

  return { page, pageSize, goToPage, nextPage, previousPage, changePageSize, reset };
}
