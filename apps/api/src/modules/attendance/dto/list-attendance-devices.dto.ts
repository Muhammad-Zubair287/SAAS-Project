import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const DEVICE_SORT_FIELDS = ['name', 'createdAt', 'lastSeenAt'] as const;

export class ListAttendanceDevicesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @ApiPropertyOptional({ description: 'Matches name, serial number, vendor, or model' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: DEVICE_SORT_FIELDS })
  @IsIn(DEVICE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof DEVICE_SORT_FIELDS)[number];
}
