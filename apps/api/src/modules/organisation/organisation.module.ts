import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AuditEventRepository } from '../platform/repositories/audit-event.repository';
import { LegalEntityRepository } from './repositories/legal-entity.repository';
import { BranchRepository } from './repositories/branch.repository';
import { DepartmentRepository } from './repositories/department.repository';
import { CostCentreRepository } from './repositories/cost-centre.repository';
import { PositionRepository } from './repositories/position.repository';
import { LegalEntityService } from './services/legal-entity.service';
import { BranchService } from './services/branch.service';
import { DepartmentService } from './services/department.service';
import { CostCentreService } from './services/cost-centre.service';
import { PositionService } from './services/position.service';
import { LegalEntityController } from './controllers/legal-entity.controller';
import { BranchController } from './controllers/branch.controller';
import { DepartmentController } from './controllers/department.controller';
import { CostCentreController } from './controllers/cost-centre.controller';
import { PositionController } from './controllers/position.controller';
import { GradeAndOverviewController } from './controllers/grade-and-overview.controller';
import { GradeService } from './services/grade.service';
import { OrganisationOverviewService } from './services/organisation-overview.service';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [
    GradeAndOverviewController,
    LegalEntityController,
    BranchController,
    DepartmentController,
    CostCentreController,
    PositionController,
  ],
  providers: [
    AuditEventRepository,
    LegalEntityRepository,
    BranchRepository,
    DepartmentRepository,
    CostCentreRepository,
    PositionRepository,
    LegalEntityService,
    BranchService,
    DepartmentService,
    CostCentreService,
    PositionService,
    GradeService,
    OrganisationOverviewService,
  ],
  exports: [
    LegalEntityRepository,
    BranchRepository,
    DepartmentRepository,
    CostCentreRepository,
    PositionRepository,
    LegalEntityService,
    BranchService,
    DepartmentService,
    CostCentreService,
    PositionService,
    GradeService,
  ],
})
export class OrganisationModule {}
