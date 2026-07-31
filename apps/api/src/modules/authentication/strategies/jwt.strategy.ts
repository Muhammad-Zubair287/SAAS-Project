import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';

// JwtStrategy validates every request that carries a Bearer token.
// It is invoked by JwtAuthGuard when applied to a route.
//
// Responsibilities:
//   1. Verify JWT signature and expiry (handled by Passport/passport-jwt).
//   2. Load the AppUser from the database using the 'sub' claim.
//   3. Assert user status is ACTIVE.
//   4. Assert tenant status is not SUSPENDED/CLOSED/ARCHIVED (when tenantId present).
//   5. Return a CurrentUserContext that becomes request.user.
//
// This strategy does NOT:
//   - Issue tokens  (Batch 4 — AuthService)
//   - Check passwords (Batch 4 — PasswordService)
//   - Enforce MFA    (Batch 6 — MfaService)
//   - Resolve permissions (Batch 7 — RbacService; permissions: [] placeholder here)

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserContext> {
    // ── 1. Load user ─────────────────────────────────────────────────────────
    const user = await this.prisma.appUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        emailNormalised: true,
        displayName: true,
        status: true,
        platformRole: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'User not found.',
      });
    }

    // ── 2. Assert user is active ──────────────────────────────────────────────
    if (user.status === 'LOCKED') {
      throw new AppException({
        code: ERROR_CODES.ACCOUNT_LOCKED,
        message: 'Account is locked. Please contact your administrator.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppException({
        code: ERROR_CODES.ACCOUNT_DISABLED,
        message: 'Account has been deactivated.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.status !== 'ACTIVE') {
      // INVITED or unknown status — treat as not yet active
      throw new AppException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'Account is not active.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // ── 3. Assert tenant is accessible (only when token carries a tenantId) ──
    if (payload.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: { status: true },
      });

      if (!tenant) {
        throw new AppException({
          code: ERROR_CODES.AUTHENTICATION_REQUIRED,
          message: 'Tenant not found.',
          statusCode: HttpStatus.UNAUTHORIZED,
        });
      }

      // SUSPENDED, CLOSED, and ARCHIVED tenants cannot process authenticated requests.
      if (
        tenant.status === 'SUSPENDED' ||
        tenant.status === 'CLOSED' ||
        tenant.status === 'ARCHIVED'
      ) {
        throw new AppException({
          code: ERROR_CODES.TENANT_SUSPENDED,
          message: 'Tenant is not accessible.',
          statusCode: HttpStatus.FORBIDDEN,
        });
      }
    }

    // ── 4. Build and return the request-scoped context ────────────────────────
    // effectivePermissions and resolvedRoles are populated lazily by PermissionGuard
    // when @RequirePermissions() is present on the route handler.
    return {
      userId: user.id,
      tenantId: payload.tenantId ?? null,
      email: user.email,
      roles: payload.roles ?? [],
      permissions: [],
      effectivePermissions: [],
      resolvedRoles: [],
      scope: payload.scope ?? 'tenant',
      platformRole: user.platformRole ?? null,
      sessionId: payload.sessionId ?? '',
    };
  }
}
