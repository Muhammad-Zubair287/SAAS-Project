# ADR-005 — Redis + BullMQ for Background Job Queues

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-005, TSA §57

---

## Context

Multiple platform operations require asynchronous processing: attendance normalisation, payroll calculation, notification dispatch, CSV imports, report generation, and integration sync. A reliable background job system is required.

## Decision

Use Redis (AWS ElastiCache, cluster mode) as the queue backend and BullMQ as the Node.js queue library for all background jobs.

Workers are deployed as separate Kubernetes Deployments:
- `W-ATT` — Attendance normalisation + calculation
- `W-PAY` — Payroll batch calculation
- `W-NTF` — Notification dispatch
- `W-IMP` — CSV import + data migration
- `W-EXP` — Report export + payslip generation
- `W-INT` — Integration connector sync

## Reason

- TSA §57 names BullMQ explicitly: "Queue technology: Redis/BullMQ for MVP."
- BullMQ provides: delayed jobs, retries with backoff, rate limiting, priority queues, job concurrency control — all required by the payroll and attendance workers.
- Redis is already in the stack for caching and rate limiting — no additional infrastructure component.
- BullMQ is the de facto standard NestJS queue adapter with first-class TypeScript support.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Kafka | Enterprise-tier option; operational complexity exceeds MVP needs; Kafka not named as MVP requirement in TSA |
| AWS SQS | Vendor lock-in; adds cost; BullMQ on existing Redis is sufficient at MVP |
| pg-boss (PostgreSQL queues) | Would overlap with the transactional outbox; BullMQ provides richer job management UI |

## Consequences

- **Positive:** BullMQ + Bull Board provides job monitoring UI out of the box.
- **Positive:** Same Redis instance serves cache, rate limiter, and queues — low infrastructure footprint.
- **Negative:** Redis is not a persistent durable queue — job loss possible on Redis failure (mitigated by the transactional outbox as the source of truth for events; BullMQ jobs can be re-enqueued from outbox on restart).
- **Negative:** Redis cluster mode required for high-availability — adds configuration complexity.

## Review Trigger

Migrate to Kafka (or managed alternative) when sustained queue depth or throughput exceeds what a single Redis cluster can handle at acceptable latency, or when Enterprise customers require guaranteed ordering across partitions.
