import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { ApprovalsController } from './controllers/approvals.controller';
import { ApprovalsInboxService } from './services/approvals-inbox.service';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsInboxService],
  exports: [ApprovalsInboxService],
})
export class WorkflowModule {}
