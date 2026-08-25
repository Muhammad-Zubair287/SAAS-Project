import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { PlatformAuditService } from './platform-audit.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

@Injectable()
export class PlatformIntegrationHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async listConnections() {
    const rows = await this.prisma.integrationConnection.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category,
      provider: r.provider ?? undefined,
      status: r.status,
      enabled: r.enabled,
      lastSyncAt: r.lastSyncAt?.toISOString(),
      lastSuccessAt: r.lastSuccessAt?.toISOString(),
      lastFailureAt: r.lastFailureAt?.toISOString(),
      errorCount24h: r.errorCount24h,
      itemsProcessed: r.itemsProcessed,
      successRatePct: r.successRatePct != null ? Number(r.successRatePct) : undefined,
    }));
  }

  async listSyncRuns(connectionId: string, limit = 20) {
    const rows = await this.prisma.integrationSyncRun.findMany({
      where: { connectionId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      status: r.status,
      itemsProcessed: r.itemsProcessed,
      errorCount: r.errorCount,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString(),
      durationMs: r.durationMs ?? undefined,
      message: r.message ?? undefined,
    }));
  }

  async listReconciliation(connectionId?: string) {
    const rows = await this.prisma.integrationReconciliationItem.findMany({
      where: {
        status: { in: ['UNMAPPED', 'DUPLICATE', 'CONFLICT'] },
        ...(connectionId ? { connectionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      externalId: r.externalId,
      itemType: r.itemType,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async resolveReconciliation(
    id: string,
    action: 'MAP' | 'IGNORE' | 'RESOLVE',
    actor: PlatformActorContext,
    correlationId: string,
  ) {
    const item = await this.prisma.integrationReconciliationItem.findUnique({ where: { id } });
    if (!item) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Reconciliation item not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const status = action === 'IGNORE' ? 'IGNORED' : 'RESOLVED';
    await this.prisma.withTransaction(async (tx) => {
      await tx.integrationReconciliationItem.update({
        where: { id },
        data: { status, resolvedAt: new Date() },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'integration.reconciliation.resolved',
        resourceType: 'integration_reconciliation_item',
        resourceId: id,
        after: { action, status },
        correlationId,
        severity: AuditEventSeverity.INFO,
      });
    });

    return { ok: true, status };
  }

  async setEnabled(
    id: string,
    enabled: boolean,
    actor: PlatformActorContext,
    correlationId: string,
  ) {
    const conn = await this.prisma.integrationConnection.findUnique({ where: { id } });
    if (!conn) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Integration connection not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const updated = await this.prisma.withTransaction(async (tx) => {
      const row = await tx.integrationConnection.update({
        where: { id },
        data: { enabled, status: enabled ? 'UNKNOWN' : 'FAILED' },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: enabled ? 'integration.enabled' : 'integration.disabled',
        resourceType: 'integration_connection',
        resourceId: id,
        before: { enabled: conn.enabled },
        after: { enabled },
        correlationId,
        severity: AuditEventSeverity.WARNING,
      });
      return row;
    });

    return { id: updated.id, enabled: updated.enabled, status: updated.status };
  }

  async retryProbe(id: string) {
    const conn = await this.prisma.integrationConnection.findUnique({ where: { id } });
    if (!conn) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Integration connection not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const now = new Date();
    const status = conn.enabled ? 'HEALTHY' : 'FAILED';
    await this.prisma.integrationHealthCheck.create({
      data: {
        connectionId: id,
        status,
        latencyMs: 25,
        message: 'Manual retry',
      },
    });
    await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        status,
        lastSyncAt: now,
        lastSuccessAt: status === 'HEALTHY' ? now : conn.lastSuccessAt,
      },
    });
    return { ok: true, status };
  }

  async incidents() {
    const failed = await this.prisma.integrationConnection.findMany({
      where: { status: { in: ['FAILED', 'WARNING'] }, enabled: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    return failed.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      status: r.status,
      lastFailureAt: r.lastFailureAt?.toISOString(),
      errorCount24h: r.errorCount24h,
    }));
  }
}
