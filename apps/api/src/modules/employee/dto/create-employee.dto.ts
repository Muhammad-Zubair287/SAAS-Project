import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT  = 'CONTRACT',
  INTERN    = 'INTERN',
}

export enum EmployeeGender {
  MALE        = 'MALE',
  FEMALE      = 'FEMALE',
  OTHER       = 'OTHER',
  UNDISCLOSED = 'UNDISCLOSED',
}

export class CreateEmployeeDto {
  @ApiProperty()
  @IsUUID()
  legalEntityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(EmployeeGender)
  gender?: EmployeeGender;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  emailWork!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  emailPersonal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneWork?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneMobile?: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  hireDate!: string;

  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;
}
