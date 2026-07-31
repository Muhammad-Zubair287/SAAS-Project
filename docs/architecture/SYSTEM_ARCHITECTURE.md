# System Architecture

> Based exclusively on: `Workforce_Cloud_OS_MVP_Technical_Solution_Architecture.pdf` (TSA), §3–§12, §36.

---

## 1. Architecture Statement

> "One deployable platform, clearly owned domains, tenant isolation by design, deterministic payroll, auditable workflows and cloud-portable operations."
> — TSA §58

**Pattern:** Modular Monolith deployed on Kubernetes
**Primary cloud:** AWS (EKS reference); Azure and GCP equivalents mapped
**Data:** Shared PostgreSQL database + shared schema + PostgreSQL RLS (ADR-002)

---

## 2. High-Level System Context

```mermaid
graph TB
    subgraph External Actors
        EMP[Employees\nMobile & Web]
        MGR[Managers\nWeb]
        HR[HR / Payroll\nWeb]
        PLAT[Platform Operations\nWeb]
        IDP[Identity Providers\nEntra ID / Google]
        BIO[Biometric Devices\nAttendance Hardware]
        ERP[ERP / Finance\nAccounting Systems]
        NOTIF[Notification Providers\nEmail / SMS / Push]
        AUD[Auditors\nRead-only]
    end

    subgraph Workforce Cloud OS
        WEB[Web Application\nNext.js]
        API[API Server\nNestJS]
        WRK[Workers\nBullMQ]
        CON[Connector Runtime\nIntegrations]
    end

    subgraph Data Layer
        PG[(PostgreSQL\nPrimary Database)]
        REDIS[(Redis\nCache + Queues)]
        S3[(Object Storage\nDocuments + Exports)]
    end

    EMP --> WEB
    MGR --> WEB
    HR --> WEB
    PLAT --> WEB
    AUD --> WEB
    WEB --> API
    API --> PG
    API --> REDIS
    API --> S3
    WRK --> PG
    WRK --> REDIS
    WRK --> S3
    CON --> API
    IDP --> API
    BIO --> CON
    ERP --> CON
    NOTIF --> WRK
```

---

## 3. Layered Logical Architecture

```mermaid
graph TB
    subgraph User Channels
        BROWSER[Browser\nNext.js SSR+CSR]
        MOBILE[Mobile App\nReact Native]
        PARTNER[Partner API\nREST / Webhook]
    end

    subgraph Edge Controls
        WAF[WAF + CDN\nCloudFront]
        INGRESS[K8s Ingress\nTLS Termination]
        RATELIMIT[Rate Limiter\nRedis counters]
    end

    subgraph Application Domains
        TENANT_M[Platform & Tenant\nM01]
        AUTH_M[Authentication & IAM\nM02]
        ORG_M[Organisation\nM03]
        EMP_M[Employee Core HR\nM04]
        ONB_M[Onboarding & Docs\nM05]
        ATT_M[Attendance\nM06]
        SHF_M[Shifts\nM07]
        LVE_M[Leave\nM08]
        WFL_M[Workflow\nM09]
        PAY_M[Payroll\nM10]
        ESS_M[ESS\nM11]
        MSS_M[MSS\nM12]
        NTF_M[Notifications\nM13]
        RPT_M[Reports\nM14]
        INT_M[Integrations\nM15]
        SUB_M[Subscriptions\nM16]
        AUD_M[Audit\nM17]
    end

    subgraph Shared Platform Services
        TENANT_CTX[Tenant Context\nJWT + SET LOCAL]
        AUDIT_INT[Audit Interceptor\nAppend-only log]
        POLICY_SVC[Policy Service\nEffective-dated rules]
        OUTBOX[Transactional Outbox\nEvent relay]
        JOBS[Job Engine\nBullMQ]
    end

    subgraph Data Services
        POSTGRES[(PostgreSQL + RLS)]
        REDIS_DS[(Redis)]
        STORAGE[(Object Storage)]
    end

    BROWSER --> WAF --> INGRESS
    MOBILE --> WAF
    PARTNER --> WAF
    INGRESS --> RATELIMIT
    RATELIMIT --> AUTH_M
    AUTH_M --> TENANT_CTX
    TENANT_CTX --> ORG_M & EMP_M & ATT_M & LVE_M & PAY_M & WFL_M
    OUTBOX --> JOBS
    AUDIT_INT --> AUD_M
    ORG_M & EMP_M & ATT_M & LVE_M & PAY_M --> POSTGRES
    JOBS --> REDIS_DS
    PAY_M & ONB_M --> STORAGE
```

---

## 4. Multi-Tenant Request Flow

