import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Northstar Textiles Group', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Northstar Textiles Group (Pvt) Ltd', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  seatLimit?: number;
}
