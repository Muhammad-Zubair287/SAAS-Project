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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import {
  RoleAssignmentService,
  type RoleAssignmentResponse,
} from '../services/role-assignment.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import type { RequestContext } from '../services/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RoleAssignmentController {
  constructor(private readonly roleAssignmentService: RoleAssignmentService) {}

  @ApiOperation({ summary: 'Assign a role to a user within the current tenant' })
  @RequirePermissions('manage:role_assignment:tenant')
  @Post('roles/:roleId/assign')
  @HttpCode(HttpStatus.CREATED)
  assignRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<RoleAssignmentResponse> {
    if (!actor.tenantId) {
      throw new Error('Role assignment requires a tenant-scoped JWT.');
    }
    return this.roleAssignmentService.assignRole(
      roleId,
      dto,
      actor.userId,
      actor.tenantId,
      this.buildContext(req),
    );
  }

  @ApiOperation({ summary: 'Revoke a role assignment from a user' })
  @RequirePermissions('manage:role_assignment:tenant')
  @Delete('roles/:roleId/assign/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<void> {
    if (!actor.tenantId) {
      throw new Error('Role revocation requires a tenant-scoped JWT.');
    }
    await this.roleAssignmentService.revokeRole(
      roleId,
      targetUserId,
      actor.userId,
      actor.tenantId,
      this.buildContext(req),
    );
  }

  @ApiOperation({ summary: "List a user's active role assignments within the current tenant" })
  @RequirePermissions('read:role_assignment:tenant')
  @Get('users/:userId/roles')
  @HttpCode(HttpStatus.OK)
  getUserRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<RoleAssignmentResponse[]> {
    if (!actor.tenantId) {
      throw new Error('Role listing requires a tenant-scoped JWT.');
    }
    return this.roleAssignmentService.getUserRoles(userId, actor.tenantId);
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
