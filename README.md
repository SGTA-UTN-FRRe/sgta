# SGTA - Sistema de Gestión de Tutorías

[![CI](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml/badge.svg)](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml)

> An operational workspace for the Tutorias area at UTN FRRe.

SGTA supports Admin workflows for tutors, academic relationships, cycles,
schedules, hour movements, consultation curation, and reporting. Tutors get a
protected, read-only view of their own current-cycle summary, schedule, and
hours. Formal scholarship certification and full production operations are not
part of the current runtime.

## Key capabilities

- **Admin operations:** manage Tutors and academic relationships, schedule plans, cycle settings, and hour movements.
- **Tutor self-service:** view owner-scoped schedule, balance, and movement history.
- **Consultation curation:** import from a read-only Google Sheets source, review staging rows, and report from canonical records.
- **Operational visibility:** review current-cycle context, schedule coverage, hour balances, movements, activities, and consultation demand.

## Engineering highlights

- **Server-side access control:** Better Auth identities are explicitly provisioned; protected routes and APIs enforce roles on the server.
- **Movement-derived balances:** hour totals derive from the signed movement ledger, and corrections remain traceable as reversal rows.
- **Reviewable imports:** Sheets is an input boundary, while staging and canonical records remain in PostgreSQL and reporting does not require a live source request.
- **Read-only schedule workspace:** effective schedule entries are resolved from regular and special plans without mutating schedule data during reads.
- **Isolated data checks:** PostgreSQL integration and authenticated browser suites use disposable Testcontainers databases and deterministic fixtures.

## Architecture

```text
Browser
  -> Next.js App Router and server authorization
       -> feature screens and services
            -> Drizzle / PostgreSQL
       <- read-only Google Sheets consultation import
```

Routes compose feature-owned behavior. Authentication and persistence stay on
the server; see [Architecture](docs/ARCHITECTURE.md) for component and data
boundaries.

## Technology stack

- **Runtime:** Node.js 22 LTS (`>=22.0.0 <25`), Corepack, and pnpm 11.24.0.
- **Application:** Next.js 16 App Router, React 19, and TypeScript 5.
- **Interface:** Tailwind CSS 4 and local UI primitives.
- **Persistence and identity:** PostgreSQL, Drizzle ORM, and Better Auth with Google OAuth.
- **Verification:** Vitest, Testing Library, Testcontainers, and Playwright.

## Repository structure

| Path | Responsibility |
| --- | --- |
| `src/app/` | App Router routes, layouts, loading, and error boundaries. |
| `src/features/` | Admin, Tutor, scheduling, hours, consultations, and reporting workflows. |
| `src/auth/` and `src/db/` | Server-side identity, authorization, persistence, schema, and audit boundaries. |
| `tests/` | Unit/component, PostgreSQL integration, and Playwright browser scenarios. |
| `docs/` | Current product, architecture, development, deployment, and testing evidence. |
| `design/` | Approved visual direction and interface behavior specifications. |

## Local development

Prerequisites: Node.js 22 LTS and pnpm 11 through Corepack. A PostgreSQL
connection is needed for persisted application flows; Docker is needed for the
integration and authenticated E2E suites.

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
```

Configure local server values in `.env.local`, then create the schema and first
Admin and start the application:

```bash
corepack pnpm db:migrate
corepack pnpm auth:bootstrap-admin -- --email=admin@example.com --name="SGTA Admin"
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). See
[Development](docs/DEVELOPMENT.md) for environment and database details.

## Quality

```bash
corepack pnpm lint && corepack pnpm typecheck
```

The CI workflow also runs unit/component tests, isolated PostgreSQL integration
tests, E2E, and a production build. `CI Gate` aggregates those jobs. See
[Testing](docs/TESTING.md) for commands and boundaries.

## Documentation

- [Project scope and business rules](docs/PROJECT.md)
- [Architecture and data boundaries](docs/ARCHITECTURE.md)
- [Local setup and database workflow](docs/DEVELOPMENT.md)
- [Presentation deployment](docs/DEPLOYMENT.md)
- [Testing and CI](docs/TESTING.md)
- [Approved design direction](design/PROJECT-DESIGN.md)
- [Approved UI specification](design/UI-SPEC.md)
- [Development roadmap](docs/DEVELOPMENT-ROADMAP.md)
- [Agent instructions](AGENTS.md)
- [Agent tooling](docs/DEVELOPMENT.md#agent-tooling)

## License

[MIT](LICENSE)
