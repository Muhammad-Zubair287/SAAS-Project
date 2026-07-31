import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateOnboardingInstanceDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  onboardingTemplateId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateOnboardingInstanceTaskDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20)
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export interface OnboardingInstanceTaskResponseDto {
  id: string;
  tenantId: string;
  onboardingInstanceId: string;
  templateTaskId: string | null;
  title: string;
  taskType: string;
  isRequired: boolean;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface OnboardingInstanceResponseDto {
  id: string;
  tenantId: string;
  employeeId: string;
  onboardingTemplateId: string | null;
  title: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
  tasks?: OnboardingInstanceTaskResponseDto[];
}
