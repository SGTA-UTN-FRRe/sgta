# SGTA — Sistema de Gestión de Tutorías

[![CI](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml/badge.svg)](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml)

> Current repository status: an executable Next.js application with live tutor self-service, academic, hour-accounting, scheduling, attendance, and consultation-intake workflows, the SGTA UI, and a secure platform foundation.

SGTA is the operational workspace for the Tutorias area at UTN FRRe. The repository currently contains the application shell, protected role-based navigation, PostgreSQL persistence, provisioned Google-only authentication, AdministrativeCycle lifecycle controls, live Tutor self-service, Admin tutor, academic catalog, hour-accounting, scheduling, attendance, and consultation-intake operations, safe audit events, and shared UI components. Reporting and production workflows remain deferred.

## Current state

The current runtime provides:

- a public `/login` route, with `/` routing enabled Admins to `/admin`, enabled Tutors to `/tutor`, and other requests to `/login`;
- server-side Admin and Tutor page guards, with `/forbidden` recovery and `401`/`403` API responses;
- Admin route surfaces for the overview, live tutor and Materias workflows, schedules, hours, consultations, reports, and configuration;
- live Admin tutor management at `/admin/tutors`, including search/filter, create/edit, academic relationships, current-cycle membership, and non-destructive inactivation/reactivation;
- derived current-cycle Materias coverage at `/admin/tutors/subjects`, reconstructed from canonical Subject, TutorSubject, Tutor, and TutorCycleMembership rows;
- low-frequency Career, Subject, and scholarship-reference maintenance from `/admin/settings`, with active/inactive lifecycle controls and no hard deletion;
- live Admin hour accounting at `/admin/hours`, including derived balances, individual and atomic bulk movements, activity/recovery origins, and immutable reversal workflows;
- Admin movement history at `/admin/hours/movements` plus hour-category maintenance under `/admin/settings`;
- live Admin schedule planning and attendance workflows at `/admin/schedules` and `/admin/schedules/attendance`, with regular/special plans, stable duty occurrences, cycle-aware history, and protected APIs for plan, assignment, attendance, debit, correction, and recovery operations;
- live Admin consultation intake at `/admin/consultations`, with read-only Google Sheets import, idempotent staging, explicit anomaly and duplicate review, canonical classification, and preserved records when the source is unavailable;
- Tutor self-service at `/tutor`, `/tutor/schedule`, and `/tutor/hours`, with owner-scoped subjects, cycle and scholarship context, effective schedule, signed balance, and movement history;
- responsive Admin and Tutor navigation shells;
- a PostgreSQL/Drizzle schema and committed migrations for Better Auth identities/sessions, application roles, AdministrativeCycle, AuditEvent, consultation staging, canonical consultations, import runs, and duplicate review;
- Google-only Better Auth configuration with public signup disabled, explicit Admin/Tutor provisioning, and a bootstrap command for the first Admin;
- cycle administration at `/admin/settings`, including current-cycle context, explicit close confirmation, preserved history, and recovery states;
- append-only audit recording for provisioning, session creation, cycle creation/close, and consultation import/review with bounded non-sensitive metadata;
- shared components for navigation, page headers, empty states, status badges, Faro branding, buttons, cards, inputs, and tables;
- unit/component tests, protected route coverage, isolated PostgreSQL/Testcontainers integration tests, and Playwright coverage for unauthenticated protection plus authenticated Tutor self-service and Admin tutor/Materias, scheduling/attendance, hour-accounting, and consultation journeys across supported viewports.

The Admin report page remains a scaffold and does not yet read or write reporting data. Consultation Sheets access is a server-only, read-only boundary; Admin curation controls staging and canonical records, while source failures leave canonical history available. The Admin schedule page supports protected regular/special plan creation, switching, assignment editing, lifecycle changes, conflict feedback, stable occurrence materialization, and responsive live refreshes. Attendance supports date-scoped occurrence marking, explicit active-category absence debit decisions, persisted absence-without-debit state, traceable correction, recovery recognition, and historical reads after cycle close. Tutor self-service pages are live read-only views backed by server-side owner resolution for the current cycle, scholarship reference, effective schedule, signed balance, and movement history. Protected Tutor, Materias, Settings, consultation, and API surfaces require the server-side identity and role boundary when authentication is configured.

## Not implemented in the current runtime

The following remain future work described by the shared decision documents:

- formal scholarship certification;
- reporting, production deployment, backups, and operational data migration.

