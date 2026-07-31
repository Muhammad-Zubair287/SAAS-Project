# ADR-004 — Transactional Outbox for Domain Event Publishing

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-004, TSA §21

---

## Context

Domain events (e.g., `EmployeeActivated.v1`, `AttendanceCalculated.v1`, `PayrollApproved.v1`) must be published reliably after business state is committed to the database. A dual-write pattern (write to DB + write to broker in the same request handler) risks partial failure: the DB write succeeds but the broker write fails, leaving consumers with no event.

## Decision

Use the Transactional Outbox pattern:

1. Application service writes business state AND an `outbox_event` record in the **same database transaction**.
2. A dedicated Outbox Relay Worker polls committed `outbox_event` rows and publishes them to BullMQ.
3. The worker marks each event as `published` after successful delivery.
4. Consumers are idempotent: they check `eventId` before processing.

`outbox_events` table shape:
```sql
CREATE TABLE outbox_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  event_type   text NOT NULL,
  event_id     uuid NOT NULL UNIQUE,   -- UUIDv7
  payload      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'PENDING',  -- PENDING | PUBLISHED | FAILED
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts     int NOT NULL DEFAULT 0
);
```

**NEVER write directly to the broker from a request handler.** All event publishing goes through the outbox.

## Reason

- Atomicity: business state and event record commit together or not at all.
- At-least-once delivery guaranteed by the relay worker retry loop.
- Decouples business transactions from broker availability.
- TSA §21: "The MVP uses Redis-backed queues combined with a PostgreSQL transactional outbox."

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Dual-write (DB + broker in same handler) | Non-atomic; broker failure causes missed events |
| Change Data Capture (Debezium) | Additional infrastructure complexity; not required at MVP scale |
| Saga orchestrator | Over-engineered for MVP; outbox satisfies the at-least-once requirement |

## Consequences

- **Positive:** Guaranteed event delivery even if broker is temporarily unavailable.
- **Positive:** Business transactions are decoupled from broker latency.
- **Negative:** Small delay between DB commit and event publication (relay poll interval).
- **Negative:** Relay worker is a critical component — must be monitored and auto-restarted.

## Partition & Performance

- `outbox_events` is partitioned by month (BRIN index on `created_at`).
- PENDING rows are indexed for fast relay polling: `CREATE INDEX ON outbox_events (created_at) WHERE status = 'PENDING'`.
- Published partitions are archived after retention window.
