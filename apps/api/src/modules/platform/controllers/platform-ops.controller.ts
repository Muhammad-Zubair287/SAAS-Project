import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import { PlatformNotificationsService } from '../services/platform-notifications.service';
import { PlatformSearchService } from '../services/platform-search.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

class AnnouncementDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() linkPath?: string;
}

class PreferencesDto {
  @IsOptional() @IsString() @MaxLength(16) locale?: string;
  @IsOptional() @IsBoolean() notificationEmail?: boolean;
  @IsOptional() @IsBoolean() notificationInApp?: boolean;
  @IsOptional() @IsBoolean() notificationSecurity?: boolean;
}

@ApiTags('Platform — Ops')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform')
export class PlatformOpsController {
  constructor(
    private readonly notifications: PlatformNotificationsService,
    private readonly search: PlatformSearchService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('notifications')
  @RequirePermissions(PLATFORM_PERMISSIONS.NOTIFICATION_READ)
  listNotifications(
    @CurrentUser() actor: PlatformActorContext,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notifications.list(actor.actorId, {
      unreadOnly: unreadOnly === 'true',
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('notifications/unread-count')
  @RequirePermissions(PLATFORM_PERMISSIONS.NOTIFICATION_READ)
  unreadCount(@CurrentUser() actor: PlatformActorContext) {
    return this.notifications.unreadCount(actor.actorId);
  }

  @Post('notifications/:id/read')
  @RequirePermissions(PLATFORM_PERMISSIONS.NOTIFICATION_READ)
  markRead(
    @CurrentUser() actor: PlatformActorContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(actor.actorId, id);
  }

  @Post('notifications/read-all')
  @RequirePermissions(PLATFORM_PERMISSIONS.NOTIFICATION_READ)
  markAll(@CurrentUser() actor: PlatformActorContext) {
    return this.notifications.markAllRead(actor.actorId);
  }

  @Post('announcements')
  @RequirePermissions(PLATFORM_PERMISSIONS.NOTIFICATION_MANAGE)
  @ApiOperation({ summary: 'Broadcast announcement to platform staff' })
  announce(
    @Body() dto: AnnouncementDto,
    @CurrentUser() actor: PlatformActorContext,
  ) {
    return this.notifications.broadcastAnnouncement(actor, dto);
  }

  @Get('search')
  @RequirePermissions(PLATFORM_PERMISSIONS.SEARCH_READ)
  searchQuery(@Query('q') q = '', @Query('limit') limit?: string) {
    return this.search.search(q, limit ? Number(limit) : 8);
  }

  @Get('me/preferences')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  async getPreferences(@CurrentUser() actor: PlatformActorContext) {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId: actor.actorId },
    });
    return {
      locale: pref?.locale ?? 'en',
      notificationEmail: pref?.notificationEmail ?? true,
      notificationInApp: pref?.notificationInApp ?? true,
      notificationSecurity: pref?.notificationSecurity ?? true,
    };
  }

  @Patch('me/preferences')
  @RequirePermissions(PLATFORM_PERMISSIONS.TENANT_READ)
  async putPreferences(
    @CurrentUser() actor: PlatformActorContext,
    @Body() dto: PreferencesDto,
  ) {
    const pref = await this.prisma.userPreference.upsert({
      where: { userId: actor.actorId },
      create: {
        userId: actor.actorId,
        locale: dto.locale ?? 'en',
        notificationEmail: dto.notificationEmail ?? true,
        notificationInApp: dto.notificationInApp ?? true,
        notificationSecurity: dto.notificationSecurity ?? true,
      },
      update: {
        ...(dto.locale != null ? { locale: dto.locale } : {}),
        ...(dto.notificationEmail != null ? { notificationEmail: dto.notificationEmail } : {}),
        ...(dto.notificationInApp != null ? { notificationInApp: dto.notificationInApp } : {}),
        ...(dto.notificationSecurity != null
          ? { notificationSecurity: dto.notificationSecurity }
          : {}),
      },
    });
    return {
      locale: pref.locale,
      notificationEmail: pref.notificationEmail,
      notificationInApp: pref.notificationInApp,
      notificationSecurity: pref.notificationSecurity,
    };
  }
}
