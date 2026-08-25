import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class InvitationCreateDto {
  @ApiProperty({ example: 'alice@northstar.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email!: string;

  @ApiProperty({ description: 'Tenant to invite the user into (ignored when JWT has tenantId)' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({
    required: false,
    example: 'Alice Khan',
    description: 'Optional display name for the invited user account',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Role UUIDs to assign when the invitation is accepted',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
