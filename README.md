# SGTA — Sistema de Gestión de Tutorías

[![CI](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml/badge.svg)](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml)

> Current repository status: an executable Next.js scaffold for the SGTA interface and shared UI foundation.

SGTA is the planned operational workspace for the Tutorias area at UTN FRRe. The repository currently contains the application shell, route skeletons, design tokens, and shared UI components. Domain workflows, persistence, authentication, and external integrations are not implemented yet.

## Current state

The current scaffold provides:

- a public landing page at `/` that exercises the shared UI foundation with synthetic content;
- Admin route skeletons for the overview, tutors, schedules, hours, consultations, reports, and configuration;
- Tutor route skeletons for the overview, schedule, and hours;
- responsive Admin and Tutor navigation shells;
- shared components for navigation, page headers, empty states, status badges, Faro branding, buttons, cards, inputs, and tables;
- unit/component tests and a baseline Playwright test for the landing page.

The route labels describe the intended product areas, but the current pages do not yet read or write SGTA domain data. All current routes are reachable without authentication, and no role-based access check is active.

## Not implemented in the current scaffold

The following remain future work described by the shared decision documents:

- PostgreSQL, Drizzle schema, and migrations;
- Better Auth, Google OAuth, user provisioning, and server-side role guards;
- tutor, subject, cycle, hour ledger, schedule, attendance, consultation, and reporting workflows;
- read-only Google Sheets ingestion and consultation curation;
- production data, secrets, and operational configuration.

Do not treat target-state statements in `docs/` as evidence that these capabilities already run in the application.

## Current technology

- **Runtime:** Node.js 22 LTS (`>=22.0.0 <25`).
- **Framework:** Next.js 16 App Router and React 19.
- **Language:** TypeScript 5 with strict checking.
- **Styling:** Tailwind CSS 4 and local UI primitives.
- **Testing:** Vitest 3, React Testing Library, and Playwright.
- **Package manager:** pnpm 11 through Corepack.

The current `package.json` does not include a database, authentication, or Google API runtime dependency.

## Current architecture

```text
Browser
   │
   ▼
Next.js App Router (src/app/)
   │
   ▼
Route skeletons and layouts
   │
   ├──► Shared product components (src/shared/)
   └──► UI primitives (src/components/ui/)
```

The directories `src/auth/`, `src/db/`, and `src/features/` currently provide reserved boundaries and guidance files; they do not contain active authentication, database, or domain implementations.

## Current routes

| Route | Current purpose |
| --- | --- |
| `/` | Landing page and shared UI foundation sample. |
| `/admin` | Admin shell with overview skeleton. |
| `/admin/tutores` | Tutor-management route skeleton. |
| `/admin/horarios` | Schedule and attendance route skeleton. |
| `/admin/horas` | Hour-ledger route skeleton. |
| `/admin/consultas` | Consultation route skeleton. |
| `/admin/reportes` | Reporting route skeleton. |
| `/admin/configuracion` | Configuration route skeleton. |
| `/tutor` | Tutor shell with overview skeleton. |
| `/tutor/horario` | Tutor schedule route skeleton. |
| `/tutor/horas` | Tutor hours route skeleton. |

## Repository structure

| Path | Responsibility today |
| --- | --- |
| `src/app/` | App Router pages, layouts, metadata, and global styles. |
| `src/components/ui/` | Local low-level UI primitives used by the scaffold. |
| `src/shared/` | Shared navigation, branding, page, state, and utility components. |
| `src/features/` | Reserved location for future vertical feature slices. |
| `src/auth/` | Reserved location with guidance for future authentication and authorization. |
| `src/db/` | Reserved location with guidance for future persistence and migrations. |
| `src/test/` | Vitest and Testing Library setup. |
| `tests/e2e/` | Playwright end-to-end tests. |
| `docs/` | Shared target-state design, UI, and development decisions. |

## Local development

Prerequisites: Node.js 22 LTS and pnpm 11 through Corepack.

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The current scaffold does not require a database or runtime environment variables. Keep any future local secrets in `.env.local`; do not commit them.

## Verification

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint        # Run ESLint checks
corepack pnpm typecheck   # Validate TypeScript without emitting files
corepack pnpm test        # Run Vitest unit/component tests
corepack pnpm exec playwright install chromium  # First-time local browser setup
corepack pnpm test:e2e    # Run the configured Playwright test
corepack pnpm build       # Run the production build
```

The CI workflow exposes the conceptual checks `Quality`, `Tests`, `E2E`, `Production`, and the stable aggregate `CI Gate`. It installs from the lockfile, uses the project's Node.js/pnpm versions, and does not currently provision a database or exercise authenticated domain flows. `Integration`, `Contract`, and `Docker` checks are intentionally absent because those boundaries do not exist in the current scaffold.

## Documentation

- [docs/DEVELOPMENT-ROADMAP.md](docs/DEVELOPMENT-ROADMAP.md) — shared planning roadmap and exit criteria.
- [AGENTS.md](AGENTS.md) — repository instructions for coding agents and contributors.
- [.agents/skills/](.agents/skills/) — repository skills for planning, implementation, and Git delivery.
- [docs/PROJECT-DESIGN.md](docs/PROJECT-DESIGN.md) — approved product visual direction and design tokens.
- [docs/UI-SPEC.md](docs/UI-SPEC.md) — approved route, state, interaction, responsive, and accessibility contracts.
- [docs/TESTING.md](docs/TESTING.md) — current project testing boundaries, CI gates, and reproducible verification.
- [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) — required PR description structure.

The source code, package manifest, runtime configuration, tests, and `docs/TESTING.md` are the authority for current behavior. `PROJECT-DESIGN.md`, `UI-SPEC.md`, and `DEVELOPMENT-ROADMAP.md` describe approved project decisions and planning direction; repository skills own repeated planning, implementation, and Git delivery procedures.