```mermaid
sequenceDiagram
    participant Browser
    participant WAF
    participant API as NestJS API
    participant Auth as Auth Guard
    participant RBAC as RBAC Guard
    participant Svc as Application Service
    participant DB as PostgreSQL + RLS

    Browser->>WAF: HTTPS Request + JWT Bearer
    WAF->>API: Forward (rate-limited, WAF-filtered)
    API->>Auth: Verify JWT signature + expiry
    Auth->>Auth: Extract tenant_id from JWT claim
    Auth->>RBAC: Check permission(action, resource, scope)
    RBAC->>Svc: Authorised — execute use case
    Svc->>DB: BEGIN TRANSACTION
    Svc->>DB: SET LOCAL app.tenant_id = '<uuid>'
    Svc->>DB: SELECT / INSERT / UPDATE (RLS enforced)
    DB-->>Svc: Result (only this tenant's rows)
    Svc->>DB: Write to outbox_event (same transaction)
    Svc->>DB: COMMIT
    Svc-->>Browser: 200 OK + ETag
```

---

## 5. Domain Module Boundaries

```mermaid
graph LR
    subgraph Foundation
        M01[M01\nPlatform & Tenant]
        M02[M02\nAuthentication & IAM]
    end

    subgraph Organisation & People
        M03[M03\nOrganisation]
        M04[M04\nEmployee Core HR]
        M05[M05\nOnboarding & Docs]
    end

    subgraph Workforce Operations
        M06[M06\nAttendance]
        M07[M07\nShifts & Rosters]
        M08[M08\nLeave]
        M09[M09\nWorkflow Engine]
    end

    subgraph Financial
        M10[M10\nPayroll]
    end

    subgraph Self-Service
        M11[M11\nESS]
        M12[M12\nMSS]
    end

    subgraph Platform Services
        M13[M13\nNotifications]
        M14[M14\nReports]
        M15[M15\nIntegrations]
        M16[M16\nSubscriptions]
        M17[M17\nAudit]
    end

    M01 --> M02
    M01 & M02 --> M03 & M04
    M04 --> M05
    M03 & M04 --> M06 & M07 & M08
    M06 & M07 --> M09
    M08 --> M09
    M06 & M08 --> M10
    M04 --> M10
    M10 & M06 & M08 --> M11
    M06 & M08 & M09 --> M12
    M09 & M06 & M08 & M10 --> M13
    M04 & M06 & M08 & M10 --> M14
    M04 & M06 & M10 --> M15
    M01 --> M16
    M02 & M09 & M10 & M04 --> M17
```

---

## 6. Attendance Pipeline

```mermaid
sequenceDiagram
    participant Source as Source\n(Biometric/Web/Mobile)
    participant API as Attendance API
    participant Raw as raw_attendance_event\n(Append-only)
    participant Map as Map Worker
    participant Calc as Calculation Worker
    participant Exc as Exception Engine
    participant Lock as Period Lock

    Source->>API: POST /api/v1/attendance/events\nIdempotency-Key: <id>
    API->>Raw: Persist immutable raw event (UTC)
    API-->>Source: 202 Accepted (within 2s p95)
    Raw->>Map: Resolve employee + device
    Map->>Calc: Normalise → calculate shift match,\nstatus, hours, OT
    Calc->>Exc: Exception if policy violated
    Exc->>+API: Raise AttendanceExceptionRaised event
    Note over Calc: AttendanceCalculated event published via outbox
    Calc->>Lock: Period lock check
    Note over Lock: Locked period → reject corrections without elevated role
```

---

## 7. Payroll Pipeline

```mermaid
graph LR
    CAL[Payroll Calendar] --> RUN[Create Run\nvia API]
    RUN --> SNAP[Immutable Input Snapshot\npeople + comp + att + leave + formulas]
    SNAP --> ENGINE[Calculation Engine\nFixed-precision decimal\nVersioned formula pack]
    ENGINE --> VAL[Validation\nBlocking errors + warnings]
    VAL --> VAR[Variance Analysis\nvs prior period]
    VAR --> REVIEW[HR Review]
    REVIEW --> APPROVE[MFA-gated Approval\nSoD enforced]
    APPROVE --> LOCK[Immutable Lock\nVersion stamped]
    LOCK --> PAYSLIP[Payslip Generation\nProtected PDF]
    LOCK --> EXPORT[Bank / Tax Export\nStatutory files]
    LOCK --> AUDIT[Audit Record\nAppend-only]
```

---

## 8. Kubernetes Deployment Topology

```mermaid
graph TB
    subgraph AWS EKS Cluster
        subgraph Ingress Tier
            ING[K8s Ingress Controller\nTLS + WAF Integration]
        end

        subgraph Application Tier
            WEB_POD[Web Pods\nNext.js x3+ replicas\nHPA enabled]
            API_POD[API Pods\nNestJS x3+ replicas\nHPA enabled]
        end

        subgraph Worker Tier
            W_NTF[Notification Worker\nBullMQ consumer]
            W_IMP[Import Worker\nCSV + migration]
            W_EXP[Export Worker\nReports + payslips]
            W_ATT[Attendance Worker\nNormalisation + calculation]
            W_PAY[Payroll Worker\nBatch calculation]
            W_INT[Integration Worker\nConnector sync]
        end

        subgraph Scheduled Jobs
            CJ[K8s CronJobs\nPlatform schedules]
        end
    end

    subgraph AWS Managed Services
        RDS[(RDS PostgreSQL\nMulti-AZ)]
        EC[(ElastiCache Redis\nCluster mode)]
        S3_STORE[(S3\nDocuments + Exports)]
        SM[Secrets Manager\nCredentials + Keys]
        KMS[KMS\nEncryption keys]
        CF[CloudFront + WAF]
    end

    CF --> ING --> WEB_POD
    ING --> API_POD
    API_POD --> RDS
    API_POD --> EC
    API_POD --> S3_STORE
    W_NTF & W_IMP & W_EXP & W_ATT & W_PAY & W_INT --> EC
    W_NTF & W_IMP & W_EXP & W_ATT & W_PAY & W_INT --> RDS
    W_EXP & W_PAY --> S3_STORE
    API_POD & W_PAY --> SM
    SM --> KMS
```

