import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, randomUUID } from 'crypto';
import type { Request } from 'express';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { DeviceAuthService } from '../services/device-auth.service';
import { DEVICE_AUTH_KEY } from '../decorators/device-auth.decorator';
import type { CurrentDeviceContext } from '../interfaces/current-device-context.interface';

type DeviceRequest = Request & { device: CurrentDeviceContext };

/**
 * Authenticates only routes explicitly marked with @DeviceAuth(). The guard
 * never treats a device token as a user JWT and never logs the raw credential.
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly deviceAuthService: DeviceAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(DEVICE_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<DeviceRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        message: 'A valid device token is required.',
      });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    // The approved token format has no tenant prefix. Resolve tenant from the
    // hashed credential, then delegate all validity/state checks to the
    // existing DeviceAuthService.
    const tokenRecord = await this.prisma.attendanceDeviceToken.findFirst({
      where: { tokenHash },
      select: { tenantId: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        message: 'A valid device token is required.',
      });
    }

    const validated = await this.deviceAuthService.validateToken(
      tokenHash,
      tokenRecord.tenantId,
    );
    if (!validated.valid || !validated.deviceId || !validated.expiresAt) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        message: 'A valid device token is required.',
      });
    }

    request.device = {
      deviceId: validated.deviceId,
      tenantId: tokenRecord.tenantId,
      expiresAt: validated.expiresAt,
      token,
      tokenHash,
    };

    // Keep the correlation-ID rule consistent when a route is invoked outside
    // the normal HTTP middleware in tests.
    request.headers['x-correlation-id'] ??= randomUUID();
    return true;
  }

  private extractToken(request: Request): string | null {
    const value = request.headers['x-wcos-device-token'];
    const token = Array.isArray(value) ? value[0] : value;
    if (!token || token.length > 1024 || /[\r\n]/.test(token)) return null;
    return token;
  }
}
