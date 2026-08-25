import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  CreateShiftPayload,
  ListShiftsParams,
  Shift,
  UpdateShiftPayload,
} from '../types/shift.types';

const BASE = '/shifts';

export const shiftsApi = {
  list(params?: ListShiftsParams) {
    return apiClient
      .get<ApiSuccessResponse<Shift[]>>(BASE, { params })
      .then((r) => r.data);
  },

  getById(shiftId: string) {
    return apiClient
      .get<ApiSuccessResponse<Shift>>(`${BASE}/${shiftId}`)
      .then((r) => r.data);
  },

  create(payload: CreateShiftPayload) {
    return apiClient
      .post<ApiSuccessResponse<Shift>>(BASE, payload)
      .then((r) => r.data);
  },

  update(shiftId: string, payload: UpdateShiftPayload, ifMatch: string) {
    return apiClient
      .patch<ApiSuccessResponse<Shift>>(`${BASE}/${shiftId}`, payload, {
        headers: { 'If-Match': `"${ifMatch}"` },
      })
      .then((r) => r.data);
  },
};
