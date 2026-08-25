import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import {
  PlatformSettingsService,
  type SettingDomain,
} from '../services/platform-settings.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

class PutSettingsDto {
  @IsObject()
  value!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  rowVersion?: string;
}

const DOMAINS: SettingDomain[] = [
  'general',
  'security',
  'retention',
  'notifications',
  'integrations',
  'audit',
];

@ApiTags('Platform — Configuration')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform')
export class PlatformConfigController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get('config/:domain')
  @RequirePermissions(PLATFORM_PERMISSIONS.CONFIG_READ)
  @ApiOperation({ summary: 'Get platform settings by domain' })
  async getDomain(@Param('domain') domain: string) {
    this.assertDomain(domain);
    return this.settings.getDomain(domain as SettingDomain);
  }

  @Put('config/:domain')
  @RequirePermissions(PLATFORM_PERMISSIONS.CONFIG_MANAGE)
  @ApiOperation({ summary: 'Update platform settings by domain' })
  async putDomain(
    @Param('domain') domain: string,
    @Body() dto: PutSettingsDto,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    this.assertDomain(domain);
    return this.settings.putDomain(
      domain as SettingDomain,
      dto.value,
      actor,
      correlationId,
      dto.rowVersion ?? ifMatch,
    );
  }

  @Get('config')
  @RequirePermissions(PLATFORM_PERMISSIONS.CONFIG_READ)
  @ApiOperation({ summary: 'List all platform setting domains' })
  async listAll() {
    return Promise.all(DOMAINS.map((d) => this.settings.getDomain(d)));
  }

  private assertDomain(domain: string): void {
    if (!DOMAINS.includes(domain as SettingDomain)) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Unknown settings domain: ${domain}`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
