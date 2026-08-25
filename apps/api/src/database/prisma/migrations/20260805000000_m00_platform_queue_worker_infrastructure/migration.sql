-- M00 Platform Queue & Worker Infrastructure
-- Dedicated consumer inbox: distinct from HTTP idempotency and publisher outbox state.

CREATE TYPE "consumer_inbox_status" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTERED');

CREATE TABLE "consumer_inbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID,
    "eventId" UUID NOT NULL,
    "consumerName" VARCHAR(160) NOT NULL,
    "status" "consumer_inbox_status" NOT NULL DEFAULT 'PROCESSING',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "processedAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "consumer_inbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consumer_inbox_eventId_consumerName_key" ON "consumer_inbox"("eventId", "consumerName");
CREATE INDEX "consumer_inbox_tenantId_status_idx" ON "consumer_inbox"("tenantId", "status");
CREATE INDEX "consumer_inbox_status_updatedAt_idx" ON "consumer_inbox"("status", "updatedAt");
