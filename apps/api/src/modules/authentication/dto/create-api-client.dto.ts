import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiClientDto {
  @ApiProperty({ description: 'Human-readable name for this API client', maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    description: 'Scope strings granted to this client (e.g. "read:employee:tenant")',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  scopes!: string[];

  @ApiProperty({
    description: 'Optional expiry date-time for the client (ISO-8601 UTC)',
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
