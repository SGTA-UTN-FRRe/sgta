---
document: TESTING
mode: evidence
type: project-testing-and-ci-guide
status: active
scope: current SGTA runtime and verification boundaries
authority: repository-evidence
---

# SGTA - Testing and CI

> Project-adapted testing and continuous-integration contract for the current SGTA repository.

# AI reading contract

Mode: **evidence**.

This document records the checks that exist in the repository today and adapts the global vocabulary from the engineering-playbook to SGTA's actual boundaries. The source code, package manifest, workflow, and test configuration remain authoritative.

Do not add a gate only because the global standard lists it. Add a gate when SGTA has a real boundary that the gate can verify.

## 1. Verification layers

The current repository uses these conceptual gates:

| Public check | Local command | Current responsibility |
| --- | --- | --- |
| `Quality` | `corepack pnpm lint` and `corepack pnpm typecheck` | ESLint and strict TypeScript validation. |
| `Tests` | `corepack pnpm test` | Co-located Vitest and Testing Library unit/component tests. |
| `Integration` | `corepack pnpm test:integration` | PostgreSQL-backed foundation, Tutor self-service, tutor/academic, scheduling/attendance, Admin hour accounting, consultation import/review, live overview, and canonical reporting coverage against an isolated Testcontainers database. |
| `E2E` | `corepack pnpm test:e2e` | Critical browser smoke plus authenticated Tutor self-service and Admin overview/reporting, tutor, scheduling/attendance, hour-accounting, and consultation workflow coverage through the running Next.js application. |
| `Production` | `corepack pnpm build` | Verification that the deployable Next.js build can be produced. |
| `CI Gate` | aggregate workflow job | Stable final result for branch protection and pull-request merge readiness. |

The visible GitHub check names are intentionally conceptual:

```text
CI / Quality
CI / Tests
CI / Integration
CI / E2E
CI / Production
CI / CI Gate
```

Runtime versions, package managers, test frameworks, browser engines, and internal job IDs do not belong in these public names.

## 2. Current test boundaries

### Unit and component tests

Tests live next to the implementation under `src/` and run in the Vitest `jsdom` environment. They verify shared primitives, route-level rendering, accessibility-oriented component behavior, and other behavior that does not require a running application or external infrastructure.

The unit/component suite remains independent of PostgreSQL, Docker, and external services. Do not call these tests integration tests merely because they use React Testing Library.

Authorization unit tests cover database-authoritative role and enabled-state
checks, plus a generic no-store response when the identity service fails. Audit
validation tests reject credential-bearing keys and request identifiers,
personal contact keys and values, oversized metadata, and non-IP values in the
audit address field. API request metadata accepts only bounded opaque request
IDs and syntactically valid IP addresses before it reaches audit persistence.

### Integration tests

Integration scenarios live under `tests/integration/` and run through the separate `vitest.integration.config.ts` configuration in the Node.js environment. Each run starts a fresh PostgreSQL container with Testcontainers, applies the committed Drizzle migration twice to prove rerunnability, uses deterministic synthetic fixtures, and tears down the pool and container after the suite. The feature coverage includes Career, Subject, Tutor, TutorSubject, TutorCycleMembership, scholarship-reference lifecycle, duplicate/conflict handling, open/closed cycle rules, derived Materias reconstruction, hour categories, activity origins, immutable movement reversals, safe audit actor attribution, transaction rollback, sensitive-metadata rejection, and Admin-versus-Tutor API/page authorization. Consultation unit and integration coverage verifies GET-only source access, import idempotency and source-change handling, anomaly and duplicate review, SUBJECT/GENERAL invariants, pending-classification exclusion, source-outage preservation, audit safety, transactional rollback, and Admin-only APIs.

Docker is a local and CI prerequisite for this boundary. Testcontainers chooses an available host port; no fixed port, local database, production URL, Google credential, or personal data is used. There is no separate Docker check or public Docker gate.

The on-demand PostgreSQL query-plan review runs with `corepack pnpm db:query-audit`. It starts a disposable PostgreSQL 16 container, reapplies the committed migrations, seeds deterministic synthetic rows, and prints `EXPLAIN (ANALYZE, BUFFERS)` output for current high-use query shapes. It is a review tool, not a CI gate or a numeric performance budget.

