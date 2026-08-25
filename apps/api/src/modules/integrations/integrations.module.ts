import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { IntegrationsController } from './controllers/integrations.controller';
import { IntegrationsCatalogueService } from './services/integrations-catalogue.service';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsCatalogueService],
  exports: [IntegrationsCatalogueService],
})
export class IntegrationsModule {}
