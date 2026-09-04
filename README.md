# SGTA — Sistema de Gestión de Tutorías

[![CI](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml/badge.svg)](https://github.com/SGTA-UTN-FRRe/sgta/actions/workflows/ci.yml)

> Web application for academic tutoring management, attendance tracking, and hour ledger at UTN-FRRe.

SGTA centralizes tutor administration, duty scheduling, attendance tracking, consultation intake, and ledger accounting into a verifiable, audit-ready platform for administrative staff and tutors.

## Key capabilities

- **Academic catalog & tutor management:** Administer active and inactive tutors, degree programs, subjects, and administrative cycles with complete history preservation.
- **Hour ledger:** Maintain an auditable, movement-based hour balance (credits and debits) with traceable corrections and cycle isolation.
- **Scheduling & attendance:** Plan regular and special duty schedules, record presence/absence, and derive absence debits requiring administrative confirmation.
- **Tutor self-service portal:** Provide tutors with read-only visibility into their active schedules, duty assignments, and personal hour balances.
- **Consultation intake & curation:** Ingest student consultations via staging, normalization, and classification without modifying external Google Sheets sources.

## Engineering highlights

- **Modular monolith with vertical slices.** Business capabilities own their domain logic, UI, and internal data access under `src/features/`, avoiding artificial multi-tier layers while keeping boundaries strict.
- **Server-side authorization by default.** Session resolution, role checks (`ADMIN | TUTOR`), and resource guards execute strictly on the server to prevent data leaks.
- **Movement-based immutable ledger.** Hour balances are derived exclusively from historical credit/debit movements; balances are never stored as mutable scalar values.
- **Staging-first external integration.** Google Sheets data passes through read-only staging and normalization before entering canonical tables, ensuring external anomalies never corrupt internal state.

## Architecture

```text
Browser (Client)
       │
       ▼
Next.js App Router (src/app/)
       │
       ▼
Feature Modules (src/features/) ──► Server Actions & Queries
       │
       ├──► Auth & Permissions (src/auth/)
       ├──► Data Access & Schema (src/db/) ──► PostgreSQL
       └──► Shared Utilities (src/shared/)
```

App Router handles routing and composition only. Feature modules encapsulate domain behavior, while auth and database layers remain strictly server-side.

## Technology stack

- **Framework & Runtime:** Next.js 16 (App Router), React 19, TypeScript 5, Node.js 22 LTS.
- **Styling:** Tailwind CSS 4, shadcn/ui.
- **Testing:** Vitest 3, React Testing Library, Playwright.
- **Package Manager:** pnpm 11 with Corepack.

## Repository structure

| Path | Responsibility |
| --- | --- |
| `src/app/` | Application routing, route composition, and root layout shell. |
| `src/features/` | Feature-owned UI components, server logic, validation, and domain contracts. |
| `src/db/` | Database configuration, schema definitions, and migration files. |
| `src/auth/` | Server-side authentication, session resolution, and authorization guards. |
| `src/shared/` | Shared UI primitives and cross-cutting utility functions. |
| `tests/` | End-to-end and integration test suites (Playwright). |

## Local development

Prerequisites: Node.js 22 LTS (`>=22.0.0 <25`) and pnpm 11 (`corepack enable`).

```bash
corepack enable
corepack pnpm install
Copy-Item .env.example .env.local    # PowerShell
# cp .env.example .env.local         # Bash
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Development credentials and server configurations belong in `.env.local` (ignored by git). Store variable names and safe placeholders in `.env.example`.

## Quality

```bash
corepack pnpm lint        # Run ESLint checks
corepack pnpm typecheck   # Validate TypeScript types without emit
corepack pnpm test        # Run unit and integration tests with Vitest
corepack pnpm test:e2e    # Run Playwright end-to-end tests
corepack pnpm build       # Run production build
```

Continuous integration runs lint, typecheck, test, and build on every pull request and push to `main`.

## Documentation

- [docs/DEVELOPMENT-ROADMAP.md](docs/DEVELOPMENT-ROADMAP.md) — Phased delivery plan, scope boundaries, and exit criteria.
- [AGENTS.md](AGENTS.md) — AI agent instructions, runtime rules, and invariant guardrails.
- [docs/PROJECT-DESIGN.md](docs/PROJECT-DESIGN.md) — Product visual identity, Midnight Navy / Beacon Blue / Faro Amber design tokens, and geometry.
- [docs/UI-SPEC.md](docs/UI-SPEC.md) — View-level interface specifications, responsive behavior, states, and user interaction rules.
