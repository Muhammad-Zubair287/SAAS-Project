import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds', example: 900 })
  expiresIn!: number;

  @ApiProperty()
  sessionId!: string;
}