Tutor self-service integration scenarios prove owner resolution for linked Tutor
identities, the unlinked identity state, current-cycle and scholarship context,
safe DTOs without identity or contact leakage, effective special-plan reads,
balance and movement history, protected route authorization, and no mutation.
Hour-accounting integration scenarios also prove meeting, workshop, extraordinary,
and recovery recognition; inactive-category history; closed-cycle reads and
rejected writes; atomic bulk rollback; and actor-attributed bounded audit metadata.
Scheduling integration scenarios prove regular and special plan precedence and
fallback, stable occurrence materialization, assignment eligibility and overlap
constraints, historical reads, cycle write gates, audit attribution, and the
attendance path from Present/no movement through absence proposal, cancellation,
adjusted debit confirmation, correction/reversal linkage, recovery recognition,
rollback, and duplicate protection. Protected schedule and attendance route
handlers are exercised against the real database with Admin-versus-unauthorized
coverage and safe DTO assertions.

Reporting PostgreSQL scenarios prove canonical SUBJECT/GENERAL demand grouping,
pending-classification exclusion, inclusive date boundaries, filter scope,
current-cycle coverage and movement-derived balances with reversals, planned
schedule and due-attendance measures, distinct activity grouping, safe report
DTOs, empty/unavailable sections, and no report writes. A persisted failed
consultation import leaves consolidated consultation demand available. The
same fixture proves the Admin overview's open-cycle context, pending attention,
upcoming duties, negative balances, review count, and degraded-source state.

### End-to-end tests

Playwright scenarios live under `tests/e2e/` and exercise the application through its configured web server. The suite contains the `ui-smoke.spec.ts` browser smoke suite for login and protected-route redirects, plus authenticated Admin journeys for live tutor/Materias, scheduling/attendance, hour-accounting, consultation operations, and cycle lifecycle. The authenticated server wrapper starts an isolated Testcontainers PostgreSQL database, applies migrations, seeds deterministic synthetic rows and a Better Auth session, and launches the normal Next.js server; the consultation journey uses a local HTTP fixture for the Sheets values-read contract, not Google or an external endpoint. The suite uses one worker because its authenticated journeys share a database and some workflows write to it.

The Admin accessibility journey visits `/admin`, `/admin/tutors`, `/admin/tutors/subjects`, `/admin/schedules`, `/admin/schedules/attendance`, `/admin/hours`, `/admin/hours/movements`, `/admin/consultations`, `/admin/reports`, and `/admin/settings` at 390px, 900px, and 1440px. It checks page-level horizontal overflow, primary-action visibility, and header-action bounds. Its keyboard navigation scenario opens the mobile Admin drawer, follows a route link, and verifies focus moves to the new page heading.

E2E tests must use synthetic, deterministic data and must not require production credentials or external production services. Docker is required locally because the authenticated web server owns an isolated PostgreSQL container. Playwright writes a closed HTML report to `playwright-report/` and retains traces for failed tests under `test-results/`; CI uploads both locations only when the E2E job fails.

The consultation Admin journey covers source import summary and idempotent refresh, filter/search behavior, duplicate and anomaly decisions, SUBJECT and GENERAL consolidation, pending classification exclusion, source degradation and unavailability, canonical-data preservation, and Compact/Medium/Wide layouts. Import, review, and report-filter controls are operated with the keyboard, including native select and checkbox keys; reduced-motion behavior is checked for review and feedback states. It also asserts unauthenticated and Tutor API/page denial and the absence of student contact from Tutor and public routes. Its source fixture is bound to loopback and accepts only the synthetic test token.

The same authenticated Admin journey exercises live `/admin` overview links
and source degradation, plus `/admin/reports` period and dimension filters,
URL persistence across reload, reset, empty-period copy, privacy-safe output,
canonical consultation reporting after source failure, keyboard access to
ranked tables, and Compact/Medium/Wide layouts without page-level overflow.

The authenticated server wrapper also seeds linked and unlinked Tutor identities,
deterministic Tutor subjects, regular and special schedules, and owner-specific
movement history in addition to the deterministic hour-accounting and
scheduling rows, including active and inactive tutors and categories, regular
and special plans, persisted occurrences, pending attendance, an activity
origin, and movement history. The authenticated Admin journey covers the live
schedule plan switch and assignment edit, then the Compact attendance flow:
Present without a balance change, Falta with cancellation and reload
persistence, adjusted debit confirmation, linked movement history, and explicit
recovery recognition. These actions are activated with keyboard input, and the
schedule plan controls expose selected state through button semantics. The
existing Admin hours journey continues to cover the Compact, Medium, and Wide
workflow through keyboard-operated bulk meeting credit, balance/history refresh,
movement-history navigation, and non-destructive reversal. The tutor journey
also checks keyboard navigation through row actions and the status confirmation
dialog, while the cycle lifecycle journey closes the cycle and creates its
successor with keyboard activation.

