import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InvitationAcceptDto {
  @ApiProperty({ description: 'Invitation token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'Initial password to set for the account', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
