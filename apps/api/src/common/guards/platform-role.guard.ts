import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_METADATA_KEY } from '../decorators/require-permissions.decorator';
import {
  PLATFORM_ROLE_PERMISSIONS,
  type PlatformPermission,
} from '../constants/permissions.constants';
import type { PlatformActorContext } from '../interfaces/platform-actor.interface';
import { ERROR_CODES } from '../constants/error-codes.constants';

// PlatformActor comes from:
// 1) PlatformActorMiddleware (development X-Dev-Actor-* headers), or
// 2) PlatformAuthenticationGuard (JWT → platformActor for scope=platform).
// Permission checks use PLATFORM_ROLE_PERMISSIONS for the actor's platformRole.

@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { platformActor?: PlatformActorContext }>();

    const actor = request.platformActor;

    if (!actor) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'Platform authentication required.',
      });
    }

    const required = this.reflector.getAllAndOverride<PlatformPermission[]>(
      PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const granted = PLATFORM_ROLE_PERMISSIONS[actor.platformRole] ?? [];
    const hasAll = required.every((p) => granted.includes(p));

    if (!hasAll) {
      throw new ForbiddenException({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: 'Insufficient platform permissions.',
      });
    }

    return true;
  }
}