The authenticated Tutor journey signs a real Better Auth session cookie and
covers owner-scoped summary, effective schedule, and hour-history reads through
the running application. It asserts that a Tutor cannot reach Admin pages or
mutation APIs, that only the linked Tutor's subjects, schedule, balance, and
movements are rendered, that student/contact data is absent, and that the
Compact (390px), Medium (900px), and Wide (1440px) layouts remain usable without
page-level horizontal overflow. A keyboard journey opens Tutor navigation,
visits each self-service route, queries a schedule date, checks focus restoration
and visible focus, and verifies reduced-motion navigation styles. Login browser
coverage checks keyboard focus, announced technical and access-denied states,
and page-level overflow at those same widths; component coverage exercises the
loading-to-permission-denied sign-in transition.

The cycle lifecycle browser project runs after the shared-database journeys
because it closes the seeded active cycle. It confirms the cycle explicitly,
reloads Settings to verify that the closed cycle remains visible, creates a
successor, adds the existing synthetic Tutor to it, and verifies that the old
movement history remains readable while the successor has a zero balance and
no transfer movements.

### Integration and contract checks

There is currently no `Contract` gate. The `Integration` gate covers the real database-backed behavior, migrations, tutor/academic operations, scheduling/attendance, hour accounting, and consultation intake/review workflows introduced by the current runtime. A separate `Contract` gate remains deferred until an independent contract boundary needs it.

Docker is an execution prerequisite for `Integration`, not a separate public gate.

### Coverage and flakiness

Coverage is diagnostic and has no global threshold. Do not add tests solely to increase a percentage.

Flaky tests are defects. Do not normalize retries or order-dependent fixtures as a substitute for deterministic tests.

## 3. Local verification

Run the same meaningful checks that CI runs:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:integration
corepack pnpm exec playwright install chromium  # First-time local browser setup
corepack pnpm test:e2e                         # Requires Docker for the isolated E2E database
corepack pnpm build
```

The browser-install command is required only when the local Playwright Chromium binary is not already available. It is not a project test gate by itself.

The Playwright web server is invoked through `corepack pnpm exec tsx tests/e2e/web-server.ts`, which starts the isolated database fixture before launching the normal Next.js development server. The wrapper still uses the exact package-manager and runtime versions declared by the project instead of resolving an unrelated global pnpm executable.

## 4. CI topology

`.github/workflows/ci.yml` keeps the playbook's conceptual topology while using only SGTA's real checks:

```text
Quality ─────┐
Tests ───────┤
Integration ─┤
E2E ─────────┼──> CI Gate
Production ──┘
```

Each technical job has:

- a stable conceptual display name;
- a locked dependency installation;
- the project's Node.js and pnpm versions configured explicitly;
- an explicit timeout;
- no production credentials or services.

The workflow also cancels obsolete runs for the same pull request or branch and uploads E2E diagnostics on failure. The GitHub-hosted runner provides Docker for both isolated PostgreSQL boundaries; neither job receives production database or Google credentials.

The repository Ruleset should require exactly `CI Gate`, not an implementation-specific upstream job. Upstream topology may evolve without changing that merge contract. The GitHub-hosted Docker daemon is used by `Integration` and the E2E server fixture; it does not create a separate public Docker job.

## 5. Naming rules

- Workflow name: `CI`.
- Public jobs: `Quality`, `Tests`, `Integration`, `E2E`, `Production`, and `CI Gate`.
- Internal job IDs: lowercase, short, and YAML-safe (`quality`, `tests`, `integration`, `e2e`, `production`, `ci-gate`).
- Use `<Gate> / <Scope>` only when a stable product or architecture boundary genuinely requires subdivision.
- Do not use names such as `Node 22`, `pnpm Tests`, `Vitest`, `Playwright E2E`, or `PostgreSQL Integration` as public checks.

## 6. Adding a new boundary

When a real feature boundary is introduced:

1. add the lowest-layer test that reliably verifies its behavior;
2. add isolated infrastructure only when the boundary requires it;
3. expose the check through the appropriate conceptual gate;
4. keep local commands and CI commands equivalent;
5. update this document and the relevant task/roadmap decision in the same delivery.

Do not create speculative gates, production checks, coverage thresholds, or services before SGTA needs them.
