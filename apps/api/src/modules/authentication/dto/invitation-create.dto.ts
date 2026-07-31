import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class InvitationCreateDto {
  @ApiProperty({ example: 'alice@northstar.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email!: string;

  @ApiProperty({ description: 'Tenant to invite the user into' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Role UUIDs to pre-assign (applied by RBAC in Batch 7)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
