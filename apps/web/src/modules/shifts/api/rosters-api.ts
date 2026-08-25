import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  CreateRosterAssignmentPayload,
  ListRostersParams,
  PublishRosterPayload,
  RosterAssignment,
  RosterBulkResult,
  RosterPublishResult,
  UpdateRosterAssignmentPayload,
} from '../types/roster.types';

const BASE = '/rosters';
const ASSIGNMENTS = '/roster-assignments';

function listParams(params: ListRostersParams): Record<string, unknown> {
  const { employeeIds, ...rest } = params;
  return {
    ...rest,
    ...(employeeIds?.length ? { employeeIds: employeeIds.join(',') } : {}),
  };
}

export const rostersApi = {
  list(params: ListRostersParams) {
    return apiClient
      .get<ApiSuccessResponse<RosterAssignment[]>>(BASE, {
        params: listParams(params),
      })
      .then((r) => r.data);
  },

  getById(assignmentId: string) {
    return apiClient
      .get<ApiSuccessResponse<RosterAssignment>>(
        `${ASSIGNMENTS}/${assignmentId}`,
      )
      .then((r) => r.data);
  },

  create(payload: CreateRosterAssignmentPayload) {
    return apiClient
      .post<ApiSuccessResponse<RosterBulkResult>>(ASSIGNMENTS, payload)
      .then((r) => r.data);
  },

  update(
    assignmentId: string,
    payload: UpdateRosterAssignmentPayload,
    ifMatch: string,
  ) {
    return apiClient
      .patch<ApiSuccessResponse<RosterAssignment>>(
        `${ASSIGNMENTS}/${assignmentId}`,
        payload,
        { headers: { 'If-Match': `"${ifMatch}"` } },
      )
      .then((r) => r.data);
  },

  publish(payload: PublishRosterPayload) {
    return apiClient
      .post<ApiSuccessResponse<RosterPublishResult>>(`${BASE}/publish`, payload)
      .then((r) => r.data);
  },
};
