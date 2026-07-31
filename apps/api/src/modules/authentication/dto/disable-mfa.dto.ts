import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class DisableMfaDto {
  @ApiProperty({ description: 'Current account password' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ description: 'Six-digit TOTP code to confirm identity', example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
