# SGTA - Testing

> Test strategy, layers, data, and how to run the project's checks.

## Strategy

SGTA uses unit/component tests for local behavior, PostgreSQL integration tests
for persistence and transaction boundaries, and Playwright for critical browser
journeys through the built application. Each layer uses deterministic test data;
no suite uses production credentials or writes to production services.

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

The populated migration-upgrade scenario creates a separate database inside the
integration container. It applies committed migrations through 0010, seeds
synthetic legacy origins and ledger history, then applies the full migration
set twice. It verifies preserved balances, movements, activities, categories,
audits, and planning records across attendance removal, and reverses a migrated
debit through the current hour service. Its database and temporary migration
folder are removed in cleanup; it does not use an operational connection or
alter the shared fully migrated integration database.

Fixtures are deterministic and synthetic. The E2E web-server wrapper seeds its
database and sessions, then serves the built application with `next start`. The
consultation journey uses a loopback HTTP fixture for the read-only Sheets
values contract; it does not call Google. Unit/component tests do not require
PostgreSQL or Docker.

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
and Tutor layouts and representative states.

The E2E server creates its own PostgreSQL container, Better Auth sessions, and
synthetic records. It does not use `TEST_DATABASE_URL`, production Google
credentials, or a live consultation source.

## CI and quality gates

`.github/workflows/ci.yml` runs for pull requests targeting `main` and pushes to
`main`.

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
is `CI Gate`.

## Related documentation

- [Development setup](DEVELOPMENT.md)
- [Deployment](DEPLOYMENT.md)
- [Architecture](ARCHITECTURE.md)
