import { Injectable } from '@nestjs/common';
import {
  type OnboardingTemplate,
  type OnboardingTemplateTask,
  type Prisma,
} from '@prisma/client';
import { BaseRepository } from '../../../database/base/base.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { toPrismaSkipTake } from '../../../common/utils/pagination.helper';
import type { ListOnboardingTemplatesDto } from '../dto/list-documents.dto';

export type OnboardingTemplateWithTasks = OnboardingTemplate & {
  tasks: OnboardingTemplateTask[];
};

@Injectable()
export class OnboardingTemplateRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<OnboardingTemplateWithTasks | null> {
    return this.prisma.onboardingTemplate.findFirst({
      where: { id, tenantId },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findMany(
    query: ListOnboardingTemplatesDto,
    tenantId: string,
  ): Promise<{ data: OnboardingTemplate[]; total: number }> {
    const { skip, take } = toPrismaSkipTake(query);

    const where: Prisma.OnboardingTemplateWhereInput = {
      tenantId,
      ...(query.legalEntityId ? { legalEntityId: query.legalEntityId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const orderBy: Prisma.OnboardingTemplateOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: query.sortOrder ?? 'asc' }
        : { createdAt: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.onboardingTemplate.findMany({ where, skip, take, orderBy }),
      this.prisma.onboardingTemplate.count({ where }),
    ]);

    return { data, total };
  }

  async create(
    data: Prisma.OnboardingTemplateCreateInput,
  ): Promise<OnboardingTemplate> {
    return this.prisma.onboardingTemplate.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.OnboardingTemplateUpdateInput,
  ): Promise<OnboardingTemplate> {
    return this.prisma.onboardingTemplate.update({
      where: { id, tenantId },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.onboardingTemplate.delete({ where: { id, tenantId } });
  }

  async createTask(
    data: Prisma.OnboardingTemplateTaskCreateInput,
  ): Promise<OnboardingTemplateTask> {
    return this.prisma.onboardingTemplateTask.create({ data });
  }

  async deleteTask(id: string, tenantId: string): Promise<void> {
    await this.prisma.onboardingTemplateTask.delete({ where: { id, tenantId } });
  }
}
