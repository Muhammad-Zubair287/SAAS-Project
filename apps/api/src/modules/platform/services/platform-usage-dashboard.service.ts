import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PlatformUsageDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(rangeDays = 30) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - rangeDays);
    since.setUTCHours(0, 0, 0, 0);

    const snapshots = await this.prisma.tenantUsageSnapshot.findMany({
      where: { snapshotDate: { gte: since } },
      include: { tenant: { select: { id: true, displayName: true, seatLimit: true, status: true } } },
      orderBy: { snapshotDate: 'asc' },
    });

    const latestByTenant = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) {
      const prev = latestByTenant.get(s.tenantId);
      if (!prev || s.snapshotDate > prev.snapshotDate) {
        latestByTenant.set(s.tenantId, s);
      }
    }
    const latest = [...latestByTenant.values()];

    const totalSeats = latest.reduce((n, s) => n + (s.tenant.seatLimit ?? 0), 0);
    const totalActive = latest.reduce((n, s) => n + s.activeEmployees, 0);
    const totalStorage = latest.reduce((n, s) => n + Number(s.storageUsedBytes), 0);
    const totalApi = latest.reduce((n, s) => n + s.apiCallsMonth, 0);
    const totalMrr = latest.reduce(
      (n, s) => n + (s.estimatedMrr != null ? Number(s.estimatedMrr) : 0),
      0,
    );

    const byDate = new Map<string, { seats: number; api: number; mrr: number; tenants: number }>();
    for (const s of snapshots) {
      const key = s.snapshotDate.toISOString().slice(0, 10);
      const cur = byDate.get(key) ?? { seats: 0, api: 0, mrr: 0, tenants: 0 };
      cur.seats += s.activeEmployees;
      cur.api += s.apiCallsMonth;
      cur.mrr += s.estimatedMrr != null ? Number(s.estimatedMrr) : 0;
      cur.tenants += 1;
      byDate.set(key, cur);
    }

    const series = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const topTenants = latest
      .map((s) => ({
        tenantId: s.tenantId,
        displayName: s.tenant.displayName,
        status: s.tenant.status,
        seatsUsed: s.activeEmployees,
        seatLimit: s.tenant.seatLimit,
        storageUsedBytes: Number(s.storageUsedBytes),
        apiCallsMonth: s.apiCallsMonth,
        estimatedMrr: s.estimatedMrr != null ? Number(s.estimatedMrr) : 0,
      }))
      .sort((a, b) => b.seatsUsed - a.seatsUsed)
      .slice(0, 10);

    const moduleCounts: Record<string, number> = {};
    for (const s of latest) {
      const adoption = (s.moduleAdoptionJson ?? {}) as Record<string, boolean>;
      for (const [code, on] of Object.entries(adoption)) {
        if (on) moduleCounts[code] = (moduleCounts[code] ?? 0) + 1;
      }
    }

    return {
      kpis: {
        totalSeats,
        totalActiveEmployees: totalActive,
        seatUtilisationPct: totalSeats > 0 ? Math.round((totalActive / totalSeats) * 1000) / 10 : 0,
        storageUsedGb: Math.round((totalStorage / (1024 * 1024 * 1024)) * 100) / 100,
        apiCallsMonth: totalApi,
        estimatedMrr: Math.round(totalMrr * 100) / 100,
        tenantsWithData: latest.length,
        moduleAdoption: moduleCounts,
      },
      series,
      topTenants,
    };
  }
}
