import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { SessionService } from '../services/session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserContext> {
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
      throw new AppException({
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        message: 'Account is not active.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Revoked / expired sessions must not be trusted merely because the JWT signature is valid.
    await this.sessionService.assertSessionActive(
      payload.sessionId ?? '',
      user.id,
      payload.tenantId ?? null,
    );

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
