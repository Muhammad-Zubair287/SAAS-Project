import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AcknowledgePolicyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  policyKey!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  policyTitle!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  policyVersion!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeDocumentId?: string;
}
