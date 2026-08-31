import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseDto } from './auth-response.dto';

/** POST /auth/invitations/accept — session plus safe tenant login routing hints. */
export class InvitationAcceptResponseDto extends AuthResponseDto {
  @ApiProperty({
    description: 'Public tenant slug for tenant-specific login URLs.',
    example: 'northstar-textiles',
  })
  tenantSlug!: string;

  @ApiProperty({
    description: 'Canonical tenant login path (no host, no secrets).',
    example: '/t/northstar-textiles/login',
  })
  tenantLoginPath!: string;
}
