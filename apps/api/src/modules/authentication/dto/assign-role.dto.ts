import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'ID of the user to assign the role to' })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: 'Optional expiry date-time for time-bounded delegation (ISO-8601 UTC)',
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
