import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class PublishPayslipDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payrollVersionId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  periodLabel!: string;

  @ApiProperty()
  @IsISO8601()
  periodStart!: string;

  @ApiProperty()
  @IsISO8601()
  periodEnd!: string;

  @ApiProperty()
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  grossAmount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  netAmount!: number;

  @ApiProperty({ type: Array })
  @IsArray()
  earnings!: unknown[];

  @ApiProperty({ type: Array })
  @IsArray()
  deductions!: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentFileKey?: string;
}
