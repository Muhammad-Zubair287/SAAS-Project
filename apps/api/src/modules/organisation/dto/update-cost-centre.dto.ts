import { PartialType } from '@nestjs/swagger';
import { CreateCostCentreDto } from './create-cost-centre.dto';

export class UpdateCostCentreDto extends PartialType(CreateCostCentreDto) {}
