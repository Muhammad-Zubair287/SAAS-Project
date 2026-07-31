import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentRequestItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  documentTemplateId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateDocumentRequestDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: [DocumentRequestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentRequestItemDto)
  items?: DocumentRequestItemDto[];
}

export class UpdateDocumentRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class UpdateDocumentRequestItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export interface DocumentRequestItemResponseDto {
  id: string;
  tenantId: string;
  documentRequestId: string;
  documentTemplateId: string | null;
  title: string;
  isRequired: boolean;
  employeeDocumentId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRequestResponseDto {
  id: string;
  tenantId: string;
  employeeId: string;
  requestedBy: string;
  title: string;
  message: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
  items?: DocumentRequestItemResponseDto[];
}
