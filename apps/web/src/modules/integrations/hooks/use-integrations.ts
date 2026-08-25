'use client';

import { useQuery } from '@tanstack/react-query';
import { integrationsApi } from '../api/integrations-api';

export const INTEGRATIONS_KEYS = {
  all: ['integrations'] as const,
  list: () => [...INTEGRATIONS_KEYS.all, 'list'] as const,
};

export function useIntegrations() {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.list(),
    queryFn: () => integrationsApi.list(),
    retry: false,
  });
}
