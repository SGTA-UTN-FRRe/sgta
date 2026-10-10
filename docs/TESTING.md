# SGTA — Testing

> Test strategy, layers, data, and how to run the project's checks.

## Strategy

SGTA uses unit/component tests for local behavior, PostgreSQL integration tests
for persistence and transaction boundaries, and Playwright for critical browser
journeys through the built application. Each layer uses deterministic test data;
no suite uses production credentials or writes to production services.
Coverage is diagnostic and has no enforced percentage threshold in
[`vitest.config.ts`](../vitest.config.ts); use it to find
unexamined behavior rather than as a release target.

## Test layers

| Layer | Purpose | Tool and location |
| --- | --- | --- |
| Unit and component | Validate feature logic, UI states, input rules, and authorization helpers without PostgreSQL. | Vitest and Testing Library; co-located under `src/` and selected CLI smoke coverage under `scripts/`. |
| Integration | Verify PostgreSQL schema, migrations, transactions, feature services, API authorization, reporting, and import behavior. | Vitest with `tests/integration/` and `vitest.integration.config.ts`. |
| E2E | Exercise protected routes and Admin/Tutor workflows through the running Next.js application. | Playwright with `tests/e2e/`. |
| Production build | Check that the deployable Next.js application compiles. | `corepack pnpm build`. |

## Test data and dependencies

Integration and authenticated E2E suites use Testcontainers to start isolated
PostgreSQL databases. Integration tests apply the committed migrations twice to
check rerunnability. Containers use available host ports and are removed after
the suite. Docker is required locally for both boundaries.

The [populated-upgrade scenario](../tests/integration/migration-upgrade.integration.test.ts) applies migrations through 0010, seeds synthetic legacy history, then applies the full set twice in a separate disposable database.
It verifies preserved balances, movements, activities, categories, audits, planning records, and reversal through the current hour service.
Cleanup removes the temporary database and migration folder; operational connections and the shared integration database are untouched.

Fixtures are deterministic and synthetic. The E2E web-server wrapper seeds its
database and sessions, then serves the built application with `next start`. The
consultation journey uses a loopback HTTP fixture for the read-only Sheets
values contract; it does not call Google. Unit/component tests do not require
PostgreSQL or Docker.

E2E server and browser contexts use the fixed business instant
`2026-12-01T15:00:00.000Z`, before the seeded 2027 cycle. Seeded authentication
session expiry continues to use the real wall clock.

Before starting fixtures or containers, the E2E server requires the production
build marker at `.next/BUILD_ID`. The application receives only allowlisted host
environment values plus explicit E2E configuration; host database URLs and
credentials are not passed through.

## Run tests

