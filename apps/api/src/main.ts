import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  const appName = config.get<string>('app.name', 'Workforce Cloud OS');
  const appVersion = config.get<string>('app.version', '0.1.0');
  const port = config.get<number>('app.port', 3001);
  const apiPrefix = config.get<string>('app.apiPrefix', 'api');
  const apiVersion = config.get<string>('app.apiVersion', 'v1');
  const corsOrigins = config.get<string[]>('cors.origins', ['http://localhost:3000']);
  const swaggerEnabled = config.get<boolean>('swagger.enabled', true);
  const swaggerPath = config.get<string>('swagger.path', 'docs');

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

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Id',
      'Idempotency-Key',
      'X-Correlation-ID',
      'If-Match',
    ],
    exposedHeaders: ['ETag', 'X-Correlation-ID'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

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

    logger.log(
      `Swagger docs → http://localhost:${port}/${apiPrefix}/${swaggerPath}`,
    );
  }

  await app.listen(port);

  logger.log(`${appName} v${appVersion} → http://localhost:${port}`);
  logger.log(`API base  → http://localhost:${port}/${apiPrefix}/${apiVersion}`);
  logger.log(
    `Health    → http://localhost:${port}/${apiPrefix}/${apiVersion}/health`,
  );
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Fatal error during bootstrap: ${String(err)}`);
  process.exit(1);
});
