# ADR-009 — AWS as Reference Deployment; Multi-Cloud Portable Design

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-009, TSA §35

---

## Context

The platform targets global markets (Pakistan, GCC, UK/EU). Different enterprise customers or regional regulations may require deployment on Azure or GCP. The architecture must not be so AWS-specific that migration is a rewrite.

## Decision

AWS is the primary reference deployment. All cloud-specific services are abstracted behind infrastructure layers so that Azure and GCP equivalents can be substituted with configuration changes, not code changes.

Cloud service mapping:

| Category | AWS Reference | Azure Equivalent | GCP Equivalent |
|----------|--------------|-----------------|----------------|
| Kubernetes | EKS | AKS | GKE |
| Managed PostgreSQL | RDS PostgreSQL / Aurora | Azure Database for PostgreSQL | Cloud SQL for PostgreSQL |
| Managed Redis | ElastiCache | Azure Cache for Redis | Memorystore |
| Object Storage | S3 | Azure Blob Storage | GCS |
| Secrets Management | Secrets Manager + KMS | Azure Key Vault | GCP Secret Manager |
| CDN + WAF | CloudFront + AWS WAF | Azure Front Door + WAF | Cloud Armor + Cloud CDN |
| Container Registry | ECR | Azure Container Registry | Artifact Registry |
| CI/CD | GitHub Actions | GitHub Actions (same) | GitHub Actions (same) |

## Reason

- TSA ADR-009: "Multi-cloud portable design; AWS is reference; Azure and GCP mappings maintained."
- Enterprise customers in GCC markets often mandate Azure (Microsoft Entra ID integration).
- Pakistan public sector may require data residency in specific providers.
- Application code uses AWS SDK through thin adapters — swapping the adapter is a configuration change.

## Consequences

- **Positive:** Enterprise deals not blocked by cloud preference.
- **Positive:** Data residency compliance across regions.
- **Negative:** Must maintain adapter abstraction layer — adds a small overhead to infrastructure code.
- **Negative:** Some AWS features (e.g., Aurora serverless v2) do not have exact equivalents — documented per service.
