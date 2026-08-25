import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { SHIFT_CHECK_ADAPTER } from '../attendance/interfaces/shift-check-adapter.interface';
import { ShiftController } from './controllers/shift.controller';
import { ShiftAssignmentController } from './controllers/shift-assignment.controller';
import { RosterController } from './controllers/roster.controller';
import { RosterAssignmentController } from './controllers/roster-assignment.controller';
import { ShiftRepository } from './repositories/shift.repository';
import { ShiftAssignmentRepository } from './repositories/shift-assignment.repository';
import { RosterAssignmentRepository } from './repositories/roster-assignment.repository';
import { ShiftService } from './services/shift.service';
import { ShiftAssignmentService } from './services/shift-assignment.service';
import { RosterService } from './services/roster.service';
import { ShiftScheduleResolverService } from './services/shift-schedule-resolver.service';
import { ShiftCheckAdapterImpl } from './services/shift-check.adapter';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [
    ShiftController,
    ShiftAssignmentController,
    RosterController,
    RosterAssignmentController,
  ],
  providers: [
    ShiftRepository,
    ShiftService,
    ShiftAssignmentRepository,
    ShiftAssignmentService,
    RosterAssignmentRepository,
    RosterService,
    ShiftScheduleResolverService,
    ShiftCheckAdapterImpl,
    {
      provide: SHIFT_CHECK_ADAPTER,
      useExisting: ShiftCheckAdapterImpl,
    },
  ],
  exports: [
    ShiftService,
    ShiftAssignmentService,
    RosterService,
    SHIFT_CHECK_ADAPTER,
    ShiftScheduleResolverService,
  ],
})
export class ShiftsModule {}
