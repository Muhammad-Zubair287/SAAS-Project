import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { EmployeeModule } from '../employee/employee.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { AuditEventRepository } from '../platform/repositories/audit-event.repository';
import { AttendanceRawEventRepository } from './repositories/attendance-raw-event.repository';
import { AttendanceRecordRepository } from './repositories/attendance-record.repository';
import { AttendanceExceptionRepository } from './repositories/attendance-exception.repository';
import { AttendancePolicyRepository } from './repositories/attendance-policy.repository';
import { AttendanceDeviceRepository } from './repositories/attendance-device.repository';
import { AttendanceDeviceTokenRepository } from './repositories/attendance-device-token.repository';
import { AttendanceDeviceHeartbeatRepository } from './repositories/attendance-device-heartbeat.repository';
import { AttendanceCaptureSessionRepository } from './repositories/attendance-capture-session.repository';
import { AttendanceMobileDeviceRepository } from './repositories/attendance-mobile-device.repository';
import { AttendanceGeofenceRepository } from './repositories/attendance-geofence.repository';
import { AttendanceOfflineQueueRepository } from './repositories/attendance-offline-queue.repository';
import { AttendanceDeviceEventRepository } from './repositories/attendance-device-event.repository';
import { AttendanceCaptureLogRepository } from './repositories/attendance-capture-log.repository';
import { AttendanceCaptureAuditRepository } from './repositories/attendance-capture-audit.repository';
import { AttendanceCalculatorService } from './services/attendance-calculator.service';
import { AttendanceEventService } from './services/attendance-event.service';
import { AttendanceRecordService } from './services/attendance-record.service';
import { AttendanceExceptionService } from './services/attendance-exception.service';
import { AttendancePolicyService } from './services/attendance-policy.service';
import { DeviceRegistryService } from './services/device-registry.service';
import { DeviceAuthService } from './services/device-auth.service';
import { DeviceHeartbeatService } from './services/device-heartbeat.service';
import { DeviceEventIngestService } from './services/device-event-ingest.service';
import { OfflineQueueService } from './services/offline-queue.service';
import { GeofenceService } from './services/geofence.service';
import { EventValidationService } from './services/event-validation.service';
import { DeviceHealthService } from './services/device-health.service';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { AttendanceEventController } from './controllers/attendance-event.controller';
import { AttendanceRecordController } from './controllers/attendance-record.controller';
import { AttendanceExceptionController } from './controllers/attendance-exception.controller';
import { AttendancePolicyController } from './controllers/attendance-policy.controller';
import { AttendanceDeviceController } from './controllers/attendance-device.controller';
import { AttendanceDeviceTokenController } from './controllers/attendance-device-token.controller';
import { AttendanceHeartbeatController } from './controllers/attendance-heartbeat.controller';
import { AttendanceDeviceEventController } from './controllers/attendance-device-event.controller';
import { AttendanceOfflineController } from './controllers/attendance-offline.controller';
import { AttendanceGeofenceController } from './controllers/attendance-geofence.controller';
import { AttendancePeriodController } from './controllers/attendance-period.controller';
import { AttendancePeriodService } from './services/attendance-period.service';
import { AttendanceWorkerBootstrapService } from './workers/attendance-worker-bootstrap.service';
import { AttendanceOutboxConsumer } from './workers/attendance-outbox.consumer';
import { AttendanceEventValidationWorker } from './workers/attendance-event-validation.worker';
import { AttendanceOfflineReplayWorker } from './workers/attendance-offline-replay.worker';
import { AttendanceDeviceHealthWorker } from './workers/attendance-device-health.worker';
import { AttendanceDuplicateDetectionWorker } from './workers/attendance-duplicate-detection.worker';
import { AttendanceDeviceHealthScheduler } from './workers/attendance-device-health-scheduler';

@Module({
  imports: [PrismaModule, AuthenticationModule, EmployeeModule, ShiftsModule],
  controllers: [
    AttendanceEventController,
    AttendanceRecordController,
    AttendanceExceptionController,
    AttendancePolicyController,
    // HeartbeatController before DeviceController so GET .../health is not
    // shadowed by GET .../:deviceId (ParseUUIDPipe would reject "health").
    AttendanceHeartbeatController,
    AttendanceDeviceController,
    AttendanceDeviceTokenController,
    AttendanceDeviceEventController,
    AttendanceOfflineController,
    AttendanceGeofenceController,
    AttendancePeriodController,
  ],
  providers: [
    AuditEventRepository,
    AttendanceRawEventRepository,
    AttendanceRecordRepository,
    AttendanceExceptionRepository,
    AttendancePolicyRepository,
    AttendanceDeviceRepository,
    AttendanceDeviceTokenRepository,
    AttendanceDeviceHeartbeatRepository,
    AttendanceCaptureSessionRepository,
    AttendanceMobileDeviceRepository,
    AttendanceGeofenceRepository,
    AttendanceOfflineQueueRepository,
    AttendanceDeviceEventRepository,
    AttendanceCaptureLogRepository,
    AttendanceCaptureAuditRepository,
    AttendanceCalculatorService,
    AttendanceEventService,
    AttendanceRecordService,
    AttendanceExceptionService,
    AttendancePolicyService,
    AttendancePeriodService,
    DeviceRegistryService,
    DeviceAuthService,
    DeviceHeartbeatService,
    DeviceEventIngestService,
    OfflineQueueService,
    GeofenceService,
    EventValidationService,
    DeviceHealthService,
    DeviceAuthGuard,
    AttendanceWorkerBootstrapService,
    AttendanceOutboxConsumer,
    AttendanceEventValidationWorker,
    AttendanceOfflineReplayWorker,
    AttendanceDeviceHealthWorker,
    AttendanceDuplicateDetectionWorker,
    AttendanceDeviceHealthScheduler,
  ],
  exports: [AttendancePolicyService, AttendanceEventService, DeviceAuthGuard],
})
export class AttendanceModule {}
