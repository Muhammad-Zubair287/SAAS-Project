import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { SupportGrantService } from '../services/support-grant.service';
import { CreateSupportGrantDto, RevokeSupportGrantDto } from '../dto/create-support-grant.dto';
import { SupportGrantResponseDto } from '../dto/tenant-response.dto';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SupportGrantStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ListSupportGrantsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ enum: SupportGrantStatus })
  @IsOptional()
  @IsEnum(SupportGrantStatus)
  status?: SupportGrantStatus;
}

@ApiTags('Platform — Support Grants')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform')
export class PlatformSupportGrantsController {
  constructor(private readonly grantService: SupportGrantService) {}

  @Post('tenants/:tenantId/support-grants')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PLATFORM_PERMISSIONS.SUPPORT_GRANT)
  @ApiOperation({ summary: 'Create time-limited support access grant (MFA required in production)' })
  @ApiCreatedResponse({ type: SupportGrantResponseDto })
  async create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateSupportGrantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<SupportGrantResponseDto> {
    return this.grantService.create(tenantId, dto, actor, correlationId);
  }

  @Get('support-grants')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'List support grants across tenants' })
  @ApiOkResponse({ description: 'Paginated support grant list' })
  async findMany(@Query() query: ListSupportGrantsDto) {
    const { data, total } = await this.grantService.findMany({
      tenantId: query.tenantId,
      status: query.status,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    return createPaginatedResponse(data, total, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('tenants/:tenantId/support-grants')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  @ApiOperation({ summary: 'List support grants for a tenant' })
  @ApiOkResponse({ type: [SupportGrantResponseDto] })
  async findByTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<SupportGrantResponseDto[]> {
    return this.grantService.findByTenantId(tenantId);
  }

  @Post('support-grants/:grantId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.SUPPORT_APPROVE)
  @ApiOperation({ summary: 'Approve a PENDING support grant' })
  @ApiOkResponse({ type: SupportGrantResponseDto })
  async approve(
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<SupportGrantResponseDto> {
    return this.grantService.approve(grantId, actor, correlationId);
  }

  @Post('support-grants/:grantId/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.SUPPORT_APPROVE)
  @ApiOperation({ summary: 'Reject a PENDING support grant' })
  @ApiOkResponse({ type: SupportGrantResponseDto })
  async reject(
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Body() dto: RevokeSupportGrantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<SupportGrantResponseDto> {
    return this.grantService.reject(grantId, dto.reason, actor, correlationId);
  }

  @Delete('support-grants/:grantId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PLATFORM_PERMISSIONS.SUPPORT_REVOKE)
  @ApiOperation({ summary: 'Revoke a support grant (MFA required in production)' })
  @ApiOkResponse({ type: SupportGrantResponseDto })
  async revoke(
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Body() dto: RevokeSupportGrantDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ): Promise<SupportGrantResponseDto> {
    return this.grantService.revoke(grantId, dto, actor, correlationId);
  }
}
