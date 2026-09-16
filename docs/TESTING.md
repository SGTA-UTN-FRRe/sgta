---
document: TESTING
mode: evidence
type: project-testing-and-ci-guide
status: active
scope: current SGTA scaffold
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
| `E2E` | `corepack pnpm test:e2e` | Critical browser smoke coverage through the running Next.js application. |
| `Production` | `corepack pnpm build` | Verification that the deployable Next.js build can be produced. |
| `CI Gate` | aggregate workflow job | Stable final result for branch protection and pull-request merge readiness. |

The visible GitHub check names are intentionally conceptual:

```text
CI / Quality
CI / Tests
CI / E2E
CI / Production
CI / CI Gate
```

Runtime versions, package managers, test frameworks, browser engines, and internal job IDs do not belong in these public names.

## 2. Current test boundaries

### Unit and component tests

Tests live next to the implementation under `src/` and run in the Vitest `jsdom` environment. They verify shared primitives, route-level rendering, accessibility-oriented component behavior, and other behavior that does not require a running application or external infrastructure.

The current suite has no PostgreSQL, authentication, or external-service integration boundary. Do not call these tests integration tests merely because they use React Testing Library.

### End-to-end tests

Playwright scenarios live under `tests/e2e/` and exercise the application through its configured web server. The current suite contains the `ui-smoke.spec.ts` browser smoke suite for the login, Admin, and schedule scaffold journeys. As domain workflows become real, add one representative critical journey per meaningful boundary instead of duplicating unit coverage in the browser.

E2E tests must use synthetic, deterministic data and must not require production credentials or external production services. Playwright writes a closed HTML report to `playwright-report/` and retains traces for failed tests under `test-results/`; CI uploads both locations only when the E2E job fails.

### Integration and contract checks

There is currently no `Integration` or `Contract` gate. They become appropriate when the repository introduces real database-backed behavior, migrations, API contracts, or another boundary whose behavior cannot be reliably verified at a lower layer.

There is currently no Docker gate because Docker is not part of the repository's deployment architecture.

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
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm build
```

The browser-install command is required only when the local Playwright Chromium binary is not already available. It is not a project test gate by itself.

The Playwright web server is invoked through `corepack pnpm dev` so local runs honor the exact package-manager version declared by the project instead of resolving an unrelated global pnpm executable.

## 4. CI topology

`.github/workflows/ci.yml` keeps the playbook's conceptual topology while using only SGTA's real checks:

```text
Quality ─────┐
Tests ───────┤
E2E ─────────┼──> CI Gate
Production ──┘
```

Each technical job has:

- a stable conceptual display name;
- a locked dependency installation;
- the project's Node.js and pnpm versions configured explicitly;
- an explicit timeout;
- no production credentials or services.

The workflow also cancels obsolete runs for the same pull request or branch and uploads E2E diagnostics on failure.

The repository Ruleset should require exactly `CI Gate`, not an implementation-specific upstream job. Upstream topology may evolve without changing that merge contract.

## 5. Naming rules

- Workflow name: `CI`.
- Public jobs: `Quality`, `Tests`, `E2E`, `Production`, and `CI Gate`.
- Internal job IDs: lowercase, short, and YAML-safe (`quality`, `tests`, `e2e`, `production`, `ci-gate`).
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
