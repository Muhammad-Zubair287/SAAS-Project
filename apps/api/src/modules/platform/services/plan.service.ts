import { Injectable } from '@nestjs/common';
import { type Plan } from '@prisma/client';
import { PlanRepository } from '../repositories/plan.repository';

@Injectable()
export class PlanService {
  constructor(private readonly planRepo: PlanRepository) {}

  async findAllActive(): Promise<Plan[]> {
    return this.planRepo.findAllActive();
  }

  async findByKey(key: string): Promise<Plan | null> {
    return this.planRepo.findByKey(key);
  }

  async validatePlanForRegion(planKey: string, regionKey: string): Promise<boolean> {
    return this.planRepo.regionAllowsPlan(planKey, regionKey);
  }
}
