import {
  MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  authConfig,
  emailConfig,
  sessionCookieConfig,
  corsConfig,
  databaseConfig,
  jwtConfig,
  loggingConfig,
  redisConfig,
  queueConfig,
  swaggerConfig,
  throttleConfig,
  uploadConfig,
  validateEnvironment,
} from './config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import {
  CorrelationIdInterceptor,
  EtagInterceptor,
  LoggingInterceptor,
  ResponseTransformInterceptor,
} from './common/interceptors';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { IdempotencyHeaderMiddleware } from './common/middleware/idempotency-header.middleware';
import { PlatformActorMiddleware } from './common/middleware/platform-actor.middleware';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { PlatformModule } from './modules/platform/platform.module';
import { OrganisationModule } from './modules/organisation/organisation.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { EmployeeSelfServiceModule } from './modules/employee-self-service/employee-self-service.module';
import { LeaveModule } from './modules/leave/leave.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { PlatformInfrastructureModule } from './platform/platform-infrastructure.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        authConfig,
        emailConfig,
        sessionCookieConfig,
        corsConfig,
        databaseConfig,
        jwtConfig,
        loggingConfig,
        redisConfig,
        queueConfig,
        swaggerConfig,
        throttleConfig,
        uploadConfig,
      ],
      validate: validateEnvironment,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60000', 10), limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10) },
      { name: 'interactive-read', ttl: parseInt(process.env['THROTTLE_INTERACTIVE_READ_TTL'] ?? '300000', 10), limit: parseInt(process.env['THROTTLE_INTERACTIVE_READ_LIMIT'] ?? '600', 10) },
      { name: 'interactive-write', ttl: parseInt(process.env['THROTTLE_INTERACTIVE_WRITE_TTL'] ?? '300000', 10), limit: parseInt(process.env['THROTTLE_INTERACTIVE_WRITE_LIMIT'] ?? '120', 10) },
      { name: 'attendance-connector', ttl: parseInt(process.env['THROTTLE_ATTENDANCE_CONNECTOR_TTL'] ?? '60000', 10), limit: parseInt(process.env['THROTTLE_ATTENDANCE_CONNECTOR_LIMIT'] ?? '300', 10) },
      { name: 'device-control', ttl: parseInt(process.env['THROTTLE_DEVICE_CONTROL_TTL'] ?? '60000', 10), limit: parseInt(process.env['THROTTLE_DEVICE_CONTROL_LIMIT'] ?? '120', 10) },
    ]),
    PrismaModule,
    PlatformInfrastructureModule,
    HealthModule,
    AuthenticationModule,
    PlatformModule,
    OrganisationModule,
    EmployeeModule,
    DocumentsModule,
    AttendanceModule,
    EmployeeSelfServiceModule,
    LeaveModule,
    PayrollModule,
    WorkflowModule,
    IntegrationsModule,
    ShiftsModule,
    TenantModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EtagInterceptor },
    { provide: APP_PIPE, useValue: AppValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(IdempotencyHeaderMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(PlatformActorMiddleware)
      .forRoutes({ path: 'platform/*path', method: RequestMethod.ALL });
  }
}
