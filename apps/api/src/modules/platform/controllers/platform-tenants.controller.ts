import {
  Body,
  Controller,
  Get,
  Headers,
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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { ListTenantsDto } from '../dto/list-tenants.dto';
import { SuspendTenantDto, RestoreTenantDto } from '../dto/suspend-tenant.dto';
import { ChangePlanDto } from '../dto/change-plan.dto';
import { UpdateEntitlementsDto } from '../dto/update-entitlements.dto';
import { TenantResponseDto, TenantUsageDto } from '../dto/tenant-response.dto';
import { PlatformUsageSummaryDto } from '../dto/plan-response.dto';

@ApiTags('Platform — Tenants')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_CREATE)
  @ApiOperation({ summary: 'API-TEN-001 — Create tenant (DRAFT state)' })
  @ApiCreatedResponse({ type: TenantResponseDto })
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.create(dto, actor, correlationId);
  }

  @Get()
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'List tenants with filtering and pagination' })
  @ApiOkResponse({ description: 'Paginated tenant list' })
  async findMany(
    @Query() query: ListTenantsDto,
    @CurrentUser() _actor: PlatformActorContext,
  ) {
    return this.tenantService.findMany(query);
  }

  @Get('stats')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'Platform dashboard statistics' })
  @ApiOkResponse({ description: 'Tenant status counts' })
  async getDashboardStats(@CurrentUser() _actor: PlatformActorContext) {
    return this.tenantService.getDashboardStats();
  }

  @Get('validate/slug')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_CREATE)
  @ApiOperation({ summary: 'Validate tenant slug availability' })
  async validateSlug(@Query('slug') slug: string) {
    return this.tenantService.validateSlug(slug ?? '');
  }

  @Get('validate/email')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_CREATE)
  @ApiOperation({ summary: 'Validate primary admin email availability' })
  async validateAdminEmail(@Query('email') email: string) {
    return this.tenantService.validateAdminEmail(email ?? '');
  }

  @Get('usage/summary')
  @RequirePermissions(PLATFORM_PERMISSIONS.USAGE_READ)
  @ApiOperation({ summary: 'Platform-wide seat usage summary' })
  @ApiOkResponse({ type: PlatformUsageSummaryDto })
  async getPlatformUsageSummary(@CurrentUser() _actor: PlatformActorContext): Promise<PlatformUsageSummaryDto> {
    return this.tenantService.getPlatformUsageSummary();
  }

  @Get(':tenantId')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiOkResponse({ type: TenantResponseDto })
  async findById(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.findById(tenantId);
  }

  @Patch(':tenantId')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_UPDATE)
  @ApiOperation({ summary: 'Update tenant metadata (ETag optimistic concurrency)' })
  @ApiOkResponse({ type: TenantResponseDto })
  async update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.update(tenantId, dto, actor, correlationId, ifMatch);
  }

  @Post(':tenantId/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_ACTIVATE)
  @ApiOperation({ summary: 'Activate a DRAFT or previously suspended tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  async activate(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.activate(tenantId, actor, correlationId);
  }

  @Post(':tenantId/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_SUSPEND)
  @ApiOperation({ summary: 'Suspend tenant (MFA required in production)' })
  @ApiOkResponse({ type: TenantResponseDto })
  async suspend(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: SuspendTenantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.suspend(tenantId, dto, actor, correlationId);
  }

  @Post(':tenantId/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_RESTORE)
  @ApiOperation({ summary: 'Restore a suspended tenant (MFA required in production)' })
  @ApiOkResponse({ type: TenantResponseDto })
  async restore(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: RestoreTenantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.restore(tenantId, dto, actor, correlationId);
  }

  @Post(':tenantId/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_CLOSE)
  @ApiOperation({ summary: 'Close a tenant (lifecycle end)' })
  @ApiOkResponse({ type: TenantResponseDto })
  async close(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: SuspendTenantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.close(tenantId, dto.reason, actor, correlationId, dto.mfaCode);
  }

  @Get(':tenantId/usage')
  @RequirePermissions(PLATFORM_PERMISSIONS.USAGE_READ)
  @ApiOperation({ summary: 'Get tenant usage metrics' })
  @ApiOkResponse({ type: TenantUsageDto })
  async getUsage(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantUsageDto> {
    return this.tenantService.getUsage(tenantId);
  }

  @Put(':tenantId/plan')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.PLAN_CHANGE)
  @ApiOperation({ summary: 'Change tenant commercial plan' })
  @ApiOkResponse({ type: TenantResponseDto })
  async changePlan(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ChangePlanDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.changePlan(tenantId, dto, actor, correlationId);
  }

  @Put(':tenantId/entitlements')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.ENTITLEMENT_MANAGE)
  @ApiOperation({ summary: 'Set tenant-specific entitlement overrides (ETag)' })
  @ApiOkResponse({ type: TenantResponseDto })
  async updateEntitlements(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateEntitlementsDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.updateEntitlements(tenantId, dto, actor, correlationId, ifMatch);
  }
}
