import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { EmployeeSelfServiceModule } from '../employee-self-service/employee-self-service.module';
import { LeaveAdminController } from './controllers/leave-admin.controller';
import { LeaveAdminService } from './services/leave-admin.service';

@Module({
  imports: [PrismaModule, AuthenticationModule, EmployeeSelfServiceModule],
  controllers: [LeaveAdminController],
  providers: [LeaveAdminService],
  exports: [LeaveAdminService],
})
export class LeaveModule {}
