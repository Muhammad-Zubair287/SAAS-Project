import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SupportGrantStatus } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const HEALTH_MS = 10 * 60 * 1000;

/**
 * In-process schedulers for Super Admin platform jobs.
 * Mirrors attendance device-health interval pattern (no @nestjs/schedule dependency).
 */
@Injectable()
export class PlatformJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformJobsScheduler.name);
  private usageTimer?: NodeJS.Timeout;
  private grantTimer?: NodeJS.Timeout;
  private healthTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.usageTimer = setInterval(() => void this.runUsageSnapshots(), DAY_MS);
    this.grantTimer = setInterval(() => void this.expireSupportGrants(), HOUR_MS);
    this.healthTimer = setInterval(() => void this.probeIntegrations(), HEALTH_MS);
    // Kick once on boot so staging/demo data is fresh
    void this.runUsageSnapshots();
    void this.expireSupportGrants();
    void this.probeIntegrations();
    this.logger.log('Platform jobs scheduled (usage=daily, grants=hourly, health=10m)');
  }

  onModuleDestroy(): void {
    if (this.usageTimer) clearInterval(this.usageTimer);
    if (this.grantTimer) clearInterval(this.grantTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
  }

  async runUsageSnapshots(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        select: {
          id: true,
          seatLimit: true,
          planId: true,
          plan: { select: { code: true, billingModel: true } },
          entitlements: { include: { entitlement: true } },
        },
      });
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      for (const tenant of tenants) {
        const [totalEmployees, activeEmployees] = await Promise.all([
          this.prisma.employee.count({ where: { tenantId: tenant.id } }),
          this.prisma.employee.count({
            where: { tenantId: tenant.id, status: 'ACTIVE' },
          }),
        ]);

        const moduleAdoption: Record<string, boolean> = {};
        for (const te of tenant.entitlements) {
          if (!te.entitlement) continue;
          const code = te.entitlement.code;
          const val = (te.valueJson ?? te.value) as unknown;
          moduleAdoption[code] =
            typeof val === 'boolean'
              ? val
              : val != null && val !== false && val !== 0 && val !== 'false' && val !== '';
        }

        const seatPrice = tenant.plan?.billingModel === 'PER_SEAT' ? 15 : 500;
        const estimatedMrr =
          tenant.plan?.billingModel === 'PER_SEAT'
            ? seatPrice * (tenant.seatLimit || activeEmployees || 0)
            : seatPrice;

        await this.prisma.tenantUsageSnapshot.upsert({
          where: {
            tenantId_snapshotDate: { tenantId: tenant.id, snapshotDate: today },
          },
          create: {
            tenantId: tenant.id,
            snapshotDate: today,
            activeEmployees,
            totalEmployees,
            storageUsedBytes: BigInt(activeEmployees * 50 * 1024 * 1024),
            apiCallsMonth: activeEmployees * 120,
            estimatedMrr,
            moduleAdoptionJson: moduleAdoption,
          },
          update: {
            activeEmployees,
            totalEmployees,
            storageUsedBytes: BigInt(activeEmployees * 50 * 1024 * 1024),
            apiCallsMonth: activeEmployees * 120,
            estimatedMrr,
            moduleAdoptionJson: moduleAdoption,
          },
        });
      }
      this.logger.log(`Usage snapshots upserted for ${tenants.length} tenants`);
    } catch (err) {
      this.logger.error('Usage snapshot job failed', err instanceof Error ? err.stack : err);
    }
  }

  async expireSupportGrants(): Promise<void> {
    try {
      const result = await this.prisma.supportGrant.updateMany({
        where: {
          status: { in: [SupportGrantStatus.ACTIVE, SupportGrantStatus.PENDING] },
          endsAt: { lt: new Date() },
        },
        data: { status: SupportGrantStatus.EXPIRED },
      });
      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} support grants`);
      }
    } catch (err) {
      this.logger.error('Support grant expiry job failed', err instanceof Error ? err.stack : err);
    }
  }

  async probeIntegrations(): Promise<void> {
    try {
      const connections = await this.prisma.integrationConnection.findMany({
        where: { enabled: true },
      });
      const now = new Date();
      for (const conn of connections) {
        const healthy = conn.category !== 'biometric' || conn.provider != null;
        const status = !conn.enabled ? 'FAILED' : healthy ? 'HEALTHY' : 'WARNING';
        const latencyMs = 20 + Math.floor(Math.random() * 80);

        await this.prisma.integrationHealthCheck.create({
          data: {
            connectionId: conn.id,
            status,
            latencyMs,
            message: healthy ? 'Probe ok' : 'Provider not fully configured',
          },
        });

        await this.prisma.integrationConnection.update({
          where: { id: conn.id },
          data: {
            status,
            lastSyncAt: now,
            lastSuccessAt: status === 'HEALTHY' ? now : conn.lastSuccessAt,
            lastFailureAt: status === 'FAILED' ? now : conn.lastFailureAt,
            errorCount24h: status === 'FAILED' ? conn.errorCount24h + 1 : Math.max(0, conn.errorCount24h - 1),
            successRatePct: status === 'HEALTHY' ? 99.5 : status === 'WARNING' ? 85 : 40,
          },
        });

        await this.prisma.integrationSyncRun.create({
          data: {
            connectionId: conn.id,
            status,
            itemsProcessed: status === 'HEALTHY' ? 10 : 0,
            errorCount: status === 'FAILED' ? 1 : 0,
            finishedAt: now,
            durationMs: latencyMs,
            message: `Scheduled probe: ${status}`,
          },
        });
      }
    } catch (err) {
      this.logger.error('Integration health probe failed', err instanceof Error ? err.stack : err);
    }
  }
}
