import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { TenantRepository } from './repositories/tenant.repository';
import { PlanRepository } from './repositories/plan.repository';
import { SupportGrantRepository } from './repositories/support-grant.repository';
import { AuditEventRepository } from './repositories/audit-event.repository';
import { TenantService } from './services/tenant.service';
import { PlanService } from './services/plan.service';
import { SupportGrantService } from './services/support-grant.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { PlatformTenantsController } from './controllers/platform-tenants.controller';
import { PlatformSupportGrantsController } from './controllers/platform-support-grants.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformTenantsController, PlatformSupportGrantsController],
  providers: [
    TenantRepository,
    PlanRepository,
    SupportGrantRepository,
    AuditEventRepository,
    TenantService,
    PlanService,
    SupportGrantService,
    PlatformAuditService,
  ],
  exports: [TenantService, PlanService, PlatformAuditService],
})
export class PlatformModule {}
