# ADR-001 — Modular Monolith over Microservices for MVP

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-001, TSA §12

---

## Context

The platform must support 17 business domains and scale to enterprise tenants while remaining operable by a small engineering team at MVP launch. The architecture must avoid premature complexity while establishing clear domain boundaries for future service extraction.

## Decision

Deploy a modular monolith: a single deployable NestJS application with strict domain boundaries enforced at the code level via NestJS modules, not service boundaries.

Workers (payroll calculation, attendance normalisation, exports) run as separate Kubernetes Deployments backed by BullMQ, allowing independent scaling without a full microservices topology.

## Reason

- Operational simplicity: one deployment, one database connection pool, one CI pipeline artifact.
- Reduced latency: no inter-service HTTP overhead for cross-domain queries.
- Easier transactions: domain events can be committed in the same database transaction as business data via the transactional outbox.
- Domain boundaries are enforced at the module/folder level; service extraction becomes a refactor, not a rewrite.
- TSA §12 explicitly documents a Service Extraction Strategy: extract to microservice only after domain is proven at scale.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Full microservices from day 1 | Premature complexity; distributed transaction overhead; requires large DevOps investment at MVP stage |
| Serverless functions | Insufficient for long-running payroll calculations; cold-start latency conflicts with 2s attendance SLO |

## Consequences

- **Positive:** Simpler deployment, easier debugging, lower operational cost at MVP.
- **Positive:** Module boundaries are enforced by code structure, not deployment.
- **Negative:** Scaling individual modules requires scaling the whole application (mitigated by workers as separate Deployments).
- **Negative:** Module boundary violations are harder to catch than service-level API contracts — requires code review discipline.

## Review Trigger

Re-evaluate when any single domain requires scaling independently at a rate that makes co-deployment prohibitive, or when team size exceeds 8 engineers working on the same codebase.
