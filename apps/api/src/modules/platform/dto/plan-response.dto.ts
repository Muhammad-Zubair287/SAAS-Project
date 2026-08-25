import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EntitlementSummaryDto {
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty() dataType!: string;
  @ApiProperty() defaultValue!: unknown;
  @ApiPropertyOptional() unit?: string;
}

export class PlanResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() billingModel!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ type: [EntitlementSummaryDto] })
  entitlements?: EntitlementSummaryDto[];
}

export class DeploymentRegionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() cloudProvider!: string;
  @ApiProperty() cloudRegion!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty() status!: string;
}

export class PlatformUsageSummaryDto {
  @ApiProperty() totalSeatLimit!: number;
  @ApiProperty() totalActiveEmployees!: number;
  @ApiProperty() seatUtilisationPct!: number;
  @ApiProperty() tenantsWithUsageData!: number;
}

export class PlatformDashboardStatsDto {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() trial!: number;
  @ApiProperty() draft!: number;
  @ApiProperty() suspended!: number;
  @ApiProperty() closed!: number;
  @ApiProperty() grace!: number;
  @ApiProperty() trialsEndingSoon!: number;
  @ApiProperty() activeSupportGrants!: number;
}
