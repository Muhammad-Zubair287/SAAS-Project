import { HttpStatus, Injectable } from '@nestjs/common';
import { type OnboardingTemplate, type OnboardingTemplateTask } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import {
  OnboardingTemplateRepository,
  type OnboardingTemplateWithTasks,
} from '../repositories/onboarding-template.repository';
import type {
  CreateOnboardingTemplateDto,
  UpdateOnboardingTemplateDto,
  CreateOnboardingTemplateTaskDto,
  OnboardingTemplateResponseDto,
  OnboardingTemplateTaskResponseDto,
} from '../dto/onboarding-template.dto';
import type { ListOnboardingTemplatesDto } from '../dto/list-documents.dto';

@Injectable()
export class OnboardingTemplateService {
  constructor(
    private readonly repo: OnboardingTemplateRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateOnboardingTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<OnboardingTemplateResponseDto> {
    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      return tx.onboardingTemplate.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId ?? null,
          name: dto.name,
          description: dto.description ?? null,
          isActive: dto.isActive ?? true,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });
    return this.toDto(created);
  }

  async findMany(
    query: ListOnboardingTemplatesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<OnboardingTemplateResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((d) => this.toDto(d)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<OnboardingTemplateResponseDto> {
    const record = await this.repo.findById(id, tenantId);
    if (!record) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND,
        message: 'Onboarding template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDtoWithTasks(record);
  }

  async update(
    id: string,
    dto: UpdateOnboardingTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<OnboardingTemplateResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND,
        message: 'Onboarding template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const updated = await this.repo.update(id, tenantId, { ...dto, updatedBy: userId });
    return this.toDto(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND,
        message: 'Onboarding template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    await this.repo.delete(id, tenantId);
  }

  async addTask(
    templateId: string,
    dto: CreateOnboardingTemplateTaskDto,
    tenantId: string,
  ): Promise<OnboardingTemplateTaskResponseDto> {
    const template = await this.repo.findById(templateId, tenantId);
    if (!template) {
      throw new AppException({
        code: ERROR_CODES.ONBOARDING_TEMPLATE_NOT_FOUND,
        message: 'Onboarding template not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const task = await this.repo.createTask({
      tenant: { connect: { id: tenantId } },
      onboardingTemplate: { connect: { id: templateId } },
      title: dto.title,
      description: dto.description ?? null,
      taskType: dto.taskType,
      sortOrder: dto.sortOrder ?? 0,
      isRequired: dto.isRequired ?? true,
      dueDays: dto.dueDays ?? null,
    });
    return this.toTaskDto(task);
  }

  async deleteTask(
    templateId: string,
    taskId: string,
    tenantId: string,
  ): Promise<void> {
    await this.repo.deleteTask(taskId, tenantId);
  }

  private toDto(r: OnboardingTemplate): OnboardingTemplateResponseDto {
    return {
      id: r.id,
      tenantId: r.tenantId,
      legalEntityId: r.legalEntityId,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      rowVersion: r.rowVersion.toString(),
    };
  }

  private toDtoWithTasks(r: OnboardingTemplateWithTasks): OnboardingTemplateResponseDto {
    return {
      ...this.toDto(r),
      tasks: r.tasks.map((t) => this.toTaskDto(t)),
    };
  }

  private toTaskDto(t: OnboardingTemplateTask): OnboardingTemplateTaskResponseDto {
    return {
      id: t.id,
      tenantId: t.tenantId,
      onboardingTemplateId: t.onboardingTemplateId,
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      sortOrder: t.sortOrder,
      isRequired: t.isRequired,
      dueDays: t.dueDays,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
