# SGTA — Development

> Local setup, environment, and developer workflow.

## Requirements

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | `>=22.0.0 <25` (Node.js 22 LTS) | `package.json` |
| Corepack and pnpm | pnpm `11.24.0` | `package.json` `packageManager` field |
| PostgreSQL | Required for persisted application and auth flows | `DATABASE_URL` in `.env.example` |
| Docker | Required for Testcontainers integration and authenticated E2E suites | `vitest.integration.config.ts`, `tests/e2e/web-server.ts` |

## Setup

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
```

Edit `.env.local` with local values before migrating the database or using
protected flows. Keep secrets in that ignored file; never commit them.

## Local environment

| Variable | Required locally | Purpose |
| --- | :---: | --- |
| `DATABASE_URL` | For database-backed flows | PostgreSQL connection for the application and operator commands. |
| `BETTER_AUTH_URL` | For sign-in | Base URL for Better Auth; local default is `http://localhost:3000`. |
| `BETTER_AUTH_SECRET` | For sign-in | Server-only signing/encryption secret; use at least 32 characters. |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | For real Google sign-in | Configure both values together. Production requires both. |
| `GOOGLE_HOSTED_DOMAIN` | No | Optional Google Workspace domain restriction. |
| `GOOGLE_SHEETS_*` | No | Configure the complete server-only set to enable read-only consultation imports. |
| `TEST_DATABASE_URL` | No | Optional manual test target; integration and E2E suites create isolated databases. |

Do not expose server settings through `NEXT_PUBLIC_*`. The public login shell
can be inspected without production credentials; protected flows require a
database and valid authentication configuration.

## Run locally

Create the local schema and first Admin, then start the application:

```bash
corepack pnpm db:check
corepack pnpm db:migrate
corepack pnpm auth:bootstrap-admin -- --email=admin@example.com --name="SGTA Admin"
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The bootstrap command
creates or updates one enabled Admin; it is an operator command, not public
sign-up.

## Commands

The complete command list is maintained in [AGENTS.md](../AGENTS.md#commands).
Test boundaries and CI behavior are documented in [Testing](TESTING.md).

| Operator command | Notes |
| --- | --- |
| `corepack pnpm auth:bootstrap-admin` | Creates or updates one enabled Admin; supply `-- --email=admin@example.com --name="SGTA Admin"` and the intended database connection. |
| `corepack pnpm data:import` | Dry-run by default; writes require `--apply --yes` and an enabled Admin in the target database. |
| `corepack pnpm data:verify` | Read-only reconciliation; `--expected=<path>` supplies private aggregate expectations. |
| `corepack pnpm db:query-audit` | On-demand query-plan inspection in disposable PostgreSQL; Docker is required. |

## Agent tooling

Skills are optional personal tooling; build and test commands do not require them.
Use the [engineering playbook skills](https://github.com/acevedo-daniel/engineering-playbook/tree/main/.agents/skills).
Follow its [installation instructions](https://github.com/acevedo-daniel/engineering-playbook#install-and-sync)
at user scope: `~/.agents/skills/` for Codex and `~/.claude/skills/` for Claude Code.
The playbook owns installation and workflow procedures; refresh skills as it evolves.

## Database workflow

Use the committed migrations to bring a database to the current schema. For a
schema change, generate a migration with `corepack pnpm db:generate`, review the
generated SQL, and run `corepack pnpm db:check` before applying it with
`corepack pnpm db:migrate`. Migration commands that write require a valid
`DATABASE_URL`; generated migrations are not edited by hand.

The initial-data importer defaults to dry-run. Inspect its diagnostics with
`corepack pnpm data:import` or `corepack pnpm data:import --dry-run` before writing
with `corepack pnpm data:import --apply --yes`. Writes require an explicit database
connection and an enabled Admin. Keep private registry input and aggregate
expectations outside tracked files. `corepack pnpm data:verify --expected=<path>`
compares a loaded package with the private expectations in a read-only transaction.

## Related documentation

- [Project scope](PROJECT.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
- [Testing](TESTING.md)
