import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type { ApprovalInboxResponse } from '../types/approvals.types';

export const approvalsApi = {
  inbox: () =>
    apiClient
      .get<ApiSuccessResponse<ApprovalInboxResponse>>('/approvals/inbox')
      .then((r) => r.data),
};
