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
| `Integration` | `corepack pnpm test:integration` | PostgreSQL-backed foundation, tutor/academic operations, and Admin hour-accounting coverage against an isolated Testcontainers database. |
| `E2E` | `corepack pnpm test:e2e` | Critical browser smoke and authenticated Admin workflow coverage through the running Next.js application. |
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

### Integration tests

Integration scenarios live under `tests/integration/` and run through the separate `vitest.integration.config.ts` configuration in the Node.js environment. Each run starts a fresh PostgreSQL container with Testcontainers, applies the committed Drizzle migration twice to prove rerunnability, uses deterministic synthetic fixtures, and tears down the pool and container after the suite. The feature coverage includes Career, Subject, Tutor, TutorSubject, TutorCycleMembership, scholarship-reference lifecycle, duplicate/conflict handling, open/closed cycle rules, derived Materias reconstruction, hour categories, activity origins, immutable movement reversals, safe audit actor attribution, transaction rollback, sensitive-metadata rejection, and Admin-versus-Tutor API/page authorization.

Docker is a local and CI prerequisite for this boundary. Testcontainers chooses an available host port; no fixed port, local database, production URL, Google credential, or personal data is used. There is no separate Docker check or public Docker gate.

Hour-accounting integration scenarios also prove meeting, workshop, extraordinary,
and recovery recognition; inactive-category history; closed-cycle reads and
rejected writes; atomic bulk rollback; and actor-attributed bounded audit metadata.

### End-to-end tests

Playwright scenarios live under `tests/e2e/` and exercise the application through its configured web server. The suite contains the `ui-smoke.spec.ts` browser smoke suite for login and protected-route redirects, plus authenticated Admin journeys for live tutor/Materias operations and hour accounting. The authenticated server wrapper starts an isolated Testcontainers PostgreSQL database, applies migrations, seeds deterministic synthetic rows and a Better Auth session, and launches the normal Next.js server; it does not bypass server-side authorization or call Google.

E2E tests must use synthetic, deterministic data and must not require production credentials or external production services. Docker is required locally because the authenticated web server owns an isolated PostgreSQL container. Playwright writes a closed HTML report to `playwright-report/` and retains traces for failed tests under `test-results/`; CI uploads both locations only when the E2E job fails.

The authenticated server wrapper also seeds deterministic hour-accounting rows,
including active and inactive tutors and categories, an activity origin, and
movement history. The authenticated Admin hours journey covers the Compact,
Medium, and Wide workflow through bulk meeting credit, balance/history refresh,
movement-history navigation, and non-destructive reversal.

### Integration and contract checks

There is currently no `Contract` gate. The `Integration` gate covers the real database-backed behavior, migrations, tutor/academic operations, and hour-accounting workflows introduced by the current runtime. A separate `Contract` gate remains deferred until an independent contract boundary needs it.

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
