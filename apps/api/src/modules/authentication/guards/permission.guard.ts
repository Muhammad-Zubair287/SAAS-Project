import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuthorizationService } from '../services/authorization.service';
import {
  REQUIRE_PERMISSIONS_KEY,
  type PermissionMetadata,
} from '../decorators/require-permissions.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';

// PermissionGuard enforces @RequirePermissions() declarations.
//
// Must be chained AFTER JwtAuthGuard so that request.user is already populated.
// Usage:  @UseGuards(JwtAuthGuard, PermissionGuard)
//         @RequirePermissions('read:employee:tenant')
//
// When no @RequirePermissions() is present the guard is a no-op (passes through).

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<PermissionMetadata | undefined>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission metadata → route only needs authentication (already done by JwtAuthGuard).
    if (!meta) return true;

    const request = context.switchToHttp().getRequest<Request & { user: CurrentUserContext }>();
    const user = request.user;

    if (!user?.userId) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'Authentication required.',
      });
    }

    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();

    const resolved = await this.authorizationService.getEffectivePermissions(
      user.userId,
      user.tenantId,
      user.platformRole,
    );

    // Attach resolved data to user context so controllers can read it if needed.
    user.effectivePermissions = resolved.permissions;
    user.resolvedRoles = resolved.roles;

    const { permissions, mode } = meta;

    const granted =
      mode === 'ANY'
        ? this.authorizationService.hasAnyPermission(resolved.permissions, permissions)
        : this.authorizationService.hasAllPermissions(resolved.permissions, permissions);

    if (!granted) {
      void this.authorizationService.emitPermissionDenied(user, permissions, correlationId);
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    return true;
  }
}
