import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  DeploymentRegionResponseDto,
  PlanResponseDto,
} from '../dto/plan-response.dto';

@Injectable()
export class PlatformCatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(includeEntitlements = false, includeInactive = false): Promise<PlanResponseDto[]> {
    const where = includeInactive ? {} : { status: 'ACTIVE' };

    if (includeEntitlements) {
      const plans = await this.prisma.plan.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          planEntitlements: {
            include: { entitlement: true },
          },
        },
      });

      return plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description ?? undefined,
        billingModel: plan.billingModel,
        status: plan.status,
        entitlements: plan.planEntitlements.map((pe) => ({
          code: pe.entitlement.code,
          label: pe.entitlement.label,
          dataType: pe.entitlement.dataType,
          defaultValue: pe.defaultValue,
          unit: pe.entitlement.unit ?? undefined,
        })),
      }));
    }

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? undefined,
      billingModel: plan.billingModel,
      status: plan.status,
    }));
  }

  async listDeploymentRegions(): Promise<DeploymentRegionResponseDto[]> {
    const regions = await this.prisma.deploymentRegion.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    return regions.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      cloudProvider: r.cloudProvider,
      cloudRegion: r.cloudRegion,
      countryCode: r.countryCode,
      status: r.status,
      hostingRegion: `${r.cloudProvider.toLowerCase()}-${r.cloudRegion}`,
    }));
  }
}
