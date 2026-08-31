import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { OTP_CODE_PATTERN } from '../../../common/validation/input-security.constants';
import { trimOptionalString, trimString } from '../../../common/validation/sanitize.transform';
import { IsSafeText } from '../../../common/validation/validators';

export class SuspendTenantDto {
  @ApiProperty({
    description: 'Business reason for suspension. Stored in audit log.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  @IsSafeText()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Message displayed to tenant users upon login.',
    maxLength: 500,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsSafeText()
  userMessage?: string;

  @ApiPropertyOptional({
    description: 'TOTP or backup MFA code required when MFA is enrolled (always in production).',
    minLength: 6,
    maxLength: 8,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Matches(OTP_CODE_PATTERN, { message: 'mfaCode must be 6 to 8 digits' })
  mfaCode?: string;
}

export class RestoreTenantDto {
  @ApiProperty({
    description: 'Business reason for restoring the tenant.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  @IsSafeText()
  reason!: string;

  @ApiPropertyOptional({
    description: 'TOTP or backup MFA code required when MFA is enrolled (always in production).',
    minLength: 6,
    maxLength: 8,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Matches(OTP_CODE_PATTERN, { message: 'mfaCode must be 6 to 8 digits' })
  mfaCode?: string;
}
