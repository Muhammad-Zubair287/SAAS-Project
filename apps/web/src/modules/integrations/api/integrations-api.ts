import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type { IntegrationItem } from '../types/integrations.types';

export const integrationsApi = {
  list: () =>
    apiClient
      .get<ApiSuccessResponse<IntegrationItem[]>>('/integrations')
      .then((r) => r.data),
};
