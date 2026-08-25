import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../../common/enums/platform.enum';

export class PrimaryAdminInvitationDto {
  @ApiProperty() email!: string;
  @ApiProperty({ example: 'PENDING' }) status!: string;
  @ApiProperty() expiresAt!: string;
}

export class TenantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() legalName!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty() baseCurrency!: string;
  @ApiProperty() defaultTimezone!: string;
  @ApiProperty() defaultLocale!: string;
  @ApiProperty() deploymentRegionId!: string;
  @ApiPropertyOptional() deploymentRegionCode?: string;
  @ApiPropertyOptional() deploymentRegionName?: string;
  @ApiPropertyOptional() planId!: string | null;
  @ApiPropertyOptional() planKey?: string | null;
  @ApiPropertyOptional() planName?: string | null;
  @ApiPropertyOptional() seatLimit!: number | null;
  @ApiPropertyOptional({ description: 'Configured storage limit in GB from tenant entitlement or plan catalogue.' })
  storageLimitGb?: number | null;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;
  @ApiPropertyOptional() activatedAt?: string;
  @ApiPropertyOptional() suspendedAt?: string;
  @ApiPropertyOptional() suspendedReason?: string;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() createdBy?: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty() rowVersion!: string;
  @ApiPropertyOptional({ type: PrimaryAdminInvitationDto })
  primaryAdminInvitation?: PrimaryAdminInvitationDto;
  @ApiPropertyOptional({ type: [PrimaryAdminInvitationDto] })
  administrators?: PrimaryAdminInvitationDto[];
  @ApiPropertyOptional() trialEndsAt?: string | null;
  @ApiPropertyOptional() currentPeriodEnd?: string | null;
  @ApiPropertyOptional() subscriptionStatus?: string | null;
  @ApiPropertyOptional() billingCycle?: string | null;
  @ApiPropertyOptional() lastActivityAt?: string | null;
}

export class TenantSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() countryCode!: string;
  @ApiPropertyOptional() planId!: string | null;
  @ApiPropertyOptional() planKey?: string | null;
  @ApiPropertyOptional() planName?: string | null;
  @ApiPropertyOptional() regionName?: string | null;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;
  @ApiPropertyOptional() seatLimit!: number | null;
  @ApiPropertyOptional() activeEmployees?: number | null;
  @ApiPropertyOptional() trialEndsAt?: string | null;
  @ApiPropertyOptional() currentPeriodEnd?: string | null;
  @ApiPropertyOptional() subscriptionStatus?: string | null;
  @ApiProperty() createdAt!: string;
}

export class TenantUsageDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty() activeEmployees!: number;
  @ApiProperty() totalEmployees!: number;
  @ApiPropertyOptional() seatLimit!: number | null;
  @ApiProperty() seatUtilisationPct!: number;
  @ApiProperty() storageUsedBytes!: string;
  @ApiPropertyOptional({ description: 'Configured storage limit in GB. Runtime used-bytes come from usage snapshots; null when no catalogue/override exists.' })
  storageLimitGb?: number | null;
  @ApiProperty() apiCallsMonth!: number;
  @ApiPropertyOptional() snapshotDate?: string;
}

export class SupportGrantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() supportUserId!: string;
  @ApiProperty() requestedByUserId!: string;
  @ApiPropertyOptional() approvedByUserId?: string;
  @ApiProperty() scope!: string[];
  @ApiProperty() reason!: string;
  @ApiProperty() startsAt!: string;
  @ApiProperty() endsAt!: string;
  @ApiPropertyOptional() revokedAt?: string;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() createdBy?: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional() updatedBy?: string;
  @ApiProperty() rowVersion!: string;
}
