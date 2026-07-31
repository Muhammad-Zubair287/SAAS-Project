# Technology Stack Verification Report

> Source of truth: Nine specification PDFs, primarily `Workforce_Cloud_OS_MVP_Technical_Solution_Architecture.pdf` (TSA) and `Workforce_Cloud_OS_Business_Requirements.pdf` (BRD).
>
> Classification categories:
> - **Required** — Explicitly mandated in a specification document.
> - **Optional Infrastructure** — Documented as optional, environment-specific, or Enterprise-tier only.
> - **Future Enhancement** — Documented but explicitly deferred post-MVP.
> - **Architectural Decision** — Implementation choice made to fulfil a documented requirement where the document did not name a specific tool.

---

## 1. Backend Runtime & Framework

### Node.js (LTS)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2 "Source Baseline and Approved Constraints" — "Backend: Node.js with NestJS" |
| **Notes** | Mandated. No alternative permitted without an ADR update. |

### NestJS (TypeScript)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2, TSA §11 — "NestJS should be organised by business domain"; TSA §3 Executive Summary |
| **Notes** | Mandated. TypeScript strict mode is required by coding standards. |

### Prisma ORM
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §11 specifies the repository pattern and tenant-safe persistence; it does not name an ORM. |
| **Reason** | Prisma is the leading TypeScript-native ORM with first-class PostgreSQL + RLS support. Decision logged as ADR-011. |
| **Alternatives Considered** | TypeORM, Drizzle, raw pg client |

### class-validator + class-transformer
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §11 requires "validate syntax, business preconditions and authorisation"; no specific library named. |
| **Reason** | Native to NestJS DI ecosystem; decorator-based validation aligns with NestJS DTO pattern. |

---

## 2. Frontend

### Next.js (App Router, TypeScript)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2 — "Frontend: React and Next.js multilingual responsive web application"; TSA §10 — specifies `app/(platform)/`, `app/(tenant)/`, `app/(employee)/` structure |
| **Notes** | App Router (route groups) explicitly referenced in TSA §10. |

### React 18+
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2 — "React and Next.js"; BRD §16 — "React and Next.js" |

### Tailwind CSS + CSS Variables (Design Tokens)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — "Figma tokens mapped to CSS variables and typed component properties"; Design System PDF specifies the token system. No specific CSS framework named. |
| **Reason** | Tailwind is the idiomatic CSS-variable-compatible framework for Next.js; aligns with design token mapping requirement. Decision logged as ADR-012. |

### Zustand (Client State)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — "local UI state remains component scoped; avoid a single global mutable store." |
| **Reason** | Zustand is a lightweight non-global store that aligns with the "avoid single global mutable store" directive. Decision logged as ADR-012. |

### TanStack Query (Server State)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — "Server state managed through a query/cache library." Query/cache library explicitly required; specific library not named. |
| **Reason** | TanStack Query (React Query) is the leading React server-state library. Decision logged as ADR-012. |

### React Hook Form + Zod
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — "Schema-driven validation shared with API contracts where practical." Schema-driven forms required; specific library not named. |
| **Reason** | RHF + Zod enables schema-sharing between frontend validation and API contracts (Zod ↔ OpenAPI). |

### next-intl (ICU MessageFormat)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — "Locale-aware message catalogues, date/time and currency formatting, direction-aware layout." BRD §15.7 — English + Urdu, RTL. |
| **Reason** | next-intl is the App Router-native i18n library; ICU MessageFormat required for plurals. |

### Recharts / Nivo (Charts)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — dashboards require charts; no library named. |
| **Reason** | Both are React-native SVG chart libraries. Final selection between the two is deferred to Phase 6. |

### Radix UI Primitives (Component Library Base)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA §10 — "components include all required states, RTL and accessibility behaviour." |
| **Reason** | Radix provides unstyled, accessible, RTL-compatible primitives aligned with WCAG 2.1 AA requirement. Decision logged as ADR-012. |

---

## 3. Mobile

### React Native (iOS + Android)
| Field | Value |
|-------|-------|
| **Status** | Required (Should Have — MVP) |
| **Source** | BRD §16 — "Mobile: React Native or native applications"; BRD §25 — Mobile app is "Should Have" in MVP. TSA §2 confirms React Native. |
| **Notes** | BRD §28 Open Decision #1: "Will the mobile application use React Native or separate native applications?" — TSA resolved this as React Native. Mobile is "Should Have" priority, not "Must Have" for Day 1. |

### WatermelonDB or MMKV (Offline Cache)
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision (Mobile) |
| **Source** | TSA §43 — attendance peaks are bursty; ingest remains stateless; BRD §23.3 — "Offline or low-connectivity locations." |
| **Reason** | Local attendance caching required for offline resilience. Final selection between WatermelonDB and MMKV requires mobile spike. Requires User Approval before implementation. |

---

## 4. Primary Database

### PostgreSQL
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2 — "Database: PostgreSQL with tenant-aware design and row-level security"; TSA §16 Data Architecture |
| **Notes** | Shared DB, shared schema, tenant_id + RLS is the mandated pattern (ADR-002). |

