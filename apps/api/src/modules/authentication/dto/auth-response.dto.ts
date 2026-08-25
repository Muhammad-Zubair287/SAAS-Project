import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiPropertyOptional({
    description:
      'Present only for body-transport API clients (X-Auth-Transport: body). Browser clients receive the refresh token via HttpOnly cookie only.',
  })
  refreshToken?: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds', example: 900 })
  expiresIn!: number;

  @ApiProperty()
  sessionId!: string;
}
