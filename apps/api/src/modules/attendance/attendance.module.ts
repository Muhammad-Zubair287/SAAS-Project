import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { EmployeeModule } from '../employee/employee.module';
import { AuditEventRepository } from '../platform/repositories/audit-event.repository';
import { AttendanceRawEventRepository } from './repositories/attendance-raw-event.repository';
import { AttendanceRecordRepository } from './repositories/attendance-record.repository';
import { AttendanceExceptionRepository } from './repositories/attendance-exception.repository';
import { AttendancePolicyRepository } from './repositories/attendance-policy.repository';
import { AttendanceCalculatorService } from './services/attendance-calculator.service';
import { AttendanceEventService } from './services/attendance-event.service';
import { AttendanceRecordService } from './services/attendance-record.service';
import { AttendanceExceptionService } from './services/attendance-exception.service';
import { AttendancePolicyService } from './services/attendance-policy.service';
import { AttendanceEventController } from './controllers/attendance-event.controller';
import { AttendanceRecordController } from './controllers/attendance-record.controller';
import { AttendanceExceptionController } from './controllers/attendance-exception.controller';
import { AttendancePolicyController } from './controllers/attendance-policy.controller';

@Module({
  imports: [PrismaModule, AuthenticationModule, EmployeeModule],
  controllers: [
    AttendanceEventController,
    AttendanceRecordController,
    AttendanceExceptionController,
    AttendancePolicyController,
  ],
  providers: [
    AuditEventRepository,
    AttendanceRawEventRepository,
    AttendanceRecordRepository,
    AttendanceExceptionRepository,
    AttendancePolicyRepository,
    AttendanceCalculatorService,
    AttendanceEventService,
    AttendanceRecordService,
    AttendanceExceptionService,
    AttendancePolicyService,
  ],
  exports: [AttendancePolicyService],
})
export class AttendanceModule {}
