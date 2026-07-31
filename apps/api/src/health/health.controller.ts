import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipResponseTransform } from '../common/decorators/skip-response-transform.decorator';
import { DatabaseHealthIndicator } from './indicators/database.health.indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Aggregate health check — all indicators' })
  check() {
    return this.health.check([
      () => this.dbIndicator.isHealthy('database'),
    ]);
  }

  @Get('liveness')
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Liveness probe — application process is running' })
  liveness(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('readiness')
  @HealthCheck()
  @SkipResponseTransform()
  @ApiOperation({
    summary: 'Readiness probe — application is ready to serve traffic',
  })
  readiness() {
    return this.health.check([
      () => this.dbIndicator.isHealthy('database'),
    ]);
  }
}
