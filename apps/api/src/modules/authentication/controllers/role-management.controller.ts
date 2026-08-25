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
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { TENANT_ADMIN_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { RoleManagementService } from '../services/role-management.service';

class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}

class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}

@ApiTags('roles')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RoleManagementController {
  constructor(private readonly roles: RoleManagementService) {}

  @Get('roles')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.ROLE_READ)
  @ApiOperation({ summary: 'List tenant roles (SCR-AUD-04)' })
  listRoles(@CurrentUser() user: CurrentUserContext) {
    return this.roles.listRoles(this.requireTenant(user));
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Create a custom role' })
  createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.roles.createRole(
      this.requireTenant(user),
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Patch('roles/:roleId')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Update a custom role / permission matrix' })
  updateRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.roles.updateRole(
      this.requireTenant(user),
      roleId,
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Delete('roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Delete a custom (non-system) role' })
  async deleteRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    await this.roles.deleteRole(
      this.requireTenant(user),
      roleId,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Get('permissions')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.ROLE_READ)
  @ApiOperation({ summary: 'List permission catalogue' })
  listPermissions(@CurrentUser() user: CurrentUserContext) {
    this.requireTenant(user);
    return this.roles.listPermissions();
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
