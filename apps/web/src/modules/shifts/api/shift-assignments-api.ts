import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  CreateShiftAssignmentPayload,
  ListShiftAssignmentsParams,
  ShiftAssignment,
  ShiftAssignmentBulkResult,
  UpdateShiftAssignmentPayload,
} from '../types/shift-assignment.types';

const BASE = '/shift-assignments';

export const shiftAssignmentsApi = {
  list(params?: ListShiftAssignmentsParams) {
    return apiClient
      .get<ApiSuccessResponse<ShiftAssignment[]>>(BASE, { params })
      .then((r) => r.data);
  },

  getById(assignmentId: string) {
    return apiClient
      .get<ApiSuccessResponse<ShiftAssignment>>(`${BASE}/${assignmentId}`)
      .then((r) => r.data);
  },

  assign(payload: CreateShiftAssignmentPayload) {
    return apiClient
      .post<ApiSuccessResponse<ShiftAssignmentBulkResult>>(BASE, payload)
      .then((r) => r.data);
  },

  update(
    assignmentId: string,
    payload: UpdateShiftAssignmentPayload,
    ifMatch: string,
  ) {
    return apiClient
      .patch<ApiSuccessResponse<ShiftAssignment>>(
        `${BASE}/${assignmentId}`,
        payload,
        { headers: { 'If-Match': `"${ifMatch}"` } },
      )
      .then((r) => r.data);
  },
};
