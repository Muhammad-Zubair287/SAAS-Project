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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { EMPLOYEE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { EmployeeLifecycleService } from '../services/employee-lifecycle.service';
import {
  ChangeEmployeeStatusDto,
  CreateCompensationDto,
  CreateEmergencyContactDto,
  StartEmployeeImportDto,
  TransferEmployeeDto,
  UpdateEmergencyContactDto,
} from '../dto/employee-lifecycle.dto';

@ApiTags('employees-lifecycle')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeeLifecycleController {
  constructor(private readonly service: EmployeeLifecycleService) {}

  @Get('employees/data-quality')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_QUALITY_READ)
  @ApiOperation({ summary: 'Employee data-quality summary (SCR-EMP-10)' })
  dataQuality(@CurrentUser() user: CurrentUserContext) {
    this.assertTenant(user);
    return this.service.getDataQuality(user.tenantId!);
  }

  @Get('employees/:id/employment')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYMENT_READ)
  @ApiOperation({ summary: 'Get current employment record' })
  getEmployment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.getCurrentEmployment(id, user.tenantId!);
  }

  @Get('employees/:id/employment-history')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYMENT_READ)
  @ApiOperation({ summary: 'List employment history' })
  employmentHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.listEmploymentHistory(id, user.tenantId!);
  }

  @Post('employees/:id/transfers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_TRANSFER)
  @ApiOperation({ summary: 'Schedule/apply employee transfer (SCR-EMP-06)' })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferEmployeeDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.transfer(
      id,
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
  }

  @Post('employees/:id/status-changes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_STATUS_CHANGE)
  @ApiOperation({ summary: 'Change employee status (SCR-EMP-07)' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeEmployeeStatusDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.changeStatus(
      id,
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
  }

  @Get('employees/:id/history')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_HISTORY_READ)
  @ApiOperation({ summary: 'Employee timeline (SCR-EMP-08)' })
  timeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.getTimeline(id, user.tenantId!);
  }

  @Get('employees/:id/compensation')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.COMPENSATION_READ)
  @ApiOperation({ summary: 'List compensation history' })
  listCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.listCompensation(id, user.tenantId!);
  }

  @Post('employees/:id/compensation')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.COMPENSATION_UPDATE)
  @ApiOperation({ summary: 'Add compensation record' })
  addCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCompensationDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.addCompensation(
      id,
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
  }

  @Get('employees/:id/emergency-contacts')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.PERSONAL_DETAIL_READ)
  @ApiOperation({ summary: 'List emergency contacts' })
  listEmergency(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.listEmergencyContacts(id, user.tenantId!);
  }

  @Post('employees/:id/emergency-contacts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.PERSONAL_DETAIL_UPDATE)
  @ApiOperation({ summary: 'Create emergency contact' })
  createEmergency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmergencyContactDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.createEmergencyContact(id, dto, user.tenantId!);
  }

  @Patch('employees/:id/emergency-contacts/:contactId')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.PERSONAL_DETAIL_UPDATE)
  @ApiOperation({ summary: 'Update emergency contact' })
  updateEmergency(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateEmergencyContactDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.updateEmergencyContact(id, contactId, dto, user.tenantId!);
  }

  @Delete('employees/:id/emergency-contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.PERSONAL_DETAIL_UPDATE)
  @ApiOperation({ summary: 'Delete emergency contact' })
  async deleteEmergency(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.deleteEmergencyContact(id, contactId, user.tenantId!);
  }

  @Post('imports/employees')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_IMPORT)
  @ApiOperation({ summary: 'Start employee import validation (SCR-EMP-09)' })
  startImport(
    @Body() dto: StartEmployeeImportDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.startImport(dto, user.userId, user.tenantId!);
  }

  @Get('imports/:importId')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_IMPORT)
  @ApiOperation({ summary: 'Get import job status' })
  getImport(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.getImport(importId, user.tenantId!);
  }

  @Post('imports/:importId/commit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_IMPORT)
  @ApiOperation({ summary: 'Commit validated employee import' })
  commitImport(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.commitImport(
      importId,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
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