---

## 9. Event Architecture (Transactional Outbox)

```mermaid
sequenceDiagram
    participant App as Application Service
    participant DB as PostgreSQL\n(business table + outbox)
    participant Relay as Outbox Relay Worker
    participant Queue as BullMQ / Broker
    participant Consumer as Event Consumer\n(idempotent)

    App->>DB: BEGIN TRANSACTION
    App->>DB: Write business state
    App->>DB: Write outbox_event (eventId, type, payload)
    App->>DB: COMMIT
    Relay->>DB: Poll committed outbox events
    Relay->>Queue: Publish (at-least-once)
    DB->>Relay: Mark as published
    Queue->>Consumer: Deliver event
    Consumer->>Consumer: Check eventId for idempotency
    Consumer->>Consumer: Process (idempotent)
```

---

## 10. Security Architecture Layers

```mermaid
graph TB
    subgraph Layer 1 - Edge
        WAF2[WAF + DDoS Protection]
        TLS[TLS 1.2+ Termination]
        RATE[Rate Limiting\nPer tenant + per token]
    end

    subgraph Layer 2 - Application
        JWT_V[JWT Verification\ntenant_id claim]
        RBAC2[RBAC + Scope Check\naction + resource + scope]
        INPUT[Input Validation\nZod + class-validator]
        CSRF[CSRF Protection\nSameSite + CSRF tokens]
    end

    subgraph Layer 3 - Data
        SET_LOCAL[SET LOCAL app.tenant_id\nTransaction-scoped]
        RLS2[PostgreSQL RLS\nRow-level policy]
        ENCRYPT[Encryption at Rest\nAES-256 + KMS]
        OBJ_PREFIX[Object Storage\nTenant-prefixed keys]
    end

    subgraph Layer 4 - Audit
        AUDIT_LOG[Audit Interceptor\nAll Restricted/Secret mutations]
        IMMUTABLE[Append-only Audit Store\nIntegrity verified]
    end

    WAF2 --> TLS --> RATE --> JWT_V --> RBAC2 --> INPUT
    INPUT --> SET_LOCAL --> RLS2
    RLS2 --> ENCRYPT
    ENCRYPT --> OBJ_PREFIX
    INPUT --> AUDIT_LOG --> IMMUTABLE
```

---

## 11. CI/CD Pipeline

```mermaid
graph LR
    PR[Pull Request\nBranch policy + review] -->
    BUILD[Build\nReproducible + SBOM] -->
    TEST[Tests\nUnit + API + Integration\n+ Tenant Isolation\n+ Payroll Regression] -->
    SCAN[Security Scan\nSAST + DAST + Dependencies\n+ Container + IaC] -->
    PACKAGE[Package\nSigned immutable image] -->
    DEV[Dev Deploy\nAuto + smoke tests] -->
    QA[QA Deploy\nPerformance subset\n+ Security tests] -->
    UAT[UAT Deploy\nMigration rehearsal\n+ Business acceptance] -->
    PROD[Production\nCanary/Blue-Green\n+ Health observation]
```

---

## 12. Component Descriptions

| Component | Technology | Responsibility |
|-----------|-----------|---------------|
| Web | Next.js (App Router) | SSR + CSR for all user personas; route groups `(platform)`, `(tenant)`, `(employee)`, `(auth)` |
| API | NestJS (modular monolith) | REST endpoints, application services, domain logic, outbox writes |
| Workers | BullMQ consumers | Async processing: notifications, imports, exports, attendance normalisation, payroll calculation, connector sync |
| Connector Runtime | NestJS (isolated) | Integration adapters for biometric devices, ERP, bank, identity providers |
| PostgreSQL | Managed RDS | Authoritative transactional store; RLS enforces tenant isolation; PITR backups |
| Redis | Managed ElastiCache | Cache (tenant-keyed + TTL), distributed locks, BullMQ queue state |
| Object Storage | AWS S3 | Encrypted documents, exports, payslips; tenant-prefixed; lifecycle policies |
| Outbox Relay | Background job | Polls committed outbox events; publishes to BullMQ; ensures at-least-once delivery |
| WAF + CDN | CloudFront + AWS WAF | DDoS protection, TLS, rate limiting at edge |
| Secrets Manager | AWS Secrets Manager + KMS | All secrets and encryption keys; rotated per policy |
| OpenTelemetry | OTel SDK | Vendor-neutral traces, metrics, logs across all components |
