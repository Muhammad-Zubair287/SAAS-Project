import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { ORGANISATION_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { LegalEntityService } from '../services/legal-entity.service';
import { CreateLegalEntityDto } from '../dto/create-legal-entity.dto';
import { UpdateLegalEntityDto } from '../dto/update-legal-entity.dto';
import { ListLegalEntitiesDto } from '../dto/list-legal-entities.dto';

@ApiTags('organisation')
@ApiBearerAuth()
@Controller('legal-entities')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LegalEntityController {
  constructor(private readonly service: LegalEntityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ORGANISATION_PERMISSIONS.LEGAL_ENTITY_CREATE)
  @ApiOperation({ summary: 'Create a legal entity' })
  create(
    @Body() dto: CreateLegalEntityDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.email, user.tenantId!, correlationId);
  }

  @Get()
  @RequirePermissions(ORGANISATION_PERMISSIONS.LEGAL_ENTITY_READ)
  @ApiOperation({ summary: 'List legal entities' })
  findMany(
    @Query() query: ListLegalEntitiesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(ORGANISATION_PERMISSIONS.LEGAL_ENTITY_READ)
  @ApiOperation({ summary: 'Get legal entity by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @RequirePermissions(ORGANISATION_PERMISSIONS.LEGAL_ENTITY_UPDATE)
  @ApiOperation({ summary: 'Update legal entity (ETag optimistic concurrency)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalEntityDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    this.assertTenant(user);
    return this.service.update(id, dto, user.userId, user.email, user.tenantId!, correlationId, ifMatch);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(ORGANISATION_PERMISSIONS.LEGAL_ENTITY_DELETE)
  @ApiOperation({ summary: 'Deactivate legal entity (soft delete)' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.deactivate(id, user.userId, user.email, user.tenantId!, correlationId);
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
