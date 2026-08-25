import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { TenantAdminController } from './controllers/tenant-admin.controller';
import { TenantAdminRepository } from './repositories/tenant-admin.repository';
import { TenantAdminService } from './services/tenant-admin.service';

@Module({
  imports: [PrismaModule, AuthenticationModule, ConfigModule],
  controllers: [TenantAdminController],
  providers: [TenantAdminRepository, TenantAdminService],
  exports: [TenantAdminService, TenantAdminRepository],
})
export class TenantModule {}
