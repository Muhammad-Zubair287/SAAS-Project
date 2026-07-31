import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ApiClientRepository } from '../repositories/api-client.repository';
import { hashToken } from '../utils/token.utils';
import type { CurrentApiClientContext } from '../interfaces/current-api-client-context.interface';
import type { Prisma } from '@prisma/client';

const BLOCKED_TENANT_STATUSES = new Set(['SUSPENDED', 'CLOSED', 'ARCHIVED']);

@Injectable()
export class ApiClientAuthService {
  constructor(
    private readonly apiClientRepo: ApiClientRepository,
    private readonly prisma: PrismaService,
  ) {}

  // Validates clientId + clientSecret, enforces lifecycle constraints,
  // updates lastUsedAt, and returns a populated CurrentApiClientContext.
  async authenticate(
    clientId: string,
    clientSecret: string,
    correlationId: string,
  ): Promise<CurrentApiClientContext> {
    const client = await this.apiClientRepo.findById(clientId);

    if (!client) {
      await this.emitAuthFailed(null, null, correlationId);
      throw new AppException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'API client credentials are invalid.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const secretHash = hashToken(clientSecret);
    if (client.tokenHash !== secretHash) {
      await this.emitAuthFailed(client.id, client.tenantId, correlationId);
      throw new AppException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'API client credentials are invalid.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (client.revokedAt !== null) {
      await this.emitAuthFailed(client.id, client.tenantId, correlationId);
      throw new AppException({
        code: ERROR_CODES.API_CLIENT_DISABLED,
        message: 'API client is disabled.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (client.expiresAt !== null && client.expiresAt < new Date()) {
      await this.emitAuthFailed(client.id, client.tenantId, correlationId);
      throw new AppException({
        code: ERROR_CODES.API_CLIENT_EXPIRED,
        message: 'API client has expired.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Verify the owning tenant is still accessible.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: client.tenantId },
      select: { status: true },
    });

    if (!tenant || BLOCKED_TENANT_STATUSES.has(tenant.status)) {
      await this.emitAuthFailed(client.id, client.tenantId, correlationId);
      throw new AppException({
        code: ERROR_CODES.TENANT_SUSPENDED,
        message: 'Tenant is not accessible.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    // Fire-and-forget: update lastUsedAt without blocking the auth response.
    void this.apiClientRepo.touchLastUsed(client.id).catch(() => undefined);

    await this.emitAuthSuccess(client.id, client.tenantId, correlationId);

    const scopes = Array.isArray(client.scopes) ? (client.scopes as string[]) : [];

    return {
      clientId: client.id,
      tenantId: client.tenantId,
      serviceName: client.name,
      permissions: scopes,
      scopes,
    };
  }

  private async emitAuthSuccess(
    clientId: string,
    tenantId: string,
    correlationId: string,
  ): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId,
          actorId: clientId,
          actorType: 'API_CLIENT',
          module: 'authentication',
          action: 'API_CLIENT_AUTH_SUCCESS',
          resourceType: 'api_client',
          resourceId: clientId,
          correlationId,
          severity: 'INFO',
        },
      });
    } catch {
      // Audit failure must never interrupt authentication.
    }
  }

  private async emitAuthFailed(
    clientId: string | null,
    tenantId: string | null,
    correlationId: string,
  ): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId,
          actorId: clientId ?? '00000000-0000-0000-0000-000000000000',
          actorType: 'API_CLIENT',
          module: 'authentication',
          action: 'API_CLIENT_AUTH_FAILED',
          resourceType: 'api_client',
          ...(clientId ? { resourceId: clientId } : {}),
          metadata: { reason: 'invalid_credentials' } as Prisma.InputJsonValue,
          correlationId,
          severity: 'WARNING',
        },
      });
    } catch {
      // Audit failure must never interrupt authentication.
    }
  }
}