The configured Google path still requires deployment credentials and provider setup; no real account or production data is included in the repository. Do not treat target-state statements in `docs/` as evidence that deferred capabilities already run in the application.

## Current technology

- **Runtime:** Node.js 22 LTS (`>=22.0.0 <25`).
- **Framework:** Next.js 16 App Router and React 19.
- **Language:** TypeScript 5 with strict checking.
- **Styling:** Tailwind CSS 4 and local UI primitives.
- **Data:** PostgreSQL with Drizzle ORM and committed migrations.
- **Authentication:** Better Auth with Google OAuth configuration and provisioned application identities.
- **Testing:** Vitest 3, React Testing Library, Testcontainers PostgreSQL integration tests, and Playwright.
- **Package manager:** pnpm 11 through Corepack.

Production authentication requires `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and the Google client pair. Admin consultation imports additionally use optional server-only `GOOGLE_SHEETS_*` settings; without a configured source, stored canonical consultations remain readable. See `.env.example` for the validated variable contract.

## Current architecture

```text
Browser
   │
   ▼
Next.js App Router (src/app/)
   │
   ▼
Server session and role boundary
   │
   ├──► Feature routes and services (src/features/)
   ├──► Shared product components (src/shared/)
   └──► Drizzle / PostgreSQL (src/db/)
```

The `src/auth/` and `src/db/` directories are active server-only boundaries. `src/features/` contains the implemented cycle/settings, Tutor self-service and academic, scheduling/attendance, hour-accounting, and consultation-intake slices while reporting and later domain verticals remain unimplemented. Client components receive safe display data and do not own authentication or role decisions.

## Current routes

| Route | Current purpose |
| --- | --- |
| `/` | Routes an enabled Admin to `/admin`, an enabled Tutor to `/tutor`, and other requests to `/login`. |
| `/login` | Restricted Google sign-in screen for enabled provisioned identities. |
| `/admin` | Admin-protected shell with overview skeleton. |
| `/admin/tutors` | Admin-protected live tutor management and academic relationship workflow. |
| `/admin/tutors/subjects` | Admin-protected derived Materias coverage for the open cycle. |
| `/admin/schedules` | Admin-protected live schedule planning and editing for cycle plans and assignments. |
| `/admin/schedules/attendance` | Admin-protected live attendance marking, explicit debit decisions, correction, and recovery recognition. |
| `/admin/hours` | Admin-protected live hour balances and movement registration. |
| `/admin/hours/movements` | Admin-protected movement history and reversal workflow. |
| `/admin/consultations` | Admin-protected consultation import, review, classification, filtering, and canonical history. |
| `/admin/reports` | Reporting route skeleton. |
| `/admin/settings` | Admin-protected AdministrativeCycle lifecycle, low-frequency reference-data, and hour-category controls. |
| `/tutor` | Tutor-protected owner-scoped current-cycle summary. |
| `/tutor/schedule` | Tutor-protected effective schedule with regular/special plan resolution. |
| `/tutor/hours` | Tutor-protected signed current-cycle balance and movement history. |
| `/api/auth/[...all]` | Better Auth Google-only handler. |
| `/api/admin/users` | Admin-protected explicit user provisioning handler. |
| `/api/admin/cycles` | Admin-protected cycle listing and creation handler. |
| `/api/admin/cycles/current` | Admin-protected current open-cycle handler. |
| `/api/admin/cycles/[cycleId]/close` | Admin-protected explicit cycle close handler. |
| `/api/admin/tutors` and `/api/admin/tutors/...` | Admin-protected tutor CRUD, status, and current-cycle academic relationship handlers. |
| `/api/admin/tutors/subjects` | Admin-protected derived Materias coverage handler. |
| `/api/admin/hours` and `/api/admin/hours/...` | Admin-protected hour balances, movement registration, movement history, and reversal handlers. |
| `/api/admin/schedules` and `/api/admin/schedules/...` | Admin-protected schedule workspace, plan, assignment, attendance, debit, correction, and recovery handlers. |
| `/api/admin/consultations` | Admin-protected consultation workspace and canonical records. |
| `/api/admin/consultations/import` | Admin-protected on-demand read-only source import and staging summary. |
| `/api/admin/consultations/review/[stagingId]` | Admin-protected consultation staging review and consolidation. |
| `/api/admin/settings/...` | Admin-protected Career, Subject, scholarship-reference, and hour-category handlers. |
| `/api/tutor/summary` | Tutor-protected owner-scoped summary read handler. |
| `/api/tutor/schedule` | Tutor-protected owner-scoped effective schedule read handler. |
| `/api/tutor/hours` | Tutor-protected owner-scoped balance and movement-history read handler. |

## Repository structure

| Path | Responsibility today |
| --- | --- |
| `src/app/` | App Router pages, layouts, metadata, and global styles. |
| `src/components/ui/` | Local low-level UI primitives used by the application. |
| `src/mocks/` | Synthetic development data used by the current screen implementations. |
| `src/shared/` | Shared navigation, branding, page, state, and utility components. |
| `src/features/` | Cycle/settings, Tutor self-service and academic, scheduling/attendance, hour-accounting, and consultation-intake implementations, plus future vertical slices. |
| `src/auth/` | Better Auth configuration, identity policy, provisioning, and server authorization. |
| `src/db/` | Drizzle schema, audit validation/recording, PostgreSQL client, and migrations boundary. |
| `drizzle/` | Committed Drizzle migration artifacts. |
| `src/test/` | Vitest and Testing Library setup. |
| `tests/e2e/` | Playwright end-to-end tests. |
| `tests/integration/` | Isolated PostgreSQL/Testcontainers integration tests. |
| `vitest.integration.config.ts` | Node-only integration test configuration. |
| `scripts/bootstrap-admin.ts` | Operator command for the first Admin identity. |
| `docs/` | Shared target-state design, UI, and development decisions. |

## Local development

Prerequisites: Node.js 22 LTS and pnpm 11 through Corepack. PostgreSQL is required for persisted application/auth flows, and Docker is required for the isolated integration suite.

```bash
corepack enable
corepack pnpm install --frozen-lockfile
cp .env.example .env.local
corepack pnpm db:migrate
corepack pnpm auth:bootstrap-admin -- --email=admin@example.com --name="SGTA Admin"
corepack pnpm dev
```

Set the server-only values in `.env.local` before applying migrations or using protected/authenticated flows. The public shell and production build can be inspected without production credentials, but real Google sign-in requires the configured OAuth values. Open [http://localhost:3000](http://localhost:3000). Keep local secrets in `.env.local`; do not commit them.

The bootstrap command creates or updates the first enabled Admin using `DATABASE_URL`; it is an operator path, not public signup. The integration suite and authenticated E2E server each create an isolated temporary PostgreSQL container and do not use `TEST_DATABASE_URL` or production Google credentials.

## Verification

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm db:check      # Validate the committed migration state
corepack pnpm lint        # Run ESLint checks
corepack pnpm typecheck   # Validate TypeScript without emitting files
corepack pnpm test        # Run Vitest unit/component tests
corepack pnpm test:integration  # Run isolated PostgreSQL/Testcontainers tests
corepack pnpm exec playwright install chromium  # First-time local browser setup
corepack pnpm test:e2e    # Run the configured Playwright test
corepack pnpm build       # Run the production build
```

