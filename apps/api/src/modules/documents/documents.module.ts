import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { DocumentTemplateRepository } from './repositories/document-template.repository';
import { EmployeeDocumentRepository } from './repositories/employee-document.repository';
import { OnboardingTemplateRepository } from './repositories/onboarding-template.repository';
import { OnboardingInstanceRepository } from './repositories/onboarding-instance.repository';
import { DocumentRequestRepository } from './repositories/document-request.repository';
import { DocumentTemplateService } from './services/document-template.service';
import { EmployeeDocumentService } from './services/employee-document.service';
import { OnboardingTemplateService } from './services/onboarding-template.service';
import { OnboardingInstanceService } from './services/onboarding-instance.service';
import { DocumentRequestService } from './services/document-request.service';
import { DocumentTemplateController } from './controllers/document-template.controller';
import { EmployeeDocumentController } from './controllers/employee-document.controller';
import { OnboardingTemplateController } from './controllers/onboarding-template.controller';
import { OnboardingInstanceController } from './controllers/onboarding-instance.controller';
import { DocumentRequestController } from './controllers/document-request.controller';
import { DocumentLibraryController } from './controllers/document-library.controller';
import { OnboardingDashboardService } from './services/onboarding-dashboard.service';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [
    DocumentLibraryController,
    DocumentTemplateController,
    EmployeeDocumentController,
    OnboardingTemplateController,
    OnboardingInstanceController,
    DocumentRequestController,
  ],
  providers: [
    DocumentTemplateRepository,
    EmployeeDocumentRepository,
    OnboardingTemplateRepository,
    OnboardingInstanceRepository,
    DocumentRequestRepository,
    DocumentTemplateService,
    EmployeeDocumentService,
    OnboardingTemplateService,
    OnboardingInstanceService,
    DocumentRequestService,
    OnboardingDashboardService,
  ],
  exports: [
    DocumentTemplateService,
    EmployeeDocumentService,
    OnboardingTemplateService,
    OnboardingInstanceService,
    DocumentRequestService,
  ],
})
export class DocumentsModule {}
