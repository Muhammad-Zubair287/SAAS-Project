import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ApiClientRepository } from '../repositories/api-client.repository';
import { generateSecureToken, hashToken } from '../utils/token.utils';
import type { CreateApiClientDto } from '../dto/create-api-client.dto';
import type { RequestContext } from './auth.service';

export interface CreateApiClientResponse {
  id: string;
  name: string;
  tenantId: string;
  scopes: string[];
  clientSecret: string; // plaintext — returned ONCE, never persisted
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiClientResponse {
  id: string;
  name: string;
  tenantId: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface RotateSecretResponse {
  clientSecret: string; // new plaintext secret — returned ONCE
  rotatedAt: Date;
}

@Injectable()
export class ApiClientService {
  constructor(
    private readonly apiClientRepo: ApiClientRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateApiClientDto,
    actorId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<CreateApiClientResponse> {
    const secret = generateSecureToken();
    const tokenHash = hashToken(secret);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const client = await this.apiClientRepo.create({
      tenantId,
      name: dto.name,
      tokenHash,
      scopes: dto.scopes,
      createdBy: actorId,
      expiresAt,
    });

    await this.emitAudit({
      tenantId,
      actorId,
      action: 'API_CLIENT_CREATED',
      resourceId: client.id,
      metadata: { name: dto.name, scopes: dto.scopes },
      correlationId: ctx.correlationId,
    });

    return {
      id: client.id,
      name: client.name,
      tenantId: client.tenantId,
      scopes: dto.scopes,
      clientSecret: secret,
      expiresAt: client.expiresAt,
      createdAt: client.createdAt,
    };
  }

  async rotateSecret(
    clientId: string,
    actorId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<RotateSecretResponse> {
    const client = await this.requireOwnedClient(clientId, tenantId);

    const newSecret = generateSecureToken();
    const newHash = hashToken(newSecret);

    await this.apiClientRepo.rotateSecret(client.id, newHash);

    await this.emitAudit({
      tenantId,
      actorId,
      action: 'API_CLIENT_SECRET_ROTATED',
      resourceId: client.id,
      metadata: { name: client.name },
      correlationId: ctx.correlationId,
    });

    return { clientSecret: newSecret, rotatedAt: new Date() };
  }

  async disable(
    clientId: string,
    actorId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<ApiClientResponse> {
    const client = await this.requireOwnedClient(clientId, tenantId);

    const updated = await this.apiClientRepo.disable(client.id);

    await this.emitAudit({
      tenantId,
      actorId,
      action: 'API_CLIENT_DISABLED',
      resourceId: client.id,
      metadata: { name: client.name },
      correlationId: ctx.correlationId,
    });

    return this.toResponse(updated);
  }

  async enable(
    clientId: string,
    actorId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<ApiClientResponse> {
    const client = await this.requireOwnedClient(clientId, tenantId);

    const updated = await this.apiClientRepo.enable(client.id);

    await this.emitAudit({
      tenantId,
      actorId,
      action: 'API_CLIENT_ENABLED',
      resourceId: client.id,
      metadata: { name: client.name },
      correlationId: ctx.correlationId,
    });

    return this.toResponse(updated);
  }

  async list(tenantId: string): Promise<ApiClientResponse[]> {
    const clients = await this.apiClientRepo.findAllByTenant(tenantId);
    return clients.map((c) => this.toResponse(c));
  }

  async getById(clientId: string, tenantId: string): Promise<ApiClientResponse> {
    const client = await this.requireOwnedClient(clientId, tenantId);
    return this.toResponse(client);
  }

  async delete(
    clientId: string,
    actorId: string,
    tenantId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const client = await this.requireOwnedClient(clientId, tenantId);

    await this.apiClientRepo.delete(client.id);

    await this.emitAudit({
      tenantId,
      actorId,
      action: 'API_CLIENT_DELETED',
      resourceId: client.id,
      metadata: { name: client.name },
      correlationId: ctx.correlationId,
    });
  }

  private async requireOwnedClient(clientId: string, tenantId: string) {
    const client = await this.apiClientRepo.findById(clientId);
    if (!client || client.tenantId !== tenantId) {
      throw new AppException({
        code: ERROR_CODES.API_CLIENT_NOT_FOUND,
        message: 'API client not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return client;
  }

  private toResponse(client: {
    id: string;
    name: string;
    tenantId: string;
    scopes: Prisma.JsonValue;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }): ApiClientResponse {
    return {
      id: client.id,
      name: client.name,
      tenantId: client.tenantId,
      scopes: Array.isArray(client.scopes) ? (client.scopes as string[]) : [],
      expiresAt: client.expiresAt,
      lastUsedAt: client.lastUsedAt,
      revokedAt: client.revokedAt,
      createdAt: client.createdAt,
    };
  }

  private async emitAudit(data: {
    tenantId: string;
    actorId: string;
    action: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    correlationId: string;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: data.tenantId,
          actorId: data.actorId,
          actorType: 'USER',
          module: 'authentication',
          action: data.action,
          resourceType: 'api_client',
          resourceId: data.resourceId,
          ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
          correlationId: data.correlationId,
          severity: 'INFO',
        },
      });
    } catch {
      // Audit failure must never interrupt client management.
    }
  }
}
