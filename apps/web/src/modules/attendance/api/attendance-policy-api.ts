import { apiClient } from '@/lib/api-client';
import type {
  AttendancePolicy,
  CreateAttendancePolicyPayload,
  UpdateAttendancePolicyPayload,
  ListAttendancePoliciesParams,
} from '../types/attendance-policy.types';

export const attendancePolicyApi = {
  list: (params?: ListAttendancePoliciesParams) =>
    apiClient.get<AttendancePolicy[]>('/attendance/policies', { params }),

  getById: (id: string) =>
    apiClient.get<AttendancePolicy>(`/attendance/policies/${id}`),

  create: (payload: CreateAttendancePolicyPayload) =>
    apiClient.post<AttendancePolicy>('/attendance/policies', payload),

  update: (id: string, payload: UpdateAttendancePolicyPayload) =>
    apiClient.patch<AttendancePolicy>(`/attendance/policies/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/attendance/policies/${id}`),
};
