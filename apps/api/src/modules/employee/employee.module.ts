import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AuditEventRepository } from '../platform/repositories/audit-event.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { PersonalDetailRepository } from './repositories/personal-detail.repository';
import { EmployeeService } from './services/employee.service';
import { EmployeeNumberGenerator } from './services/employee-number-generator.service';
import { PersonalDetailService } from './services/personal-detail.service';
import { EmployeeController } from './controllers/employee.controller';
import { PersonalDetailController } from './controllers/personal-detail.controller';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [EmployeeController, PersonalDetailController],
  providers: [
    AuditEventRepository,
    EmployeeRepository,
    PersonalDetailRepository,
    EmployeeNumberGenerator,
    EmployeeService,
    PersonalDetailService,
  ],
  exports: [EmployeeRepository, EmployeeService],
})
export class EmployeeModule {}
