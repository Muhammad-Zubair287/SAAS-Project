-- M07 Phase 2 — Default effective-dated ShiftAssignment
-- Branch is MVP Location. Department bulk expands to individual snapshot rows.

CREATE TABLE "shift_assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "branch_id" UUID,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "assignment_source" VARCHAR(40) NOT NULL,
    "source_reference_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "row_version" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "shift_assignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shift_assignment_tenant_employee_effective_idx"
  ON "shift_assignment"("tenant_id", "employee_id", "effective_from");
CREATE INDEX "shift_assignment_tenant_shift_idx"
  ON "shift_assignment"("tenant_id", "shift_id");
CREATE INDEX "shift_assignment_tenant_source_idx"
  ON "shift_assignment"("tenant_id", "assignment_source", "source_reference_id");
CREATE INDEX "shift_assignment_tenant_branch_idx"
  ON "shift_assignment"("tenant_id", "branch_id");

ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_assignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY shift_assignment_tenant_isolation ON "shift_assignment"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
