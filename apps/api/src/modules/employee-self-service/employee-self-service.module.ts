import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { EmployeeModule } from '../employee/employee.module';
import { EssMeController } from './controllers/ess-me.controller';
import { EssChangeRequestController } from './controllers/ess-change-request.controller';
import { LeaveRequestsController } from './controllers/leave-requests.controller';
import { PayslipsController } from './controllers/payslips.controller';
import { EssContextService } from './services/ess-context.service';
import { EssDashboardService } from './services/ess-dashboard.service';
import { EssProfileService } from './services/ess-profile.service';
import { EssAttendanceService } from './services/ess-attendance.service';
import { EssDocumentsService } from './services/ess-documents.service';
import { EssRequestsService } from './services/ess-requests.service';
import { EssNotificationsService } from './services/ess-notifications.service';
import { EssRosterService } from './services/ess-roster.service';
import { EssLeaveService } from './services/ess-leave.service';
import { EssPayslipService } from './services/ess-payslip.service';

@Module({
  imports: [PrismaModule, AuthenticationModule, AttendanceModule, EmployeeModule],
  controllers: [EssMeController, EssChangeRequestController, LeaveRequestsController, PayslipsController],
  providers: [
    EssContextService,
    EssDashboardService,
    EssProfileService,
    EssAttendanceService,
    EssDocumentsService,
    EssRequestsService,
    EssNotificationsService,
    EssRosterService,
    EssLeaveService,
    EssPayslipService,
  ],
  exports: [EssContextService, EssLeaveService],
})
export class EmployeeSelfServiceModule {}
