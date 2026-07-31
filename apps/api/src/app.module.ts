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
  corsConfig,
  databaseConfig,
  jwtConfig,
  loggingConfig,
  redisConfig,
  swaggerConfig,
  throttleConfig,
  uploadConfig,
  validateEnvironment,
} from './config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import {
  CorrelationIdInterceptor,
  LoggingInterceptor,
  ResponseTransformInterceptor,
} from './common/interceptors';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        authConfig,
        corsConfig,
        databaseConfig,
        jwtConfig,
        loggingConfig,
        redisConfig,
        swaggerConfig,
        throttleConfig,
        uploadConfig,
      ],
      validate: validateEnvironment,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60000', 10),
        limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthenticationModule,
    PlatformModule,
    OrganisationModule,
    EmployeeModule,
    DocumentsModule,
    AttendanceModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_PIPE, useValue: AppValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(PlatformActorMiddleware)
      .forRoutes({ path: 'platform/*path', method: RequestMethod.ALL });
  }
}
