import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSupportGrantDto {
  @ApiProperty({ description: 'Platform support engineer user ID (UUID)' })
  @IsUUID()
  supportUserId!: string;

  @ApiProperty({
    description: 'Business reason for the support access.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(2000)
  reason!: string;

  @ApiProperty({
    description: 'Scoped tenant areas the support engineer may access.',
    example: ['attendance', 'payroll'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  scope!: string[];

  @ApiProperty({ description: 'Access start timestamp (ISO 8601 UTC)', example: '2026-08-01T00:00:00Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ description: 'Hard access expiry (ISO 8601 UTC, max 24 h from startsAt)', example: '2026-08-01T08:00:00Z' })
  @IsDateString()
  endsAt!: string;
}

export class RevokeSupportGrantDto {
  @ApiPropertyOptional({ description: 'Reason for early revocation', maxLength: 500 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
