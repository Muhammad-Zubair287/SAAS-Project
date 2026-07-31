import {
  Body,
  Controller,
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
import { OnboardingInstanceService } from '../services/onboarding-instance.service';
import {
  CreateOnboardingInstanceDto,
  UpdateOnboardingInstanceTaskDto,
} from '../dto/onboarding-instance.dto';
import { ListOnboardingInstancesDto } from '../dto/list-documents.dto';

@ApiTags('onboarding-instances')
@ApiBearerAuth()
@Controller('onboarding-instances')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OnboardingInstanceController {
  constructor(private readonly service: OnboardingInstanceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_INSTANCE_CREATE)
  @ApiOperation({ summary: 'Start an onboarding instance for an employee' })
  create(
    @Body() dto: CreateOnboardingInstanceDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.tenantId!);
  }

  @Get()
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_INSTANCE_READ)
  @ApiOperation({ summary: 'List onboarding instances' })
  findMany(
    @Query() query: ListOnboardingInstancesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_INSTANCE_READ)
  @ApiOperation({ summary: 'Get onboarding instance by ID (includes tasks)' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_INSTANCE_UPDATE)
  @ApiOperation({ summary: 'Update the status of an onboarding task' })
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateOnboardingInstanceTaskDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.updateTask(id, taskId, dto, user.userId, user.tenantId!);
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
