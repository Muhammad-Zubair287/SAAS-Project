import { config as loadEnv } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { AppLogger } from './common/logging/app-logger';
import { resolveNestLogLevels } from './config/logging.config';

// Load .env before resolving LOG_LEVEL so NestFactory logger matches file config
// when the variable is not already set in the process environment.
loadEnv();

async function bootstrap(): Promise<void> {
  const nestLevels = resolveNestLogLevels();
  const logger = new AppLogger('API', nestLevels);

  // Prisma rowVersion fields are BigInt; JSON responses must stringify them.
  // Platform-wide — does not change domain calculation behavior.
  if (!(BigInt.prototype as { toJSON?: () => string }).toJSON) {
    Object.defineProperty(BigInt.prototype, 'toJSON', {
      value(): string {
        return this.toString();
      },
      writable: true,
      configurable: true,
    });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger,
  });
  app.useLogger(logger);

  const config = app.get(ConfigService);

  const appName = config.get<string>('app.name', 'Workforce Cloud OS');
  const appVersion = config.get<string>('app.version', '0.1.0');
  const port = config.get<number>('app.port', 3001);
  const apiPrefix = config.get<string>('app.apiPrefix', 'api');
  const apiVersion = config.get<string>('app.apiVersion', 'v1');
  const corsOrigins = config.get<string[]>('cors.origins', ['http://localhost:3000']);
  const swaggerEnabled = config.get<boolean>('swagger.enabled', true);
  const swaggerPath = config.get<string>('swagger.path', 'docs');
  const uploadDir =
    config.get<string>('UPLOAD_STORAGE_PATH') ?? join(process.cwd(), 'storage', 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  logger.log(`Starting ${appName} v${appVersion}`);

  // Security headers (must be first middleware)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
    }),
  );

  // Response compression
  app.use(compression());

  // Parse cookies (required for HttpOnly refresh-token transport)
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-WCOS-Device-Token',
      'X-Tenant-Id',
      'Idempotency-Key',
      'X-Correlation-ID',
      'If-Match',
    ],
    exposedHeaders: ['ETag', 'X-Correlation-ID', 'Retry-After'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Public branding assets (outside /api/v1 prefix)
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // Global API prefix — all routes at /api/v1/*
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // Swagger / OpenAPI — excluded from versioned prefix
  if (swaggerEnabled) {
    const swaggerDocument = new DocumentBuilder()
      .setTitle(appName)
      .setDescription(`${appName} REST API`)
      .setVersion(apiVersion)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'X-Tenant-Id' },
        'tenant-id',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'X-WCOS-Device-Token' },
        'deviceToken',
      )
      .addTag('tenant', 'Tenant Admin Console (SCR-TEN / SCR-SET / SCR-SUB)')
      .addTag('roles', 'Tenant role matrix (SCR-AUD-04)')
      .addTag('users', 'Tenant user directory (SCR-TEN-05)')
      .addServer(`http://localhost:${port}`, 'Local Development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerDocument);
    SwaggerModule.setup(`${apiPrefix}/${swaggerPath}`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
      },
    });
  }

  await app.listen(port);

  const apiBase = `http://localhost:${port}/${apiPrefix}/${apiVersion}`;
  const swaggerUrl = `http://localhost:${port}/${apiPrefix}/${swaggerPath}`;
  const healthUrl = `${apiBase}/health`;

  logger.log('Server ready');
  logger.log(`API:     ${apiBase}`);
  logger.log(`Uploads: http://localhost:${port}/uploads/`);
  if (swaggerEnabled) {
    logger.log(`Swagger: ${swaggerUrl}`);
  }
  logger.log(`Health:  ${healthUrl}`);
}

bootstrap().catch((err: unknown) => {
  const logger = new AppLogger('API', ['error']);
  logger.error(`Fatal error during bootstrap: ${String(err)}`);
  process.exit(1);
});
