# ADR-008 — OpenTelemetry for Vendor-Neutral Observability

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-008, TSA §41

---

## Context

The platform runs multiple services (API, workers, connector runtime) across Kubernetes pods. Distributed tracing, metrics, and log correlation are required for debugging production incidents and validating SLO compliance. Vendor lock-in to a specific APM vendor must be avoided.

## Decision

Instrument all services (NestJS API, BullMQ workers, connector runtime) with the OpenTelemetry SDK (Node.js). Emit traces, metrics, and structured logs to an OTel Collector, which fans out to:
- **Metrics:** Prometheus → Grafana dashboards
- **Logs:** Loki (or Elastic — open decision) → Grafana
- **Traces:** Tempo (or Jaeger — open decision) → Grafana

Correlation: `correlationId` and `causationId` from the API request propagate as OTel span attributes and appear in all log lines for that request.

## Reason

- TSA ADR-008: "OpenTelemetry standard. Vendor-neutral traces, metrics and log correlation."
- OTel is the CNCF standard — no vendor lock-in; backend can be swapped without changing application code.
- Correlation IDs from the API contract spec must appear in traces and logs for incident debugging.
- Prometheus/Grafana is explicitly referenced in TSA §41.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Datadog / New Relic agent | Vendor lock-in; significant per-host cost at scale |
| Custom logging only (no tracing) | Insufficient for multi-pod, multi-worker distributed debugging |
| AWS X-Ray | AWS-specific; violates cloud-portable design (ADR-009) |

## Consequences

- **Positive:** Backend observability vendor can be changed without touching application code.
- **Positive:** Unified traces + metrics + logs in Grafana.
- **Negative:** OTel SDK adds a small performance overhead (~1–3% CPU) — acceptable at MVP scale.
- **Negative:** OTel Collector is an additional infrastructure component to manage.

## SLO Monitoring Requirements

| SLO | Metric | Alert Threshold |
|-----|--------|----------------|
| API p95 latency ≤ 800ms | `http_server_duration_bucket` | > 800ms at p95 for 5 min |
| Attendance ack ≤ 2s | `attendance_ingest_duration_bucket` | > 2s at p95 for 1 min |
| Availability ≥ 99.9% | `http_server_requests_total{status=~"5.."}` | Error rate > 0.1% for 5 min |
