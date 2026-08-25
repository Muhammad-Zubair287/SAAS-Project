import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body refresh is optional for browser clients (cookie preferred).
 * Required for non-browser clients using X-Auth-Transport: body.
 */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token for body-transport clients. Browser clients omit this and use the HttpOnly cookie.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