### PostgreSQL Row-Level Security
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2, TSA §13, TSA §55 Acceptance Criteria #5 — "PostgreSQL RLS is enabled and tested for all tenant-owned tables." |

### Expand-Contract Migrations (SQL)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA ADR-010 — "Database migrations use expand-contract"; TSA §40 |

---

## 5. Caching & Queue

### Redis
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §3 — "Redis supports caching, distributed locks, rate-limiting counters and background job queues"; TSA ADR-005 |
| **Notes** | "Redis is not the system of record." Business source data stays in PostgreSQL. |

### BullMQ (Redis-backed Job Queues)
| Field | Value |
|-------|-------|
| **Status** | Required (ADR-005 explicitly names Redis-backed queues; BullMQ is the standard NestJS queue adapter) |
| **Source** | TSA §57 Open Decisions — "Queue technology: Redis/BullMQ for MVP; confirm managed persistence and operational guarantees." |
| **Notes** | TSA §57 names BullMQ explicitly as the MVP queue technology. |

---

## 6. Events & Messaging

### Transactional Outbox (PostgreSQL table)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA ADR-004 — "Transactional outbox for domain events"; TSA §21 — "The MVP uses Redis-backed queues combined with a PostgreSQL transactional outbox." |

### Kafka
| Field | Value |
|-------|-------|
| **Status** | Optional Infrastructure (Enterprise tier / post-MVP) |
| **Source** | TSA §21 — MVP uses Redis + outbox; Kafka not mentioned as MVP requirement. Referenced in architecture synthesis as broker option for Enterprise scale. |
| **Reason** | TSA §12 Service Extraction Strategy — streaming platform only after scale is measured. |

### AWS SNS/SQS
| Field | Value |
|-------|-------|
| **Status** | Optional Infrastructure |
| **Source** | Referenced as reference cloud broker option for scale. Not required for MVP; outbox → BullMQ satisfies MVP. |

### Azure Service Bus / GCP Pub/Sub
| Field | Value |
|-------|-------|
| **Status** | Optional Infrastructure |
| **Source** | TSA ADR-009 — multi-cloud mapping; cloud-specific brokers are infrastructure equivalents, not MVP mandates. |

### AsyncAPI 3.0 (Event Schema)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | API & Event Contract Specification PDF defines AsyncAPI 3.0 as the event contract format. |

### HMAC-SHA256 (Webhook Signing)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §20 — "Signed payloads, event IDs, retry with backoff"; API Spec defines HMAC-SHA256 signature scheme. |

---

## 7. Object Storage

### S3-Compatible Object Storage (AWS S3 reference)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA ADR-006 — "Object storage for binary documents"; TSA §3 — "Object storage holds employee documents, exports and generated payslips through secure, time-limited access links." |

---

## 8. Authentication & Identity

### OAuth 2.0 / OIDC / JWT
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2, TSA §14 — "OIDC/OAuth 2.0"; BRD §15.1; BRD §16 — "Authentication: OAuth 2.0, JWT and SSO" |

### Microsoft Entra ID SSO
| Field | Value |
|-------|-------|
| **Status** | Required (Should Have) |
| **Source** | BRD §11.20 BR-INT-002; TSA §14 — "enterprise SSO uses Entra ID, Google Workspace or compatible providers" |

### Google Workspace SSO
| Field | Value |
|-------|-------|
| **Status** | Required (Should Have) |
| **Source** | BRD §11.20 BR-INT-002; TSA §14 |

### TOTP + SMS/Email OTP (MFA)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §14 — "Required for platform administrators and configurable for payroll approvers, tenant administrators and high-risk actions." BRD §15.1 |

### WebAuthn
| Field | Value |
|-------|-------|
| **Status** | Future Enhancement |
| **Source** | CLAUDE.md — "WebAuthn (roadmap)"; not required for MVP. |

---

## 9. Infrastructure & DevOps

### Docker
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA ADR-007 — "Kubernetes-managed runtime"; TSA §36 — all workloads run as containers; TSA §32 — "non-root containers, read-only filesystem where possible, signed images." |

### Kubernetes (EKS reference)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §2 — "Infrastructure: Kubernetes on AWS, Azure or Google Cloud"; TSA ADR-007; TSA §36 — full Kubernetes architecture defined. |

### Helm / Kustomize
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §38 — "Use Helm or Kustomize for Kubernetes application manifests." |
| **Notes** | Choice between Helm and Kustomize is an open architecture decision. |

### Terraform (IaC)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §38 — "Use Terraform or the organisation-approved equivalent"; TSA §57 Open Decision: "Infrastructure-as-code standard: Terraform or approved organisation alternative." |

### GitHub Actions (CI/CD)
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA §39 — full CI/CD pipeline defined; TSA §57 Open Decision lists GitHub Actions as the first option. |
| **Notes** | TSA §57 lists Azure DevOps and GitLab as alternatives. GitHub Actions selected as architectural decision (ADR-013). |

