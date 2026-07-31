import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ListAttendancePoliciesDto {
  @ApiPropertyOptional() @IsUUID() @IsOptional() legalEntityId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() branchId?: string;
  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean() @IsOptional() isCurrentOnly?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() sortOrder?: 'asc' | 'desc';
}
