import { Global, Module } from '@nestjs/common';
import { DeadLetterService } from '../dead-letter/dead-letter.service';
import { WorkerExecutionContextService } from '../execution-context/worker-execution-context.service';
import { PlatformMetricsService } from '../telemetry/platform-metrics.service';
import { WorkerTelemetryService } from '../telemetry/worker-telemetry.service';
import { WorkerRuntimeService } from './worker-runtime.service';

@Global()
@Module({
  providers: [
    WorkerRuntimeService,
    WorkerExecutionContextService,
    WorkerTelemetryService,
    PlatformMetricsService,
    DeadLetterService,
  ],
  exports: [
    WorkerRuntimeService,
    WorkerExecutionContextService,
    WorkerTelemetryService,
    PlatformMetricsService,
    DeadLetterService,
  ],
})
export class PlatformWorkerModule {}