The CI workflow exposes the conceptual checks `Quality`, `Tests`, `Integration`, `E2E`, `Production`, and the stable aggregate `CI Gate`. It installs from the lockfile, uses the project's Node.js/pnpm versions, and runs the integration suite against an isolated Testcontainers PostgreSQL database. `CI Gate` is the only stable aggregate check; `Contract` and `Docker` remain absent as separate public gates.

## Documentation

- [docs/DEVELOPMENT-ROADMAP.md](docs/DEVELOPMENT-ROADMAP.md) — shared planning roadmap and exit criteria.
- [AGENTS.md](AGENTS.md) — repository instructions for coding agents and contributors.
- [.agents/skills/](.agents/skills/) — repository skills for planning, implementation, and Git delivery.
- [docs/PROJECT-DESIGN.md](docs/PROJECT-DESIGN.md) — approved product visual direction and design tokens.
- [docs/UI-SPEC.md](docs/UI-SPEC.md) — approved route, state, interaction, responsive, and accessibility contracts.
- [docs/TESTING.md](docs/TESTING.md) — current project testing boundaries, CI gates, and reproducible verification.
- [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) — required PR description structure.

The source code, package manifest, runtime configuration, tests, and `docs/TESTING.md` are the authority for current behavior. `PROJECT-DESIGN.md`, `UI-SPEC.md`, and `DEVELOPMENT-ROADMAP.md` describe approved project decisions and planning direction; repository skills own repeated planning, implementation, and Git delivery procedures.
