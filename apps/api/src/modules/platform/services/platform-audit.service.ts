import { Injectable } from '@nestjs/common';
import { AuditEventRepository, type CreateAuditEventInput, type PrismaTx } from '../repositories/audit-event.repository';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

type LogOpts = {
  module: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  tenantId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  correlationId: string;
  severity?: AuditEventSeverity;
};

@Injectable()
export class PlatformAuditService {
  constructor(private readonly auditRepo: AuditEventRepository) {}

  async log(actor: PlatformActorContext, opts: LogOpts): Promise<void> {
    await this.auditRepo.create(this.buildInput(actor, opts));
  }

  async logWithTx(tx: PrismaTx, actor: PlatformActorContext, opts: LogOpts): Promise<void> {
    await this.auditRepo.createWithTx(tx, this.buildInput(actor, opts));
  }

  private buildInput(actor: PlatformActorContext, opts: LogOpts): CreateAuditEventInput {
    return {
      tenantId: opts.tenantId,
      actorId: actor.actorId,
      actorType: AuditActorType.USER,
      actorEmail: actor.email,
      module: opts.module,
      action: opts.action,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
      before: opts.before,
      after: opts.after,
      metadata: opts.metadata,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      correlationId: opts.correlationId,
      severity: opts.severity ?? AuditEventSeverity.INFO,
    };
  }
}
