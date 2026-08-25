import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import { PlatformCatalogueManageService } from '../services/platform-catalogue-manage.service';
import { PlatformUsageDashboardService } from '../services/platform-usage-dashboard.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';
import { PlanResponseDto } from '../dto/plan-response.dto';

class CreatePlanBody {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(100) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() billingModel?: string;
  @IsOptional() @IsString() status?: string;
}

class UpdatePlanBody {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() billingModel?: string;
  @IsOptional() @IsString() status?: string;
}

class PlanEntitlementItem {
  @IsUUID() entitlementId!: string;
  defaultValue!: unknown;
}

class SetPlanEntitlementsBody {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementItem)
  items!: PlanEntitlementItem[];
}

class CreateEntitlementBody {
  @IsString() @MaxLength(80) code!: string;
  @IsString() @MaxLength(120) label!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() dataType!: string;
  defaultValue!: unknown;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() status?: string;
}

class CreateRegionBody {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(100) name!: string;
  @IsString() cloudProvider!: string;
  @IsString() cloudRegion!: string;
  @IsString() @MaxLength(2) countryCode!: string;
  @IsOptional() @IsString() status?: string;
}

class UpdateRegionBody {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() cloudProvider?: string;
  @IsOptional() @IsString() cloudRegion?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() status?: string;
}

@ApiTags('Platform — Catalogue Admin')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform')
export class PlatformCatalogueAdminController {
  constructor(
    private readonly manage: PlatformCatalogueManageService,
    private readonly usageDashboard: PlatformUsageDashboardService,
  ) {}

  @Post('plans')
  @RequirePermissions(PLATFORM_PERMISSIONS.PLAN_MANAGE)
  @ApiOperation({ summary: 'Create commercial plan' })
  @ApiOkResponse({ type: PlanResponseDto })
  createPlan(
    @Body() dto: CreatePlanBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.manage.createPlan(dto, actor, correlationId);
  }

  @Patch('plans/:planId')
  @RequirePermissions(PLATFORM_PERMISSIONS.PLAN_MANAGE)
  updatePlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: UpdatePlanBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.manage.updatePlan(planId, dto, actor, correlationId);
  }

  @Put('plans/:planId/entitlements')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.PLAN_MANAGE)
  setPlanEntitlements(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: SetPlanEntitlementsBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.manage.setPlanEntitlements(planId, dto.items, actor, correlationId);
  }

  @Get('entitlements')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  listEntitlements() {
    return this.manage.listEntitlements();
  }

  @Post('entitlements')
  @RequirePermissions(PLATFORM_PERMISSIONS.ENTITLEMENT_CATALOGUE)
  createEntitlement(
    @Body() dto: CreateEntitlementBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.manage.createEntitlement(dto, actor, correlationId);
  }

  @Post('deployment-regions')
  @RequirePermissions(PLATFORM_PERMISSIONS.REGION_MANAGE)
  createRegion(
    @Body() dto: CreateRegionBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.manage.createRegion(dto, actor, correlationId);
  }

  @Patch('deployment-regions/:regionId')
  @RequirePermissions(PLATFORM_PERMISSIONS.REGION_MANAGE)
  updateRegion(
    @Param('regionId', ParseUUIDPipe) regionId: string,
    @Body() dto: UpdateRegionBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.manage.updateRegion(regionId, dto, actor, correlationId);
  }

  @Get('usage/dashboard')
  @RequirePermissions(PLATFORM_PERMISSIONS.USAGE_READ)
  @ApiOperation({ summary: 'Platform usage dashboard KPIs and series' })
  usageDashboardEndpoint(@Query('rangeDays') rangeDays?: string) {
    const days = rangeDays ? Number(rangeDays) : 30;
    return this.usageDashboard.getDashboard(Number.isFinite(days) ? days : 30);
  }
}
