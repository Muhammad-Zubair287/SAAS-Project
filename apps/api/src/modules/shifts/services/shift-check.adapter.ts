import { Injectable } from '@nestjs/common';
import type {
  ResolvedWorkSchedule,
  ScheduleSource,
  ShiftCheckAdapter,
} from '../../attendance/interfaces/shift-check-adapter.interface';
import { ShiftScheduleResolverService } from './shift-schedule-resolver.service';

/**
 * M07 implementation of ShiftCheckAdapter.
 * Attendance depends only on the adapter abstraction.
 */
@Injectable()
export class ShiftCheckAdapterImpl implements ShiftCheckAdapter {
  constructor(private readonly resolver: ShiftScheduleResolverService) {}

  getWorkSchedule(
    tenantId: string,
    employeeId: string,
    workDate: Date,
  ): Promise<ResolvedWorkSchedule | null> {
    return this.resolver.getWorkSchedule(tenantId, employeeId, workDate);
  }

  resolveWorkDateForEvent(
    tenantId: string,
    employeeId: string,
    eventTime: Date,
  ): Promise<{ workDate: Date; resolved: ResolvedWorkSchedule | null }> {
    return this.resolver.resolveWorkDateForEvent(
      tenantId,
      employeeId,
      eventTime,
    );
  }

  rebuildFromProvenance(
    tenantId: string,
    workDate: Date,
    provenance: {
      scheduleSource: ScheduleSource;
      shiftAssignmentId?: string | null;
      rosterAssignmentId?: string | null;
      resolvedShiftId?: string | null;
      attendancePolicyId?: string | null;
    },
  ): Promise<ResolvedWorkSchedule> {
    return this.resolver.rebuildFromProvenance(tenantId, workDate, provenance);
  }
}
