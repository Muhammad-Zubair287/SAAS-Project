import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type { HrDashboardResponse } from '../types/hr.types';

export const hrApi = {
  dashboard: {
    get: () =>
      apiClient
        .get<ApiSuccessResponse<HrDashboardResponse>>('/hr/dashboard')
        .then((r) => r.data),
  },
};
