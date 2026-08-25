import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '../api/shifts-api';
import { SHIFT_KEYS } from '../constants/shift.constants';
import type {
  CreateShiftPayload,
  ListShiftsParams,
  UpdateShiftPayload,
} from '../types/shift.types';

export function useShifts(params?: ListShiftsParams) {
  return useQuery({
    queryKey: SHIFT_KEYS.list(params),
    queryFn: () => shiftsApi.list(params),
    staleTime: 30_000,
  });
}

export function useShift(shiftId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SHIFT_KEYS.detail(shiftId),
    queryFn: () => shiftsApi.getById(shiftId),
    enabled: options?.enabled ?? !!shiftId,
    staleTime: 30_000,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShiftPayload) => shiftsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SHIFT_KEYS.lists() });
    },
  });
}

export function useUpdateShift(shiftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: UpdateShiftPayload;
      ifMatch: string;
    }) => shiftsApi.update(shiftId, payload, ifMatch),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: SHIFT_KEYS.lists() });
      void queryClient.invalidateQueries({
        queryKey: SHIFT_KEYS.detail(shiftId),
      });
      if (res.data?.id && res.data.id !== shiftId) {
        void queryClient.invalidateQueries({
          queryKey: SHIFT_KEYS.detail(res.data.id),
        });
      }
    },
  });
}
