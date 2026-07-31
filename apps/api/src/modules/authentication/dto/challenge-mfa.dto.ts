import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChallengeMfaDto {
  @ApiProperty({ description: 'Short-lived MFA challenge token returned from login' })
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @ApiProperty({ description: 'Six-digit TOTP code or 9-char backup code (XXXX-XXXX)' })
  @IsString()
  @MinLength(6)
  code!: string;
}
