import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { TENANT_ADMIN_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { TenantSessionAdminService } from '../services/tenant-session-admin.service';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantSessionsController {
  constructor(private readonly sessions: TenantSessionAdminService) {}

  @Get()
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SESSION_READ)
  @ApiOperation({ summary: 'List active tenant sessions (SCR-AUD-06)' })
  list(@CurrentUser() user: CurrentUserContext) {
    return this.sessions.listSessions(this.requireTenant(user));
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SESSION_REVOKE)
  @ApiOperation({ summary: 'Revoke a session' })
  revokeOne(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.sessions.revokeSession(
      this.requireTenant(user),
      sessionId,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SESSION_REVOKE)
  @ApiOperation({ summary: 'Revoke all tenant sessions' })
  revokeAll(
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.sessions.revokeAll(
      this.requireTenant(user),
      { userId: user.userId, email: user.email },
      correlationId,
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
}
