import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import { PlatformCatalogueService } from '../services/platform-catalogue.service';
import {
  DeploymentRegionResponseDto,
  PlanResponseDto,
} from '../dto/plan-response.dto';

@ApiTags('Platform — Catalogue')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform')
export class PlatformCatalogueController {
  constructor(private readonly catalogue: PlatformCatalogueService) {}

  @Get('plans')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'List active commercial plans' })
  @ApiOkResponse({ type: [PlanResponseDto] })
  async listPlans(
    @Query('includeEntitlements') includeEntitlements?: string,
  ): Promise<PlanResponseDto[]> {
    return this.catalogue.listPlans(includeEntitlements === 'true');
  }

  @Get('deployment-regions')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'List active deployment regions' })
  @ApiOkResponse({ type: [DeploymentRegionResponseDto] })
  async listRegions(): Promise<DeploymentRegionResponseDto[]> {
    return this.catalogue.listDeploymentRegions();
  }
}
