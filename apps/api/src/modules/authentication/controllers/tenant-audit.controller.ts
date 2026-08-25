import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { TENANT_ADMIN_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { TenantAuditQueryService } from '../services/tenant-audit-query.service';
import { HttpStatus } from '@nestjs/common';

class ListAuditDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-events')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantAuditController {
  constructor(private readonly audit: TenantAuditQueryService) {}

  @Get()
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'List tenant-scoped audit events (SCR-AUD-01/02)' })
  list(@Query() query: ListAuditDto, @CurrentUser() user: CurrentUserContext) {
    return this.audit.list(this.requireTenant(user), query);
  }

  @Get(':id')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Get audit event detail' })
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.audit.getById(this.requireTenant(user), id);
  }

  private requireTenant(user: CurrentUserContext): string {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.TENANT_MEMBERSHIP_REQUIRED,
        message: 'Tenant context is required.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    return user.tenantId;
  }
}
