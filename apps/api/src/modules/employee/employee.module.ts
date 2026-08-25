import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AuditEventRepository } from '../platform/repositories/audit-event.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { PersonalDetailRepository } from './repositories/personal-detail.repository';
import { EmployeeService } from './services/employee.service';
import { EmployeeNumberGenerator } from './services/employee-number-generator.service';
import { PersonalDetailService } from './services/personal-detail.service';
import { EmployeeLifecycleService } from './services/employee-lifecycle.service';
import { HrDashboardService } from './services/hr-dashboard.service';
import { EmployeeController } from './controllers/employee.controller';
import { PersonalDetailController } from './controllers/personal-detail.controller';
import { EmployeeLifecycleController } from './controllers/employee-lifecycle.controller';
import { HrDashboardController } from './controllers/hr-dashboard.controller';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [
    HrDashboardController,
    EmployeeLifecycleController,
    EmployeeController,
    PersonalDetailController,
  ],
  providers: [
    AuditEventRepository,
    EmployeeRepository,
    PersonalDetailRepository,
    EmployeeNumberGenerator,
    EmployeeService,
    PersonalDetailService,
    EmployeeLifecycleService,
    HrDashboardService,
  ],
  exports: [EmployeeRepository, EmployeeService, EmployeeLifecycleService],
})
export class EmployeeModule {}
