import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'New password to set', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newPassword!: string;
}
