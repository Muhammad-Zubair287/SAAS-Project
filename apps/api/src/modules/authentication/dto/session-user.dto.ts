import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionUserDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  tenantId!: string | null;

  @ApiProperty({ enum: ['tenant', 'platform'] })
  scope!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  platformRole!: string | null;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({
    type: [String],
    description: 'Effective permissions from AuthorizationService (UX hint; backend remains authoritative)',
  })
  permissions!: string[];

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  mfaEnabled!: boolean;
}
