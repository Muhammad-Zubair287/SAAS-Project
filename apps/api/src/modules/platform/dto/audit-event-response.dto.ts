import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AuditEventResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() tenantId?: string;
  @ApiPropertyOptional() tenantDisplayName?: string;
  @ApiProperty() actorId!: string;
  @ApiProperty() actorType!: string;
  @ApiPropertyOptional() actorEmail?: string;
  @ApiProperty() module!: string;
  @ApiProperty() action!: string;
  @ApiProperty() resourceType!: string;
  @ApiPropertyOptional() resourceId?: string;
  @ApiProperty() correlationId!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() occurredAt!: string;
}

export class ListAuditEventsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  toDate?: string;
}
