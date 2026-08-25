import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PlatformSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = 8) {
    const term = q.trim();
    if (term.length < 2) {
      return { tenants: [], users: [], auditEvents: [] };
    }

    const [tenants, users, auditEvents] = await Promise.all([
      this.prisma.tenant.findMany({
        where: {
          OR: [
            { displayName: { contains: term, mode: 'insensitive' } },
            { legalName: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          displayName: true,
          slug: true,
          status: true,
          countryCode: true,
        },
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.appUser.findMany({
        where: {
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { displayName: { contains: term, mode: 'insensitive' } },
          ],
          platformRole: { not: null },
        },
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
        },
        orderBy: { email: 'asc' },
      }),
      this.prisma.auditEvent.findMany({
        where: {
          OR: [
            { action: { contains: term, mode: 'insensitive' } },
            { resourceId: { contains: term, mode: 'insensitive' } },
            { actorEmail: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { occurredAt: 'desc' },
        select: {
          id: true,
          action: true,
          module: true,
          resourceType: true,
          resourceId: true,
          severity: true,
          occurredAt: true,
          tenantId: true,
        },
      }),
    ]);

    return {
      tenants,
      users,
      auditEvents: auditEvents.map((e) => ({
        ...e,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
  }
}
