import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { PlatformRole } from '../enums/platform.enum';
import type { PlatformActorContext } from '../interfaces/platform-actor.interface';
import { ERROR_CODES } from '../constants/error-codes.constants';
import type { CurrentUserContext } from '../../modules/authentication/interfaces/current-user-context.interface';

/**
 * Platform route authentication bridge (M01 + M02).
 *
 * - If PlatformActorMiddleware already set `platformActor` (dev X-Dev-Actor-*), allow.
 * - Otherwise require a valid JWT and map `request.user` → `platformActor` for
 *   PlatformRoleGuard / @CurrentUser() (common decorator).
 *
 * Completes the wiring documented on PlatformRoleGuard / PlatformActorMiddleware:
 * JWT sessions must populate platformActor for production-like local login.
 */
@Injectable()
export class PlatformAuthenticationGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { platformActor?: PlatformActorContext }>();

    if (request.platformActor) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser = CurrentUserContext>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context
      .switchToHttp()
      .getRequest<Request & { platformActor?: PlatformActorContext; user?: CurrentUserContext }>();

    if (err || !user) {
      if (request.platformActor) {
        return user as TUser;
      }
      throw (
        err ??
        new UnauthorizedException({
          code: ERROR_CODES.AUTHENTICATION_REQUIRED,
          message: 'Platform authentication required.',
        })
      );
    }

    const ctx = user as unknown as CurrentUserContext;
    if (
      !request.platformActor &&
      ctx.platformRole &&
      Object.values(PlatformRole).includes(ctx.platformRole as PlatformRole) &&
      ctx.scope === 'platform'
    ) {
      request.platformActor = {
        actorId: ctx.userId,
        email: ctx.email,
        displayName: ctx.email,
        platformRole: ctx.platformRole as PlatformRole,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      };
    }

    return user;
  }
}
