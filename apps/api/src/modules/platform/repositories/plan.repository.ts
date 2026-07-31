import { Injectable } from '@nestjs/common';
import { type Plan } from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PlanRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // Batch 1 note: Plan now uses uuid PK (id) and unique code field.
  // References updated from old key/isActive/sortOrder/entitlements → code/status/name/planEntitlements.

  async findByKey(code: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { code } });
  }

  async findAllActive(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }

  async findByKeyWithEntitlements(code: string) {
    return this.prisma.plan.findUnique({
      where: { code },
      include: {
        planEntitlements: { include: { entitlement: true } },
      },
    });
  }

  async regionAllowsPlan(planCode: string, regionCode: string): Promise<boolean> {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan || plan.status !== 'ACTIVE') return false;

    const region = await this.prisma.deploymentRegion.findUnique({ where: { code: regionCode } });
    return region?.status === 'ACTIVE';
  }
}
