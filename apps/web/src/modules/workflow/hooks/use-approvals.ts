'use client';

import { useQuery } from '@tanstack/react-query';
import { approvalsApi } from '../api/approvals-api';

export const APPROVALS_KEYS = {
  all: ['approvals'] as const,
  inbox: () => [...APPROVALS_KEYS.all, 'inbox'] as const,
};

export function useApprovalsInbox() {
  return useQuery({
    queryKey: APPROVALS_KEYS.inbox(),
    queryFn: () => approvalsApi.inbox(),
  });
}
