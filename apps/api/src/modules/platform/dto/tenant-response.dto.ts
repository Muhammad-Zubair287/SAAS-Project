import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../../common/enums/platform.enum';

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
  @ApiPropertyOptional() planId!: string | null;
  @ApiPropertyOptional() seatLimit!: number | null;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;
  @ApiPropertyOptional() activatedAt?: string;
  @ApiPropertyOptional() suspendedAt?: string;
  @ApiPropertyOptional() suspendedReason?: string;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() createdBy?: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty() rowVersion!: string;
}

export class TenantSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() countryCode!: string;
  @ApiPropertyOptional() planId!: string | null;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;
  @ApiPropertyOptional() seatLimit!: number | null;
  @ApiProperty() createdAt!: string;
}

export class TenantUsageDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty() activeEmployees!: number;
  @ApiProperty() totalEmployees!: number;
  @ApiPropertyOptional() seatLimit!: number | null;
  @ApiProperty() seatUtilisationPct!: number;
  @ApiProperty() storageUsedBytes!: string;
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
