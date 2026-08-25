'use client';

import { useQuery } from '@tanstack/react-query';
import { hrApi } from '../api/hr-api';

export const HR_KEYS = {
  all: ['hr'] as const,
  dashboard: () => [...HR_KEYS.all, 'dashboard'] as const,
};

export function useHrDashboard() {
  return useQuery({
    queryKey: HR_KEYS.dashboard(),
    queryFn: () => hrApi.dashboard.get(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
