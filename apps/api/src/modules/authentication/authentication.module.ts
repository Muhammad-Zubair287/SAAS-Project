import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthController } from './controllers/auth.controller';
import { InvitationController } from './controllers/invitation.controller';
import { MfaController } from './controllers/mfa.controller';
import { PasswordResetController } from './controllers/password-reset.controller';
import { RoleAssignmentController } from './controllers/role-assignment.controller';
import { ApiClientController } from './controllers/api-client.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiClientGuard } from './guards/api-client.guard';
import { PermissionGuard } from './guards/permission.guard';
import { NOTIFICATION_GATEWAY } from './interfaces/notification-gateway.interface';
import { EmailNotificationAdapter } from './notifications/email-notification.adapter';
import { AuthRepository } from './repositories/auth.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { MfaRepository } from './repositories/mfa.repository';
import { RbacRepository } from './repositories/rbac.repository';
import { ApiClientRepository } from './repositories/api-client.repository';
import { AuthService } from './services/auth.service';
import { ApiClientAuthService } from './services/api-client-auth.service';
import { ApiClientService } from './services/api-client.service';
import { AuthorizationService } from './services/authorization.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { RoleAssignmentService } from './services/role-assignment.service';
import { ChallengeService } from './services/challenge.service';
import { InvitationService } from './services/invitation.service';
import { MfaService } from './services/mfa.service';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.getOrThrow<string>('jwt.accessExpiry') as StringValue },
      }),
    }),
  ],
  controllers: [
    AuthController,
    InvitationController,
    MfaController,
    PasswordResetController,
    RoleAssignmentController,
    ApiClientController,
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    PermissionGuard,
    ApiClientGuard,
    AuthRepository,
    InvitationRepository,
    MfaRepository,
    RbacRepository,
    ApiClientRepository,
    PasswordService,
    SessionService,
    ChallengeService,
    AuthService,
    InvitationService,
    MfaService,
    PasswordResetService,
    PermissionCacheService,
    AuthorizationService,
    RoleAssignmentService,
    ApiClientAuthService,
    ApiClientService,
    { provide: NOTIFICATION_GATEWAY, useClass: EmailNotificationAdapter },
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    JwtStrategy,
    AuthService,
    AuthorizationService,
    PermissionGuard,
    ApiClientGuard,
  ],
})
export class AuthenticationModule {}
