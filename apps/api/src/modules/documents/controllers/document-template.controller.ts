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
import { DocumentTemplateService } from '../services/document-template.service';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from '../dto/document-template.dto';
import { ListDocumentsDto } from '../dto/list-documents.dto';

@ApiTags('document-templates')
@ApiBearerAuth()
@Controller('document-templates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DocumentTemplateController {
  constructor(private readonly service: DocumentTemplateService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_TEMPLATE_CREATE)
  @ApiOperation({ summary: 'Create a document template' })
  create(
    @Body() dto: CreateDocumentTemplateDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.tenantId!);
  }

  @Get()
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_TEMPLATE_READ)
  @ApiOperation({ summary: 'List document templates (paginated, filterable)' })
  findMany(
    @Query() query: ListDocumentsDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_TEMPLATE_READ)
  @ApiOperation({ summary: 'Get document template by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_TEMPLATE_UPDATE)
  @ApiOperation({ summary: 'Update document template' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTemplateDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.update(id, dto, user.userId, user.tenantId!);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_TEMPLATE_DELETE)
  @ApiOperation({ summary: 'Delete document template' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.delete(id, user.tenantId!);
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
