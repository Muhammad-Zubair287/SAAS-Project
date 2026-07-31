import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class ChangePlanDto {
  @ApiProperty({ example: 'enterprise', description: 'Target plan key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  planKey!: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  seatLimit?: number;

  @ApiPropertyOptional({ example: 'annual', enum: ['monthly', 'annual'] })
  @IsOptional()
  @IsString()
  @Matches(/^(monthly|annual)$/, { message: 'billingCycle must be monthly or annual' })
  billingCycle?: string;

  @ApiProperty({ description: 'Business reason for plan change.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
