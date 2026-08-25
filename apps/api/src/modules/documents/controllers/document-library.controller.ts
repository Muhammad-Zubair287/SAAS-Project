import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { DOCUMENTS_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { EmployeeDocumentService } from '../services/employee-document.service';
import { OnboardingDashboardService } from '../services/onboarding-dashboard.service';
import { ListDocumentsDto } from '../dto/list-documents.dto';

class ReviewDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class RejectDocumentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DocumentLibraryController {
  constructor(
    private readonly documents: EmployeeDocumentService,
    private readonly onboardingDashboard: OnboardingDashboardService,
  ) {}

  @Get('documents')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_READ)
  @ApiOperation({ summary: 'Document library (SCR-DOC-01)' })
  library(
    @Query() query: ListDocumentsDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.documents.findMany(query, user.tenantId!, query.employeeId);
  }

  @Post('documents/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_APPROVE)
  @ApiOperation({ summary: 'Approve document (SCR-DOC-03)' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.documents.approve(id, user.userId, user.tenantId!, dto.notes);
  }

  @Post('documents/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_APPROVE)
  @ApiOperation({ summary: 'Reject document (SCR-DOC-03)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.documents.reject(id, user.userId, user.tenantId!, dto.reason);
  }

  @Get('onboarding/dashboard')
  @RequirePermissions(DOCUMENTS_PERMISSIONS.ONBOARDING_DASHBOARD_READ)
  @ApiOperation({ summary: 'Onboarding dashboard (SCR-ONB-01)' })
  getOnboardingDashboard(@CurrentUser() user: CurrentUserContext) {
    this.assertTenant(user);
    return this.onboardingDashboard.getDashboard(user.tenantId!);
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
