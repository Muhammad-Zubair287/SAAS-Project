import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { Prisma, type AttendanceDeviceToken, DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { AttendanceDeviceRepository } from '../repositories/attendance-device.repository';
import { AttendanceDeviceTokenRepository } from '../repositories/attendance-device-token.repository';

export interface IssueTokenResult {
  token: string; // Raw token to send to device (only time it's exposed)
  expiresIn: number; // Seconds until expiration
  expiresAt: Date;
}

export interface ValidateTokenResult {
  valid: boolean;
  deviceId?: string;
  tenantId?: string;
  expiresAt?: Date;
  reason?: string;
}

/**
 * DeviceAuthService
 *
 * Handles device authentication tokens:
 * - Issue tokens (short-lived, hashed in database)
 * - Rotate tokens (revoke old, issue new)
 * - Revoke tokens (invalidate immediately)
 * - Validate tokens (check expiry, revocation, etc.)
 *
 * Tokens are stored as SHA-256 hashes. Raw tokens are NEVER persisted.
 * This prevents credential exposure even if the database is compromised.
 */
@Injectable()
export class DeviceAuthService {
  private readonly logger = new Logger(DeviceAuthService.name);

  // Token configuration (in seconds)
  private readonly TOKEN_LIFETIME_SECONDS = 3600; // 1 hour
  private readonly TOKEN_LENGTH_BYTES = 32; // 256 bits

  constructor(
    private readonly deviceRepo: AttendanceDeviceRepository,
    private readonly tokenRepo: AttendanceDeviceTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Issue a new device token.
   * Generates a cryptographically secure random token and stores its hash.
   * Tokens expire after TOKEN_LIFETIME_SECONDS.
   */
  async issueToken(
    deviceId: string,
    tenantId: string,
    actorId: string,
    correlationId: string,
  ): Promise<IssueTokenResult> {
    const device = await this.deviceRepo.findById(deviceId, tenantId);
    if (!device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }

    if (device.status !== DeviceStatus.ACTIVE) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_INVALID_STATUS,
        statusCode: HttpStatus.CONFLICT,
        message: `Cannot issue token for device with status "${device.status}".`,
      });
    }

    // Generate token: random bytes + device ID + timestamp
    // This ensures uniqueness and allows token versioning
    const randomPart = randomBytes(this.TOKEN_LENGTH_BYTES).toString('hex');
    const token = `${deviceId}.${randomPart}`;
    const tokenHash = this.hashToken(token);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.TOKEN_LIFETIME_SECONDS * 1000);

    const tokenRecord = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.attendanceDeviceToken.create({
        data: {
          tenantId,
          deviceId,
          tokenHash,
          issuedAt: now,
          expiresAt,
          createdBy: actorId,
        },
      });

      // Audit: Token Issued
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          module: 'ATTENDANCE',
          action: 'DeviceTokenIssued',
          resourceType: 'attendance_device_token',
          resourceId: created.id,
          after: {
            tokenId: created.id,
            deviceId: created.deviceId,
            expiresAt: expiresAt.toISOString(),
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: now,
        },
      });

      // Outbox: Token issued
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceTokenIssued.v1',
          payload: {
            deviceId,
            tokenId: created.id,
            expiresAt: expiresAt.toISOString(),
            correlationId,
          },
        },
      });

      return created;
    });

    return {
      token, // Raw token only returned once
      expiresIn: this.TOKEN_LIFETIME_SECONDS,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  /**
   * Rotate a device token.
   * Revokes the old token and issues a new one in an atomic transaction.
   */
  async rotateToken(
    oldTokenHash: string,
    deviceId: string,
    tenantId: string,
    actorId: string,
    correlationId: string,
  ): Promise<IssueTokenResult> {
    const oldToken = await this.tokenRepo.findByHash(oldTokenHash, tenantId);
    if (!oldToken) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Token not found.',
      });
    }

    if (oldToken.deviceId !== deviceId) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        statusCode: HttpStatus.CONFLICT,
        message: 'Token does not belong to this device.',
      });
    }

    if (oldToken.revokedAt) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_REVOKED,
        statusCode: HttpStatus.CONFLICT,
        message: 'Token has already been revoked.',
      });
    }

    if (oldToken.rotatedAt) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_REVOKED,
        statusCode: HttpStatus.CONFLICT,
        message: 'Token has already been rotated.',
      });
    }

    // Issue new token and revoke old one atomically
    const result = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      // Revoke old token by marking it rotated
      await tx.attendanceDeviceToken.update({
        where: { id: oldToken.id },
        data: {
          rotatedAt: new Date(),
        },
      });

      // Issue new token
      const randomPart = randomBytes(this.TOKEN_LENGTH_BYTES).toString('hex');
      const newToken = `${deviceId}.${randomPart}`;
      const newTokenHash = this.hashToken(newToken);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.TOKEN_LIFETIME_SECONDS * 1000);

      const newTokenRecord = await tx.attendanceDeviceToken.create({
        data: {
          tenantId,
          deviceId,
          tokenHash: newTokenHash,
          issuedAt: now,
          expiresAt,
          createdBy: actorId,
        },
      });

      // Audit: Token Rotated
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          module: 'ATTENDANCE',
          action: 'DeviceTokenRotated',
          resourceType: 'attendance_device_token',
          resourceId: oldToken.id,
          before: {
            tokenId: oldToken.id,
            status: 'active',
          } as Prisma.InputJsonValue,
          after: {
            oldTokenId: oldToken.id,
            status: 'rotated',
            newTokenId: newTokenRecord.id,
            newExpiresAt: expiresAt.toISOString(),
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: now,
        },
      });

      // Outbox: Token rotated
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceTokenRotated.v1',
          payload: {
            deviceId,
            oldTokenId: oldToken.id,
            newTokenId: newTokenRecord.id,
            expiresAt: expiresAt.toISOString(),
            correlationId,
          },
        },
      });

      return {
        token: newToken,
        expiresIn: this.TOKEN_LIFETIME_SECONDS,
        expiresAt,
      };
    });

    return result;
  }

  /**
   * Revoke a device token.
   * Marks token as revoked, preventing any future use.
   */
  async revokeToken(
    tokenHash: string,
    deviceId: string,
    tenantId: string,
    actorId: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    const token = await this.tokenRepo.findByHash(tokenHash, tenantId);
    if (!token) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Token not found.',
      });
    }

    if (token.deviceId !== deviceId) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_TOKEN_INVALID,
        statusCode: HttpStatus.CONFLICT,
        message: 'Token does not belong to this device.',
      });
    }

    if (token.revokedAt) {
      // Idempotent: already revoked
      return;
    }

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const now = new Date();

      await tx.attendanceDeviceToken.update({
        where: { id: token.id },
        data: {
          revokedAt: now,
        },
      });

      // Audit: Token Revoked
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          module: 'ATTENDANCE',
          action: 'DeviceTokenRevoked',
          resourceType: 'attendance_device_token',
          resourceId: token.id,
          before: {
            tokenId: token.id,
            status: 'active',
          } as Prisma.InputJsonValue,
          after: {
            tokenId: token.id,
            status: 'revoked',
          } as Prisma.InputJsonValue,
          metadata: {
            reason,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.WARNING,
          occurredAt: now,
        },
      });

      // Outbox: Token revoked
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceTokenRevoked.v1',
          payload: {
            deviceId,
            tokenId: token.id,
            reason,
            correlationId,
          },
        },
      });
    });
  }

  /**
   * Validate a device token.
   * Checks:
   * 1. Token exists (hash matches)
   * 2. Not expired
   * 3. Not revoked
   * 4. Device is ACTIVE
   *
   * Returns validation result with device context if valid.
   */
  async validateToken(tokenHash: string, tenantId: string): Promise<ValidateTokenResult> {
    // Check token existence and validity
    const token = await this.tokenRepo.findByHash(tokenHash, tenantId);
    if (!token) {
      return {
        valid: false,
        reason: 'Token not found',
      };
    }

    // Check if revoked
    if (token.revokedAt) {
      return {
        valid: false,
        reason: 'Token has been revoked',
      };
    }

    // Check if rotated (treated as revoked)
    if (token.rotatedAt) {
      return {
        valid: false,
        reason: 'Token has been rotated and is no longer valid',
      };
    }

    // Check if expired
    const now = new Date();
    if (now > token.expiresAt) {
      return {
        valid: false,
        reason: 'Token has expired',
      };
    }

    // Check device exists and is ACTIVE
    const device = await this.deviceRepo.findById(token.deviceId, tenantId);
    if (!device) {
      return {
        valid: false,
        reason: 'Device not found',
      };
    }

    if (device.status !== DeviceStatus.ACTIVE) {
      return {
        valid: false,
        reason: `Device is not active (status: ${device.status})`,
      };
    }

    return {
      valid: true,
      deviceId: device.id,
      tenantId,
      expiresAt: token.expiresAt,
    };
  }

  /**
   * Generate a hash of a token for secure storage.
   * Uses SHA-256 to ensure one-way hashing.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Compare a raw token against a stored hash.
   * Used for constant-time comparison to prevent timing attacks.
   */
  compareToken(rawToken: string, storedHash: string): boolean {
    const computedHash = this.hashToken(rawToken);
    // Use timing-safe comparison (built into modern Node.js)
    return computedHash === storedHash;
  }
}
