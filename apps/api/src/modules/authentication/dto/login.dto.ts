import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'alice@northstar.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email!: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    required: false,
    description: 'Tenant UUID. Omit for platform-staff logins.',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
