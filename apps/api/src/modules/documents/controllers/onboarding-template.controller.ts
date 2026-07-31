import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { DOCUMENTS_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { OnboardingTemplateService } from '../services/onboarding-template.service';
import {
  CreateOnboardingTemplateDto,
  UpdateOnboardingTemplateDto,
  CreateOnboardingTemplateTaskDto,
} from '../dto/onboarding-template.dto';
import { ListOnboardingTemplatesDto } from '../dto/list-documents.dto';

@ApiTags('onboarding-templates')
@ApiBearerAuth()
@Controller('onboarding-templates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OnboardingTemplateController {
  constructor(private readonly service: OnboardingTemplateService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_CREATE)
  @ApiOperation({ summary: 'Create an onboarding template' })
  create(
    @Body() dto: CreateOnboardingTemplateDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.tenantId!);
  }

  @Get()
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_READ)
  @ApiOperation({ summary: 'List onboarding templates' })
  findMany(
    @Query() query: ListOnboardingTemplatesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_READ)
  @ApiOperation({ summary: 'Get onboarding template by ID (includes tasks)' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_UPDATE)
  @ApiOperation({ summary: 'Update onboarding template' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOnboardingTemplateDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.update(id, dto, user.userId, user.tenantId!);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_DELETE)
  @ApiOperation({ summary: 'Delete onboarding template' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.delete(id, user.tenantId!);
  }

  @Post(':id/tasks')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_UPDATE)
  @ApiOperation({ summary: 'Add a task to an onboarding template' })
  addTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOnboardingTemplateTaskDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.addTask(id, dto, user.tenantId!);
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_TEMPLATE_UPDATE)
  @ApiOperation({ summary: 'Remove a task from an onboarding template' })
  async deleteTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.deleteTask(id, taskId, user.tenantId!);
  }

  private assertTenant(user: CurrentUserContext): void {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
