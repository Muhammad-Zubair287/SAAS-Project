# ADR-007 — Kubernetes as the Container Orchestration Runtime

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-007, TSA §36

---

## Context

The platform must be deployable across AWS, Azure, and GCP with consistent operational behaviour. Workloads include: stateless web pods, stateless API pods, stateful BullMQ workers, and scheduled CronJobs. Horizontal scaling, health checks, rolling deployments, and pod resource limits are required.

## Decision

Kubernetes (EKS on AWS as reference deployment) is the container orchestration platform. All workloads run as containers. Azure AKS and GCP GKE are mapped equivalents (per ADR-009).

Kubernetes topology:
- **Ingress Tier:** K8s Ingress Controller (TLS + WAF integration)
- **Application Tier:** Web Pods (Next.js, ≥3 replicas, HPA) + API Pods (NestJS, ≥3 replicas, HPA)
- **Worker Tier:** Separate Deployments per worker type (BullMQ consumers)
- **Scheduled Jobs:** K8s CronJobs for platform-level schedules

Security requirements (TSA §32):
- Non-root containers
- Read-only root filesystem where possible
- Signed images
- Resource limits on all pods
- Network policies for pod-to-pod isolation

## Reason

- TSA §2: "Infrastructure: Kubernetes on AWS, Azure or Google Cloud."
- K8s provides: HPA for traffic spikes, rolling deployments for zero-downtime, liveness/readiness probes, CronJob primitives.
- Cloud-portable: same K8s manifests (with cloud-specific storage/networking annotations) deploy to any cloud.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| AWS ECS/Fargate only | AWS-specific; not cloud-portable per ADR-009 |
| Serverless (Lambda/Cloud Functions) | Cold-start violates 2s attendance SLO; payroll calculations are long-running |
| Docker Compose only | Not production-grade; no rolling deploys, no HPA |

## Consequences

- **Positive:** Cloud-portable, industry-standard, rich ecosystem.
- **Positive:** HPA allows cost-efficient auto-scaling.
- **Negative:** Kubernetes operational complexity — requires DevOps expertise and monitoring.
- **Negative:** Local dev uses Docker Compose (not K8s) — small parity gap mitigated by environment variable configuration consistency.
