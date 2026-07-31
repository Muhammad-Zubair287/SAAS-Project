# ADR-003 — REST-First API Design

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-003, API & Event Contract Specification

---

## Context

The platform must expose APIs for web clients, mobile apps, partner integrations, biometric device connectors, and third-party ERP systems. A primary API design approach must be established before any module implementation begins.

## Decision

REST at `/api/v1` is the primary API style. OpenAPI 3.1 is the source of truth — API contracts are defined in OpenAPI before implementation.

GraphQL is an optional façade for Enterprise tier and read-heavy dashboard views only. It is not required for MVP.

## Reason

- REST is universally understood by integration partners (ERP vendors, banks, device manufacturers).
- OpenAPI 3.1 generates client SDKs and documentation automatically.
- REST maps cleanly to HTTP caching (ETags), idempotency patterns (Idempotency-Key header), and standard error formats (RFC 7807 ProblemDetails).
- GraphQL complexity (N+1 queries, schema stitching) is unnecessary at MVP scale.

## API Standards Applied

- Base path: `/api/v1`
- All mutations require `Idempotency-Key` header
- All responses include `ETag`; mutations require `If-Match`
- Error format: RFC 7807 ProblemDetails
- Pagination: cursor-based (`PageInfo` schema)
- All money fields: `numeric(19,4)` serialised as string in JSON

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| GraphQL only | Complex tooling; harder for device/ERP integration partners; N+1 risk |
| tRPC | TypeScript-only; excludes non-TypeScript integration partners |
| gRPC | Requires client SDK distribution; not suitable for browser clients without Envoy proxy |

## Consequences

- **Positive:** Industry-standard; easy for partners to integrate.
- **Positive:** OpenAPI tooling generates docs, SDKs, and validation automatically.
- **Negative:** Chatty for complex dashboard views (mitigated by BFF patterns or GraphQL façade at Enterprise tier).
