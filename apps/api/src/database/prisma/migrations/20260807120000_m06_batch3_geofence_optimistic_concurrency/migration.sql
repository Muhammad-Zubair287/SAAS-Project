-- M06 Batch 3: optimistic concurrency for attendance geofences (row_version)
ALTER TABLE "attendance_geofence" ADD COLUMN "row_version" BIGINT NOT NULL DEFAULT 1;
