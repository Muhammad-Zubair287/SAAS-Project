import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { PlatformRole } from '../enums/platform.enum';
import type { PlatformActorContext } from '../interfaces/platform-actor.interface';

// Development-only middleware that reads platform actor from request headers.
// In production this is replaced by M02 JWT authentication middleware.
// Header: X-Dev-Actor-Id, X-Dev-Actor-Email, X-Dev-Actor-Role
//
// SECURITY: This middleware is a no-op unless APP_ENV === 'development'.

@Injectable()
export class PlatformActorMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(
    req: Request & { platformActor?: PlatformActorContext },
    _res: Response,
    next: NextFunction,
  ): void {
    const env = this.config.get<string>('app.environment', 'production');

    if (env === 'development') {
      const actorId = req.headers['x-dev-actor-id'] as string | undefined;
      const email = req.headers['x-dev-actor-email'] as string | undefined;
      const role = req.headers['x-dev-actor-role'] as string | undefined;

      if (actorId && email && role && Object.values(PlatformRole).includes(role as PlatformRole)) {
        req.platformActor = {
          actorId,
          email,
          displayName: email,
          platformRole: role as PlatformRole,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        };
      }
    }

    // In production: M02 JwtStrategy will populate req.platformActor before this middleware.
    // If not set, PlatformRoleGuard will reject with AUTHENTICATION_REQUIRED.

    next();
  }
}
