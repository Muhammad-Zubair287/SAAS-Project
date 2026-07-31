# ADR-006 — S3-Compatible Object Storage for Binary Documents

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-006, TSA §3

---

## Context

The platform must store binary documents: employee identity documents, contracts, payslips (PDF), report exports, and biometric data. These files must be encrypted, tenant-isolated, and served via time-limited pre-signed URLs.

## Decision

Use AWS S3 as the reference object storage implementation. All file access goes through server-generated pre-signed URLs (time-limited). No direct public bucket access.

Tenant isolation is enforced via path prefix: `s3://<bucket>/<tenant_id>/<module>/<file_id>`.

Data classification drives encryption:
- `Confidential` and above: server-side encryption (SSE-S3 or SSE-KMS).
- `Restricted` and `Secret` (payslips, payroll exports): envelope encryption with KMS.

Lifecycle policies:
- Temporary upload sessions: 24-hour expiry.
- Payslips: 7-year retention minimum.
- Report exports: 90-day retention (configurable).

## Reason

- TSA §3: "Object storage holds employee documents, exports and generated payslips through secure, time-limited access links."
- S3-compatible API allows portability to Azure Blob Storage or GCP Cloud Storage without application code changes (mapped per ADR-009).
- Pre-signed URLs keep binary data off the API tier — reduces bandwidth and server memory pressure.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Database BLOBs | Bloats database; poor performance for large files; complicates backups |
| Local filesystem | Not cloud-portable; no redundancy; fails on multi-pod deployments |
| CDN-hosted public files | Unacceptable for Restricted/Secret documents |

## Consequences

- **Positive:** Tenant data is isolated at the storage path level.
- **Positive:** Time-limited URLs prevent link sharing after expiry.
- **Negative:** Requires pre-signed URL generation on every file access — adds one API call per download.
- **Negative:** KMS integration adds latency for envelope encryption/decryption of payroll exports.
