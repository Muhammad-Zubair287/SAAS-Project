# ADR-012 — Frontend Library Choices (Tailwind, Radix UI, Zustand, TanStack Query, RHF+Zod, next-intl)

**Status:** Accepted
**Date:** 2025 (architectural decisions)
**Source:** TSA §10 (requirements; specific libraries not named)

---

## Context

TSA §10 defines frontend requirements without naming specific libraries for: CSS framework, component primitives, client state, server state, forms, and i18n. Selections must be made before Phase 2 frontend implementation begins.

## Decisions

### Tailwind CSS + CSS Variables (Design Tokens)

**Requirement:** TSA §10 — "Figma tokens mapped to CSS variables and typed component properties."
**Decision:** Tailwind CSS with CSS custom properties for design token mapping.
**Reason:** Tailwind is the dominant CSS-variable-compatible framework for Next.js App Router. CSS variables allow runtime token overrides (e.g., RTL direction, tenant theme). No alternative produces the same output with less configuration.

### Radix UI Primitives (Component Library Base)

**Requirement:** TSA §10 — "Components include all required states, RTL and accessibility behaviour." WCAG 2.1 AA is mandatory.
**Decision:** Internal component library (`packages/ui`) built on Radix UI primitives.
**Reason:** Radix provides unstyled, accessible, keyboard-navigable, RTL-compatible primitives (Dialog, Select, Popover, etc.) without opinionated styling. This allows full design system control while inheriting correct accessibility behaviour. Alternatives (Headless UI, Ark UI) are viable but have smaller communities.

### Zustand (Client State)

**Requirement:** TSA §10 — "Local UI state remains component scoped; avoid a single global mutable store."
**Decision:** Zustand for cross-component client state that is not server data.
**Reason:** Zustand is a minimal, non-global-singleton store. Stores are instantiated per feature slice, not as one global state tree — directly aligned with the "avoid a single global mutable store" directive. Lighter than Redux; simpler than Jotai for mid-complexity state.

### TanStack Query (Server State)

**Requirement:** TSA §10 — "Server state managed through a query/cache library."
**Decision:** TanStack Query (React Query v5).
**Reason:** TanStack Query is the leading React server-state management library. It handles: caching, background refetching, optimistic updates, request deduplication, and stale-while-revalidate — all required for the dashboard-heavy UI. The alternative (SWR) lacks mutation optimistic update capabilities required for this product.

### React Hook Form + Zod (Forms)

**Requirement:** TSA §10 — "Schema-driven validation shared with API contracts where practical."
**Decision:** React Hook Form for form state management; Zod for schema-driven validation shared between frontend and API (via `packages/types`).
**Reason:** RHF is the performance leader for large React forms (uncontrolled components, minimal re-renders). Zod schemas defined in `packages/types` are imported by both the NestJS DTO validators and the frontend form validators — single source of truth for validation rules.

### next-intl (i18n)

**Requirement:** TSA §10 — "Locale-aware message catalogues, date/time and currency formatting, direction-aware layout." BRD §15.7 — English + Urdu, RTL.
**Decision:** next-intl with ICU MessageFormat.
**Reason:** next-intl is the App Router-native i18n library with Server Component support. ICU MessageFormat handles plurals and gender-specific messages required for Urdu. RTL direction is applied via `dir` HTML attribute based on locale, supported natively by next-intl.

### Recharts / Nivo (Charts)

**Requirement:** TSA §10 — dashboards require charts.
**Decision:** DEFERRED — decision between Recharts and Nivo is required before Phase 7 (Self-Service & Reporting). Both are React-native SVG chart libraries. Final selection pending Phase 7 sprint planning.

## Consequences

- **Positive:** All selections are TypeScript-first and integrate natively with Next.js App Router.
- **Positive:** Zod schema sharing between frontend and backend reduces validation duplication.
- **Positive:** Radix UI provides WCAG 2.1 AA and RTL support out of the box.
- **Negative:** Multiple libraries must be kept in sync (TanStack Query version upgrades have breaking changes).
- **Negative:** Chart library decision remains open — must be resolved before Phase 7.
