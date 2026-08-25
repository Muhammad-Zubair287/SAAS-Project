import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { PayrollAdminController } from './controllers/payroll-admin.controller';
import { PayrollAdminService } from './services/payroll-admin.service';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [PayrollAdminController],
  providers: [PayrollAdminService],
  exports: [PayrollAdminService],
})
export class PayrollModule {}