Install dependencies from the lockfile, then run the local command that mirrors
the required CI checks:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm verify
```

The command runs template validation, lint, type checking, unit/component tests, PostgreSQL
integration tests, the production build, and browser tests in sequence. Run the
individual package scripts when diagnosing a single gate.

Run template validation independently with `corepack pnpm check:templates`.
The dependency-free Node CLI scans Git-tracked working-tree files for unfilled
FILL/OPTIONAL markers, template title lines, and template status. It excludes
`.agents/`, `.claude/`, and paths matching `*.template.*`. Ignored `local-docs/`
and untracked files are outside the scan; binary matches retain Git's default
handling. Git invocation errors fail the check. Local verify and CI Quality
use this same command, with CI running it before dependency installation.

Build before E2E because the web-server wrapper starts the production build.
Install Playwright Chromium once when it is not available locally:

```bash
corepack pnpm exec playwright install chromium
```

The on-demand query-plan review is not a CI gate:

```bash
corepack pnpm db:query-audit
```

It starts a disposable PostgreSQL container and prints `EXPLAIN (ANALYZE,
BUFFERS)` results for selected query shapes.

## End-to-end verification

The browser suite covers public login and protected-route redirects, responsive
Admin pages and navigation, Tutor owner-scoped reads, schedule plan switching
and assignment editing, hour movement registration/reversal, consultation
review, and cycle lifecycle. It runs with one worker because authenticated
journeys share a mutable database. Accessibility scenarios scan supported Admin
and Tutor layouts and representative states. In [`playwright.config.ts`](../playwright.config.ts),
the `cycle-lifecycle` project depends on `chromium` and runs last because its
mutations close the shared cycle used by other journeys.

The E2E server creates its own PostgreSQL container, Better Auth sessions, and
synthetic records. It does not use `TEST_DATABASE_URL`, production Google
credentials, or a live consultation source.

### Reliability

Browser specs import `test` from [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts).
The fixture waits for `html[data-hydrated="true"]` after `page.goto` and
`page.reload` return an HTML response. The root layout's
[`HydrationMarker`](../src/shared/hydration-marker.tsx) sets this attribute in a
client effect. After a click or keyboard action triggers a full-document
navigation, assert the destination URL or heading and call `waitForHydration`
before interacting with the new document.

Timeouts are shared budgets rather than per-test or per-wait overrides:

| Configuration | Budget |
| --- | --- |
| `playwright.config.ts` | Test: 60 s; assertion: 15 s; action: 10 s; navigation: 30 s; web-server startup: 120 s; global run: 10 min. |
| `vitest.config.ts` | Unit/component test: 15 s. |
| `src/test/setup.ts` | Testing Library async utilities: 5 s. |

Playwright retries a failed test once in CI and does not retry locally. Vitest
does not retry tests. CI rejects focused browser tests and retains traces from
failed attempts. A browser test that passes only on retry is reported as flaky:
the workflow adds a warning annotation and a job-summary entry without failing
the job. Treat that warning as a defect and fix its cause with `$write-tests`.

ESLint requires the hydration fixture's `test` import in browser tests and blocks
fixed-duration waits, browser timeout overrides, and focused `test.only` or
`describe.only` calls. Component and script tests cannot set a third timeout
argument on `it` or `test`, or override `waitFor` and
`waitForElementToBeRemoved` timeouts. Fix the cause when a test reaches its
budget; do not raise a local timeout to hide the failure.

## CI and quality gates

`.github/workflows/ci.yml` runs for pull requests targeting `main` and on manual
dispatch. It does not rerun after merge because the `Protect main` ruleset
requires branches to be up to date with `main` before their required `CI Gate`
check can permit a merge. Only pull-request runs cancel an earlier run for the
same concurrency group.

| Gate | Checks |
| --- | --- |
| `Quality` | Template validation, ESLint, and strict TypeScript validation. |
| `Tests` | Unit and component suite. |
| `Integration` | Isolated PostgreSQL/Testcontainers suite. |
| `E2E` | Production build followed by Playwright. |
| `Production` | Production build. |
| `CI Gate` | Aggregate result that fails if any required upstream job fails, is cancelled, or is skipped. |

The workflow has no separate `Contract` or `Docker` gate. Docker is an execution
prerequisite for database-backed suites. The repository's final aggregate check
is `CI Gate`. The [workflow](../.github/workflows/ci.yml) uploads
`playwright-report/` and `test-results/` as `e2e-artifacts` on any non-cancelled
E2E run, with seven-day retention. Its JSON report supplies flaky-test warning
annotations and job-summary entries; Playwright retains traces on failure.

## Screenshots

Screenshot commands use a separate synthetic Spanish demo seed in a disposable
PostgreSQL database. The application and browser share the fixed instant
`2026-09-16T15:00:00.000Z` (12:00 in Argentina); record IDs and displayed timestamps
are deterministic. Demo accounts use `@example.test` addresses. Authentication
sessions expire relative to the real clock so captures remain usable later.

Build first with `corepack pnpm build`. Docker and Playwright Chromium are required,
as for E2E. Both commands reuse the E2E production server lifecycle, migration
checks, environment allowlist, hydration fixture, and execution budgets:

```bash
corepack pnpm screenshots:review
corepack pnpm screenshots
```

`screenshots:review` captures all 14 routes from the UI specification at 390×844,
768×1024, and 1440×900 in light mode with reduced motion. Its 42 full-page PNGs
are written to `test-results/review-screenshots/<slug>/<width>.png`. Select a view
with `corepack pnpm screenshots:review --grep schedules`.

`screenshots` writes five 1440×900 viewport images to `docs/screenshots/`:
`login.png`, `admin-overview.png`, `schedules.png`, `hours.png`, and
`tutor-summary.png`. These are generated on demand; the initial publication waits
until the listed views have been migrated. No pixel comparison runs in CI because
font rasterization differs between machines. On the same machine, compare SHA-256
hashes from consecutive review runs to check reproducibility.

Before repeating a database-backed command, allow its disposable containers to
finish shutting down. On Windows, Playwright stops the server process tree and
Testcontainers completes cleanup asynchronously. Starting another run during
that cleanup can reuse a retiring Ryuk container and lose the new database.
With no other Testcontainers run active, `docker ps --filter
label=org.testcontainers.ryuk=true` shows whether that cleanup is still pending.

## Related documentation

- [Development setup](DEVELOPMENT.md)
- [Deployment](DEPLOYMENT.md)
- [Architecture](ARCHITECTURE.md)
