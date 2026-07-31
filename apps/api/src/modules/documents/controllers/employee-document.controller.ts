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
import { DOCUMENTS_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { EmployeeDocumentService } from '../services/employee-document.service';
import { CreateEmployeeDocumentDto, UpdateEmployeeDocumentDto } from '../dto/employee-document.dto';
import { ListDocumentsDto } from '../dto/list-documents.dto';

@ApiTags('employee-documents')
@ApiBearerAuth()
@Controller('employees/:employeeId/documents')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeeDocumentController {
  constructor(private readonly service: EmployeeDocumentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_CREATE)
  @ApiOperation({ summary: 'Upload/create a document for an employee' })
  create(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateEmployeeDocumentDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.create(employeeId, dto, user.userId, user.tenantId!);
  }

  @Get()
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_READ)
  @ApiOperation({ summary: 'List documents for an employee' })
  findMany(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: ListDocumentsDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!, employeeId);
  }

  @Get(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_READ)
  @ApiOperation({ summary: 'Get employee document by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_UPDATE)
  @ApiOperation({ summary: 'Update employee document (ETag optimistic concurrency)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDocumentDto,
    @CurrentUser() user: CurrentUserContext,
    @Headers('if-match') ifMatch?: string,
  ) {
    this.assertTenant(user);
    return this.service.update(id, dto, user.userId, user.tenantId!, ifMatch);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_DELETE)
  @ApiOperation({ summary: 'Delete employee document' })
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
