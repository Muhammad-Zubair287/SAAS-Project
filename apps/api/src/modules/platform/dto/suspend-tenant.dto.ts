import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class SuspendTenantDto {
  @ApiProperty({
    description: 'Business reason for suspension. Stored in audit log.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Message displayed to tenant users upon login.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userMessage?: string;

  @ApiPropertyOptional({
    description: 'TOTP or backup MFA code required when MFA is enrolled (always in production).',
    minLength: 6,
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @Length(6, 32)
  mfaCode?: string;
}

export class RestoreTenantDto {
  @ApiProperty({
    description: 'Business reason for restoring the tenant.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'TOTP or backup MFA code required when MFA is enrolled (always in production).',
    minLength: 6,
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @Length(6, 32)
  mfaCode?: string;
}
