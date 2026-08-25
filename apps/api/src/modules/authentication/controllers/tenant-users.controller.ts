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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { TENANT_ADMIN_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { TenantUserService } from '../services/tenant-user.service';
import type { RequestContext } from '../services/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ListUsersDto {
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
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantUsersController {
  constructor(private readonly users: TenantUserService) {}

  @Get()
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_READ)
  @ApiOperation({ summary: 'List tenant users (SCR-TEN-05)' })
  list(@Query() query: ListUsersDto, @CurrentUser() user: CurrentUserContext) {
    return this.users.listUsers(this.requireTenant(user), query);
  }

  @Get(':userId')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_READ)
  @ApiOperation({ summary: 'Get tenant user detail' })
  getOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.users.getUser(this.requireTenant(user), userId);
  }

  @Post(':userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_DEACTIVATE)
  @ApiOperation({ summary: 'Deactivate a tenant user' })
  deactivate(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ) {
    return this.users.deactivate(
      this.requireTenant(user),
      userId,
      { userId: user.userId, email: user.email },
      this.buildContext(req),
    );
  }

  @Post(':userId/require-password-reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_MANAGE)
  @ApiOperation({ summary: 'Require password reset for a user' })
  requirePasswordReset(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ) {
    return this.users.requirePasswordReset(
      this.requireTenant(user),
      userId,
      { userId: user.userId, email: user.email },
      this.buildContext(req),
    );
  }

  @Post(':userId/require-mfa')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_MANAGE)
  @ApiOperation({ summary: 'Require MFA enrollment for a user' })
  requireMfa(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ) {
    return this.users.requireMfa(
      this.requireTenant(user),
      userId,
      { userId: user.userId, email: user.email },
      this.buildContext(req),
    );
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

  private buildContext(req: Request): RequestContext {
    const headerCorrelationId = req.headers['x-correlation-id'] as string | undefined;
    const correlationId =
      headerCorrelationId && UUID_PATTERN.test(headerCorrelationId)
        ? headerCorrelationId
        : randomUUID();
    return {
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      correlationId,
    };
  }
}
