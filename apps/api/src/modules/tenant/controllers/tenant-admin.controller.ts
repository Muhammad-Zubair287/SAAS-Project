import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { TENANT_ADMIN_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { TenantAdminService } from '../services/tenant-admin.service';
import {
  CreateUpgradeRequestDto,
  UpdateTenantBrandingDto,
  UpdateTenantProfileDto,
  UpdateTenantRegionalDto,
  UpdateTenantSecurityPolicyDto,
} from '../dto/tenant-admin.dto';

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantAdminController {
  constructor(private readonly service: TenantAdminService) {}

  @Get('profile')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.PROFILE_READ)
  @ApiOperation({ summary: 'Get company profile (SCR-TEN-02)' })
  getProfile(@CurrentUser() user: CurrentUserContext) {
    return this.service.getProfile(this.requireTenant(user));
  }

  @Patch('profile')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.PROFILE_MANAGE)
  @ApiOperation({ summary: 'Update company profile' })
  updateProfile(
    @Body() dto: UpdateTenantProfileDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.updateProfile(
      this.requireTenant(user),
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Get('branding')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.BRANDING_READ)
  @ApiOperation({ summary: 'Get tenant branding (SCR-TEN-03)' })
  getBranding(@CurrentUser() user: CurrentUserContext) {
    return this.service.getBranding(this.requireTenant(user));
  }

  @Put('branding')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.BRANDING_MANAGE)
  @ApiOperation({ summary: 'Upsert tenant branding' })
  upsertBranding(
    @Body() dto: UpdateTenantBrandingDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.upsertBranding(
      this.requireTenant(user),
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Post('branding/logo')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.BRANDING_MANAGE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        kind: { type: 'string', enum: ['logo', 'loginLogo', 'favicon'] },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload branding logo image' })
  uploadLogo(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Query('kind') kind: 'logo' | 'loginLogo' | 'favicon' = 'logo',
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.uploadLogo(
      this.requireTenant(user),
      file,
      kind === 'loginLogo' || kind === 'favicon' ? kind : 'logo',
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Get('regional')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Get regional settings (SCR-TEN-04)' })
  getRegional(@CurrentUser() user: CurrentUserContext) {
    return this.service.getRegional(this.requireTenant(user));
  }

  @Put('regional')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update regional settings' })
  updateRegional(
    @Body() dto: UpdateTenantRegionalDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.updateRegional(
      this.requireTenant(user),
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Get('modules')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.MODULES_READ)
  @ApiOperation({ summary: 'List module entitlements (SCR-TEN-06)' })
  getModules(@CurrentUser() user: CurrentUserContext) {
    return this.service.getModules(this.requireTenant(user));
  }

  @Get('setup-status')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Setup checklist progress (SCR-TEN-01 / SCR-SET-01)' })
  getSetupStatus(@CurrentUser() user: CurrentUserContext) {
    return this.service.getSetupStatus(this.requireTenant(user));
  }

  @Get('subscription')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'Subscription overview (SCR-SUB-01)' })
  getSubscription(@CurrentUser() user: CurrentUserContext) {
    return this.service.getSubscription(this.requireTenant(user));
  }

  @Get('usage')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'Usage details (SCR-SUB-04)' })
  getUsage(@CurrentUser() user: CurrentUserContext) {
    return this.service.getUsage(this.requireTenant(user));
  }

  @Post('upgrade-requests')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.UPGRADE_REQUEST)
  @ApiOperation({ summary: 'Request plan upgrade (SCR-SUB-03)' })
  createUpgradeRequest(
    @Body() dto: CreateUpgradeRequestDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.createUpgradeRequest(
      this.requireTenant(user),
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  @Get('upgrade-requests')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'List upgrade requests for current tenant' })
  listUpgradeRequests(@CurrentUser() user: CurrentUserContext) {
    return this.service.listUpgradeRequests(this.requireTenant(user));
  }

  @Get('security-policy')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SECURITY_POLICY_READ)
  @ApiOperation({ summary: 'Get security policy (SCR-AUD-05 MVP)' })
  getSecurityPolicy(@CurrentUser() user: CurrentUserContext) {
    return this.service.getSecurityPolicy(this.requireTenant(user));
  }

  @Put('security-policy')
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.SECURITY_POLICY_MANAGE)
  @ApiOperation({ summary: 'Update security policy' })
  updateSecurityPolicy(
    @Body() dto: UpdateTenantSecurityPolicyDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.updateSecurityPolicy(
      this.requireTenant(user),
      dto,
      { userId: user.userId, email: user.email },
      correlationId,
    );
  }

  private requireTenant(user: CurrentUserContext): string {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.TENANT_MEMBERSHIP_REQUIRED,
        message: 'Tenant context is required.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    return user.tenantId;
  }
}