### OpenTelemetry
| Field | Value |
|-------|-------|
| **Status** | Required |
| **Source** | TSA ADR-008 — "OpenTelemetry standard. Vendor-neutral traces, metrics and log correlation."; TSA §41 |

### Prometheus / Grafana
| Field | Value |
|-------|-------|
| **Status** | Required (Observability backend) |
| **Source** | TSA §41 observability — metrics and dashboards; TSA §35 reference deployment — "Telemetry: managed or vendor platform via OTel." |

### Loki / Elastic (Log Aggregation)
| Field | Value |
|-------|-------|
| **Status** | Required (one of the two) |
| **Source** | TSA §41 — log aggregation required; specific tool is architectural decision. |

### CloudFront + AWS WAF
| Field | Value |
|-------|-------|
| **Status** | Optional Infrastructure (AWS reference) |
| **Source** | TSA §35 reference deployment; equivalent cloud services for Azure/GCP are also documented. |
| **Notes** | Required as a capability (CDN + WAF); AWS implementation is the reference, not a mandate. |

### AWS Secrets Manager / KMS
| Field | Value |
|-------|-------|
| **Status** | Optional Infrastructure (AWS reference) |
| **Source** | TSA §32 — "Cloud secret manager, workload identity, rotation and no plaintext secrets"; TSA §35 — AWS reference. Azure Key Vault and GCP Secret Manager are mapped equivalents. |

### OpenSearch (Search / Reporting)
| Field | Value |
|-------|-------|
| **Status** | Optional Infrastructure (Enterprise tier) |
| **Source** | TSA §29 — "A separate analytical warehouse should not be introduced until measured workload or product analytics needs justify it." |
| **Notes** | Not required for MVP. Introduced only when transactional reporting impact is measured. |

---

## 10. Monorepo Tooling

### Turborepo
| Field | Value |
|-------|-------|
| **Status** | Architectural Decision |
| **Source** | TSA Appendix B specifies the monorepo structure but does not name a build orchestration tool. |
| **Reason** | Turborepo is the leading monorepo build system for Next.js + Node.js workspaces. Decision logged as ADR-014. |

---

## Summary Table

| Technology | Status | Explicitly Named in Docs |
|-----------|--------|--------------------------|
| Node.js | Required | Yes |
| NestJS | Required | Yes |
| Prisma | Architectural Decision | No |
| class-validator | Architectural Decision | No |
| Next.js | Required | Yes |
| React 18+ | Required | Yes |
| Tailwind CSS | Architectural Decision | No |
| Zustand | Architectural Decision | No |
| TanStack Query | Architectural Decision | No |
| React Hook Form + Zod | Architectural Decision | No |
| next-intl | Architectural Decision | No |
| Recharts / Nivo | Architectural Decision | No |
| Radix UI | Architectural Decision | No |
| React Native | Required (Should Have) | Yes |
| WatermelonDB / MMKV | Architectural Decision | No |
| PostgreSQL | Required | Yes |
| PostgreSQL RLS | Required | Yes |
| Redis | Required | Yes |
| BullMQ | Required | Yes (named in TSA §57) |
| Transactional Outbox | Required | Yes |
| Kafka | Optional Infrastructure | No (inferred) |
| SNS/SQS | Optional Infrastructure | No (mapping only) |
| AsyncAPI 3.0 | Required | Yes |
| HMAC-SHA256 | Required | Yes |
| S3 / Object Storage | Required | Yes |
| OAuth 2.0 / OIDC / JWT | Required | Yes |
| Entra ID SSO | Required (Should Have) | Yes |
| Google Workspace SSO | Required (Should Have) | Yes |
| TOTP + OTP MFA | Required | Yes |
| WebAuthn | Future Enhancement | Yes (roadmap) |
| Docker | Required | Yes |
| Kubernetes | Required | Yes |
| Helm / Kustomize | Required | Yes |
| Terraform | Required | Yes |
| GitHub Actions | Required | Yes (TSA §57) |
| OpenTelemetry | Required | Yes |
| Prometheus / Grafana | Required | Yes |
| Loki / Elastic | Required | Yes |
| CloudFront + WAF | Optional Infrastructure | Yes (AWS reference) |
| AWS Secrets Manager | Optional Infrastructure | Yes (AWS reference) |
| OpenSearch | Optional Infrastructure | Yes (Enterprise only) |
| Turborepo | Architectural Decision | No |

---

## Open Architecture Decisions Requiring User Approval

| Decision | Options | Priority |
|----------|---------|----------|
| Mobile offline cache library | WatermelonDB vs MMKV | Before mobile sprint |
| Chart library | Recharts vs Nivo | Before Phase 6 |
| Kubernetes manifest tooling | Helm vs Kustomize | Before Phase 2 |
| Log aggregation backend | Loki vs Elastic | Before Phase 2 |
| RDS variant | RDS PostgreSQL vs Aurora PostgreSQL | Before Phase 2 |
| Document malware scanning | Managed service vs containerised scanner | Before Phase 5 |
| Payroll PDF generation engine | Specific HTML/PDF library | Before Phase 5 |
