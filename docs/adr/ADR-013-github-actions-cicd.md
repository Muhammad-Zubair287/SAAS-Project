# ADR-013 — GitHub Actions as CI/CD Platform

**Status:** Accepted
**Date:** 2025 (architectural decision)
**Source:** TSA §39, TSA §57 — "CI/CD tooling: GitHub Actions (or Azure DevOps or GitLab CI as alternatives)"

---

## Context

TSA §39 defines a full CI/CD pipeline (PR → Build → Test → Scan → Package → Dev → QA → UAT → Production). TSA §57 lists GitHub Actions as the first option with Azure DevOps and GitLab CI as alternatives. A selection must be made before Phase 2.

## Decision

Use **GitHub Actions** as the CI/CD platform.

## Reason

- TSA §57 lists GitHub Actions first — treated as the preferred option.
- Repository is hosted on GitHub — GitHub Actions requires no additional integration.
- GitHub Actions marketplace provides pre-built actions for: SAST (CodeQL), container scanning (Trivy), DAST (OWASP ZAP), SBOM generation, Helm deploy, Terraform apply.
- Secrets management integrates directly with AWS Secrets Manager via OIDC (no static long-lived credentials).
- Cost: free for public repos; competitive pricing for private repos at startup scale.

## Pipeline Stages (per TSA §39)

```
1. Pull Request      Branch policy, required reviewers, status checks
2. Build             Reproducible build, SBOM generation
3. Test              Unit, API, Integration, Tenant Isolation, Payroll Regression
4. Security Scan     SAST (CodeQL) + DAST + Dependency scan + Container scan + IaC scan
5. Package           Signed immutable container image (cosign)
6. Dev Deploy        Auto deploy + smoke tests
7. QA Deploy         Performance subset + security tests
8. UAT Deploy        Migration rehearsal + business acceptance
9. Production        Canary/Blue-Green + health observation + automatic rollback
```

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Azure DevOps | No advantage for GitHub-hosted repository; adds cross-platform complexity |
| GitLab CI | Would require migrating repository to GitLab; not justified at MVP |
| Jenkins | Significant self-hosted operational overhead; no managed service option |
| CircleCI | Smaller ecosystem; GitHub Actions marketplace is larger |

## Consequences

- **Positive:** Native GitHub integration — no webhook setup, direct PR status checks.
- **Positive:** OIDC-based AWS authentication — no static long-lived CI credentials.
- **Negative:** GitHub Actions vendor lock-in for CI — mitigated by the pipeline being expressible as standard shell scripts that can run on any runner.
- **Negative:** Parallel job limits on free/starter tier — upgrade required at team scale.
