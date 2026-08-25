# M00 — Consumer Idempotency Architectural Decision

**Status:** Accepted  
**Date:** 2026-08-05  
**Module:** M00 Platform Queue & Worker Infrastructure

---

## Question

Can existing platform models (`IdempotencyKey`, `OutboxEvent`) satisfy consumer-side idempotency without a dedicated Consumer Inbox?

Consumer idempotency requires persistence for:

| Requirement | Description |
|-------------|-------------|
| Event ID | Unique domain event identifier (`eventId`) |
| Consumer Identity | Which worker/consumer processed the event |
| Processing State | In-flight, succeeded, failed, dead-lettered |
| Processing Timestamp | When processing completed |
| Failure Metadata | Attempt count and last error message |

---

## Analysis

### `IdempotencyKey`

Purpose: HTTP request deduplication via `Idempotency-Key` header on POST/PUT mutations.

| Field | Fit for consumer idempotency |
|-------|------------------------------|
| `key` | Client-supplied HTTP header — not event ID |
| `requestHash` | HTTP body hash — unrelated to events |
| `responseBody` / `statusCode` | HTTP response cache — wrong lifecycle |
| `expiresAt` | TTL for HTTP keys — consumers need durable records |

**Verdict:** Violates separation of concerns. Reusing this model would conflate HTTP idempotency with async consumer deduplication and lose per-consumer tracking (same event consumed by multiple workers).

### `OutboxEvent`

Purpose: Publisher-side transactional outbox (ADR-004). Tracks dispatch from DB to BullMQ.

| Field | Fit for consumer idempotency |
|-------|------------------------------|
| `eventId` | Present — but publisher-scoped |
| `status` | PUBLISHED / PENDING — publisher state, not consumer state |
| `consumerName` | **Absent** — one event may have many consumers |
| `processedAt` | **Absent** — tracks `publishedAt`, not consumer completion |

**Verdict:** Violates separation of concerns. Outbox state tracks relay/dispatch; consumer state tracks handler execution. A single event can be consumed by attendance, payroll, and notification workers independently.

---

## Decision

**Create a dedicated `ConsumerInbox` model** (migration `20260805000000_m00_platform_queue_worker_infrastructure`).

```prisma
model ConsumerInbox {
  eventId      String   // domain event UUID
  consumerName String   // e.g. "attendance-normalizer"
  status       ConsumerInboxStatus
  processedAt  DateTime?
  lastError    String?
  attempts     Int
  @@unique([eventId, consumerName])
}
```

This preserves:

- **OutboxEvent** — publisher relay lifecycle (ADR-004)
- **IdempotencyKey** — HTTP write deduplication (API contract)
- **ConsumerInbox** — per-consumer exactly-once processing semantics under at-least-once delivery

---

## Consequences

- Consumers claim `(eventId, consumerName)` before processing via `ConsumerInboxRepository.claim()`.
- Duplicate deliveries short-circuit when status is `PROCESSED`.
- Failed attempts increment `attempts` and store `lastError`; exhausted retries move to `DEAD_LETTERED` and enqueue to the platform dead-letter queue.
- No changes required to completed business modules; inbox is infrastructure-only.
