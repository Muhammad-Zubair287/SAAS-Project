import {
  Body,
  Controller,
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
import { DOCUMENTS_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { DocumentRequestService } from '../services/document-request.service';
import {
  CreateDocumentRequestDto,
  UpdateDocumentRequestDto,
  UpdateDocumentRequestItemDto,
} from '../dto/document-request.dto';
import { ListDocumentRequestsDto } from '../dto/list-documents.dto';

@ApiTags('document-requests')
@ApiBearerAuth()
@Controller('document-requests')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DocumentRequestController {
  constructor(private readonly service: DocumentRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_REQUEST_CREATE)
  @ApiOperation({ summary: 'Create a document request for an employee' })
  create(
    @Body() dto: CreateDocumentRequestDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.tenantId!);
  }

  @Get()
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_REQUEST_READ)
  @ApiOperation({ summary: 'List document requests' })
  findMany(
    @Query() query: ListDocumentRequestsDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_REQUEST_READ)
  @ApiOperation({ summary: 'Get document request by ID (includes items)' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_REQUEST_UPDATE)
  @ApiOperation({ summary: 'Update document request status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentRequestDto,
    @CurrentUser() user: CurrentUserContext,
    @Headers('if-match') ifMatch?: string,
  ) {
    this.assertTenant(user);
    return this.service.update(id, dto, user.tenantId!, ifMatch);
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.DOCUMENT_REQUEST_UPDATE)
  @ApiOperation({ summary: 'Update a document request item (link uploaded document, change status)' })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateDocumentRequestItemDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.updateItem(id, itemId, dto, user.tenantId!);
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
