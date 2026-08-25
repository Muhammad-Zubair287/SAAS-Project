/**
 * M07 Phase 3 runtime DI smoke — boots Nest AttendanceModule + ShiftsModule
 * and exercises ingest calculation path (bypasses HTTP RBAC).
 */
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { PrismaModule } from '../src/database/prisma/prisma.module';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AttendanceModule } from '../src/modules/attendance/attendance.module';
import { AuthenticationModule } from '../src/modules/authentication/authentication.module';
import { AttendanceEventService } from '../src/modules/attendance/services/attendance-event.service';
import { AttendanceRecordService } from '../src/modules/attendance/services/attendance-record.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthenticationModule,
    AttendanceModule,
  ],
})
class SmokeAppModule {}

type R = { id: string; status: 'PASS' | 'FAIL' | 'N/A'; evidence: string };
const results: R[] = [];
function note(id: string, status: R['status'], evidence: string) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(4)} ${id} — ${evidence}`);
}

async function main() {
  const raw = fs.readFileSync('/tmp/wcos-smoke/bootstrap.json', 'utf8');
  const boot = JSON.parse(raw.slice(raw.lastIndexOf('{')));
  const tenantId = boot.tenantId as string;
  const actorId = boot.managerUserId as string;
  const stamp = Date.now();

  const app = await NestFactory.createApplicationContext(SmokeAppModule, {
    logger: ['error', 'warn'],
  });
  note('NEST_BOOT', 'PASS', 'AttendanceModule+ShiftsModule DI ok');

  const prisma = app.get(PrismaService);
  const events = app.get(AttendanceEventService);
  const records = app.get(AttendanceRecordService);

  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.tenant_id', '${tenantId}', false)`,
  );

  const le = await prisma.legalEntity.findFirst({ where: { tenantId } });
  if (!le) throw new Error('no legal entity');
  const policy = await prisma.attendancePolicy.findFirst({
    where: { tenantId, isCurrent: true, deletedAt: null },
  });
  if (!policy) throw new Error('no policy');

  const emp = await prisma.employee.create({
    data: {
      tenantId,
      legalEntityId: le.id,
      employeeNumber: `P3NEST-${stamp}`,
      firstName: 'P3',
      lastName: 'Nest',
      displayName: 'P3 Nest',
      emailWork: `p3nest.${stamp}@m07.local`,
      hireDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      employmentType: 'FULL_TIME',
      createdBy: actorId,
    },
  });
  const shift = await prisma.shift.create({
    data: {
      tenantId,
      code: `P3NEST-${stamp}`,
      name: 'P3 Nest Day',
      version: 1,
      status: 'ACTIVE',
      startLocalTime: '09:00',
      endLocalTime: '17:00',
      crossesMidnight: false,
      requiredMinutes: 480,
      attendancePolicyId: policy.id,
      effectiveFrom: new Date('2020-01-01'),
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
  const asg = await prisma.shiftAssignment.create({
    data: {
      tenantId,
      employeeId: emp.id,
      shiftId: shift.id,
      effectiveFrom: new Date('2026-08-01'),
      assignmentSource: 'INDIVIDUAL',
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const corr = randomUUID();
  await events.ingest(
    {
      employeeId: emp.id,
      eventType: 'CHECK_IN',
      source: 'WEB',
      eventTime: new Date(2026, 7, 18, 9, 0, 0).toISOString(),
    } as any,
    actorId,
    'smoke@local',
    tenantId,
    corr,
  );
  await events.ingest(
    {
      employeeId: emp.id,
      eventType: 'CHECK_OUT',
      source: 'WEB',
      eventTime: new Date(2026, 7, 18, 17, 0, 0).toISOString(),
    } as any,
    actorId,
    'smoke@local',
    tenantId,
    corr,
  );

  // triggerCalculation is fire-and-forget inside ingest — wait
  await new Promise((r) => setTimeout(r, 1500));
  let record = await prisma.attendanceRecord.findFirst({
    where: {
      tenantId,
      employeeId: emp.id,
      attendanceDate: new Date('2026-08-18'),
    },
  });
  note(
    'NEST_INGEST_PROVENANCE',
    record?.scheduleSource === 'SHIFT_ASSIGNMENT' &&
      record.resolvedShiftId === shift.id &&
      record.shiftAssignmentId === asg.id
      ? 'PASS'
      : 'FAIL',
    `source=${record?.scheduleSource} status=${record?.status} shift=${record?.resolvedShiftId}`,
  );

  // Create v2; assignment still pins v1
  await prisma.shift.create({
    data: {
      tenantId,
      code: `P3NEST-${stamp}`,
      name: 'P3 Nest Day v2',
      version: 2,
      status: 'ACTIVE',
      startLocalTime: '10:00',
      endLocalTime: '18:00',
      crossesMidnight: false,
      requiredMinutes: 480,
      attendancePolicyId: policy.id,
      effectiveFrom: new Date('2020-01-01'),
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await records.recalculate(
    emp.id,
    '2026-08-18',
    '2026-08-18',
    tenantId,
    actorId,
    corr,
  );

  record = await prisma.attendanceRecord.findFirst({
    where: {
      tenantId,
      employeeId: emp.id,
      attendanceDate: new Date('2026-08-18'),
    },
  });
  note(
    'NEST_RECALC_PINNED',
    record?.resolvedShiftId === shift.id &&
      record?.scheduleSource === 'SHIFT_ASSIGNMENT'
      ? 'PASS'
      : 'FAIL',
    `source=${record?.scheduleSource} shift=${record?.resolvedShiftId}`,
  );

  // Policy fallback employee
  const emp2 = await prisma.employee.create({
    data: {
      tenantId,
      legalEntityId: le.id,
      employeeNumber: `P3NESTF-${stamp}`,
      firstName: 'P3',
      lastName: 'Fallback',
      displayName: 'P3 Fallback Nest',
      emailWork: `p3nestf.${stamp}@m07.local`,
      hireDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      employmentType: 'FULL_TIME',
      createdBy: actorId,
    },
  });
  await events.ingest(
    {
      employeeId: emp2.id,
      eventType: 'CHECK_IN',
      source: 'WEB',
      eventTime: new Date(2026, 7, 18, 9, 0, 0).toISOString(),
    } as any,
    actorId,
    'smoke@local',
    tenantId,
    corr,
  );
  await events.ingest(
    {
      employeeId: emp2.id,
      eventType: 'CHECK_OUT',
      source: 'WEB',
      eventTime: new Date(2026, 7, 18, 17, 0, 0).toISOString(),
    } as any,
    actorId,
    'smoke@local',
    tenantId,
    corr,
  );
  await new Promise((r) => setTimeout(r, 1500));
  const rec2 = await prisma.attendanceRecord.findFirst({
    where: {
      tenantId,
      employeeId: emp2.id,
      attendanceDate: new Date('2026-08-18'),
    },
  });
  note(
    'NEST_POLICY_FALLBACK',
    rec2?.scheduleSource === 'ATTENDANCE_POLICY' && !rec2.resolvedShiftId
      ? 'PASS'
      : 'FAIL',
    `source=${rec2?.scheduleSource} status=${rec2?.status}`,
  );

  await app.close();
  const summary = {
    suite: 'm07-phase3-runtime-nest',
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    results,
  };
  fs.writeFileSync(
    '/tmp/wcos-smoke/m07-phase3-runtime-nest.json',
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify({ pass: summary.pass, fail: summary.fail }));
  if (summary.fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
