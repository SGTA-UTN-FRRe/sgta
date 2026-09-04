<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SGTA — Agent Instructions

## Project overview

SGTA (Sistema de Gestión de Tutorías) is a web application designed for UTN-FRRe to centralize academic tutoring management, duty scheduling, presence verification, consultation intake, and hour ledger accounting.

## Technology stack

- **Language / Runtime:** TypeScript 5, Node.js 22 LTS (engines: `>=22.0.0 <25`).
- **Framework:** Next.js 16 (App Router), React 19.
- **Styling:** Tailwind CSS 4, shadcn/ui.
- **Data persistence:** PostgreSQL with Drizzle ORM (schema & migrations in `src/db/`).
- **Authentication:** Better Auth with Google OAuth (server-side authorization).
- **Build / Package manager:** pnpm 11 enabled via Corepack.
- **Testing:** Vitest 3, React Testing Library, Playwright.

## Architecture

```text
Browser (Client)
       │
       ▼
Next.js App Router (src/app/)
       │
       ▼
Feature Modules (src/features/) ──► Server Actions & Route Handlers
       │
       ├──► Auth & Permissions (src/auth/)
       ├──► Data Access & Schema (src/db/) ──► PostgreSQL
       └──► Shared Utilities (src/shared/)
```

Modular monolith following vertical slices. Feature boundaries are strictly encapsulated under `src/features/`. Routing and page composition remain under `src/app/`.

## Key paths

- Source code: `src/`
- Application routes: `src/app/`
- Feature modules: `src/features/`
- Database layer: `src/db/`
- Auth & permissions: `src/auth/`
- Shared utilities & primitives: `src/shared/`
- Tests: `tests/` (Playwright E2E) and co-located `*.test.ts(x)` files in `src/` (Vitest)
- Configuration: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`

## Code conventions

- **Vertical slices:** Place feature-specific UI components, server actions, queries, schemas, and tests inside the corresponding feature directory under `src/features/<feature-name>/`.
- **Shared code hygiene:** Keep `src/shared/` minimal. Only place code here if it has at least two real consumers across different features.
- **Server components by default:** Use React Server Components unless client interactivity (hooks, event listeners) is strictly required (`'use client'`).
- **Authorization on the server:** Never rely on client-side role checks for security. All data mutations and private queries must validate the session and permissions via `src/auth/` guards.
- **Validation:** Validate all input at the boundaries using strict schemas before passing data to domain logic.
- **Type safety:** Strict TypeScript with no implicit `any`.

## File structure

| Path | Contains |
| --- | --- |
| `src/app/` | Next.js App Router pages, layouts, and route handlers. |
| `src/features/` | Feature vertical slices (catalog, tutors, ledger, scheduling, attendance, consultations). |
| `src/db/` | Drizzle ORM client, table definitions, relations, and migration scripts. |
| `src/auth/` | Better Auth configuration, session helpers, and role-based guards (`ADMIN | TUTOR`). |
| `src/shared/` | Shared UI primitives and cross-cutting helpers. |
| `tests/` | Playwright end-to-end test scenarios. |

## Commands

| Task | Command |
| --- | --- |
| Dev server | `corepack pnpm dev` |
| Lint | `corepack pnpm lint` |
| Type check | `corepack pnpm typecheck` |
| Unit / Integration tests | `corepack pnpm test` |
| E2E tests | `corepack pnpm test:e2e` |
| Production build | `corepack pnpm build` |

## Data storage & migrations

- **Engine:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **Schema location:** `src/db/` (modular table definitions and relations).
- **Invariants:**
  - Balances are derived from `HourMovement` records (`credits - debits`); never store mutable scalar balances.
  - History is immutable; corrections use reversal/cancellation movements.
  - Administrative cycle close preserves all historical records.

## Testing expectations

- **Unit / Component tests:** Co-located `*.test.ts` or `*.test.tsx` files executed via Vitest.
- **End-to-End tests:** Critical user flows (e.g. login -> duty -> absence -> debit -> recovery) executed via Playwright in `tests/`.
- **Pre-commit verification:** Every PR must pass `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build`.

## Rules and invariants

- Do not commit secrets, real credentials, tokens, or personal data. Use `.env.local` for local secrets and keep `.env.example` sanitized.
- Do not modify generated files under `.next/` or build artifacts.
- Do not add dependencies without justification.
- **Evidence Mode (Current State):** `README.md`, `DEVELOPMENT.md`, `TESTING.md` describe actual repository reality; source code and runtime config are the supreme authority.
- **Decision Mode (Target State):** `docs/DEVELOPMENT-ROADMAP.md`, `docs/PROJECT-DESIGN.md`, `docs/UI-SPEC.md` describe approved future reality; specifications command the transformation of code during feature work.
- **Design implementation scope:** Consume only Layer 3 documents (`docs/PROJECT-DESIGN.md` and `docs/UI-SPEC.md`) when developing UI.
