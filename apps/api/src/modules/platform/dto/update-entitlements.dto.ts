import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class EntitlementOverrideDto {
  @ApiProperty({ example: 'max_employees', description: 'Entitlement key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  key!: string;

  @ApiProperty({ example: '1000', description: 'String-encoded value' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  value!: string;
}

export class UpdateEntitlementsDto {
  @ApiProperty({ type: [EntitlementOverrideDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EntitlementOverrideDto)
  entitlements!: EntitlementOverrideDto[];
}
