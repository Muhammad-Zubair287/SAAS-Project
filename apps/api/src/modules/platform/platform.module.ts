import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { PlatformAuthenticationGuard } from '../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../common/guards/platform-role.guard';
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
import { PlatformCatalogueController } from './controllers/platform-catalogue.controller';
import { PlatformAuditController } from './controllers/platform-audit.controller';
import { PlatformCatalogueService } from './services/platform-catalogue.service';
import { PlatformAuditQueryService } from './services/platform-audit-query.service';
import { PlatformSettingsService } from './services/platform-settings.service';
import { PlatformCatalogueManageService } from './services/platform-catalogue-manage.service';
import { PlatformUsageDashboardService } from './services/platform-usage-dashboard.service';
import { PlatformNotificationsService } from './services/platform-notifications.service';
import { PlatformSearchService } from './services/platform-search.service';
import { PlatformIntegrationHealthService } from './services/platform-integration-health.service';
import { PlatformJobsScheduler } from './jobs/platform-jobs.scheduler';
import { PlatformConfigController } from './controllers/platform-config.controller';
import { PlatformCatalogueAdminController } from './controllers/platform-catalogue-admin.controller';
import { PlatformOpsController } from './controllers/platform-ops.controller';
import { PlatformIntegrationHealthController } from './controllers/platform-integration-health.controller';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [
    PlatformTenantsController,
    PlatformSupportGrantsController,
    PlatformCatalogueController,
    PlatformCatalogueAdminController,
    PlatformAuditController,
    PlatformConfigController,
    PlatformOpsController,
    PlatformIntegrationHealthController,
  ],
  providers: [
    TenantRepository,
    PlanRepository,
    SupportGrantRepository,
    AuditEventRepository,
    TenantService,
    PlanService,
    SupportGrantService,
    PlatformAuditService,
    PlatformCatalogueService,
    PlatformAuditQueryService,
    PlatformSettingsService,
    PlatformCatalogueManageService,
    PlatformUsageDashboardService,
    PlatformNotificationsService,
    PlatformSearchService,
    PlatformIntegrationHealthService,
    PlatformJobsScheduler,
    PlatformAuthenticationGuard,
    PlatformRoleGuard,
  ],
  exports: [TenantService, PlanService, PlatformAuditService, PlatformSettingsService],
})
export class PlatformModule {}
