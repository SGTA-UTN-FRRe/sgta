<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SGTA — Agent Instructions

## Repository reality

SGTA is currently an executable Next.js scaffold for the Tutorias UTN FRRe interface. The implemented runtime includes:

- a public landing page at `/`;
- Admin and Tutor route/layout skeletons under `src/app/`;
- responsive navigation and shared UI components under `src/shared/`;
- local UI primitives under `src/components/ui/`;
- Vitest/Testing Library component tests and a baseline Playwright test.

The current runtime does not include PostgreSQL, Drizzle, Better Auth, Google OAuth, server-side role guards, SGTA domain persistence, Google Sheets access, or operational workflows. `src/auth/`, `src/db/`, and `src/features/` are reserved boundaries with guidance files, not implemented subsystems.

Evidence Mode means that `README.md`, the source code, package/configuration files, tests, and CI describe what currently exists. Do not describe target behavior as a completed runtime capability.

## Shared target decisions

Decision Mode documents define approved future direction:

- `docs/PROJECT-DESIGN.md` — product visual direction and canonical design tokens;
- `docs/UI-SPEC.md` — route, state, interaction, responsive, and accessibility contracts;
- `docs/DEVELOPMENT-ROADMAP.md` — phase sequencing, scope, dependencies, and exit criteria;
- `docs/GIT-DELIVERY-WRITING-STANDARD.md` — project branch, commit, PR, squash, and cleanup language.

`docs/TESTING.md` is the Evidence Mode project guide for the current test boundaries and CI adaptation.

Use these documents when implementing the target. Existing code is the baseline to transform, not proof that a target feature already exists. Do not create a competing shared specification.

## Current technology and commands

- TypeScript 5, strict mode;
- Node.js 22 LTS (`>=22.0.0 <25`);
- Next.js 16 App Router and React 19;
- Tailwind CSS 4 with local UI primitives;
- pnpm 11 through Corepack;
- Vitest 3, React Testing Library, and Playwright.

| Task | Command |
| --- | --- |
| Install | `corepack pnpm install --frozen-lockfile` |
| Dev server | `corepack pnpm dev` |
| Lint | `corepack pnpm lint` |
| Type check | `corepack pnpm typecheck` |
| Unit/component tests | `corepack pnpm test` |
| Playwright browser setup | `corepack pnpm exec playwright install chromium` |
| E2E tests | `corepack pnpm test:e2e` |
| Production build | `corepack pnpm build` |

The CI workflow exposes `Quality`, `Tests`, `E2E`, `Production`, and `CI Gate`. It runs locked install, lint, typecheck, unit/component tests, the configured browser smoke suite, and the production build. `Integration`, `Contract`, and `Docker` gates are not active because their underlying boundaries do not exist yet.

## Key paths

- `src/app/` — App Router routes, layouts, metadata, and global styles;
- `src/components/ui/` — low-level UI primitives used by the scaffold;
- `src/shared/` — shared product components, navigation, branding, and utilities;
- `src/features/` — future feature vertical slices;
- `src/auth/` — future authentication and authorization boundary;
- `src/db/` — future persistence, schema, and migration boundary;
- `tests/` — Playwright end-to-end tests;
- `docs/` — shared Decision Mode documents and the current testing guide;
- `.github/workflows/ci.yml` — current CI verification and `CI Gate` aggregate;
- `.github/PULL_REQUEST_TEMPLATE.md` — required pull-request structure.

## Code conventions

- Use React Server Components by default; introduce a Client Component only when hooks, event listeners, or browser interaction require it.
- Keep route composition under `src/app/` and place future feature-specific UI, server logic, validation, tests, and contracts under `src/features/<feature-name>/`.
- Keep `src/shared/` small. Add code there only when it has real consumers across multiple features.
- Keep low-level reusable primitives in `src/components/ui/` when they are not feature-owned.
- Maintain strict TypeScript and avoid implicit `any`.
- Validate future external and mutation inputs at their boundaries before passing them to domain logic.
- When protected behavior is implemented, enforce authentication and authorization on the server; never rely on client-only role checks.
- For UI implementation, consume only the approved Layer 3 documents: `docs/PROJECT-DESIGN.md` and `docs/UI-SPEC.md`.

## Data and authentication status

There is no active database schema, migration runner, authentication provider, session helper, role guard, or domain data source in the current repository. Do not add claims about those capabilities to Evidence Mode documentation until the corresponding implementation and verification exist.

When those boundaries are implemented, preserve the approved invariants from Decision Mode, including server-side authorization, cycle-aware data, auditable changes, and movement-derived hour balances. Do not invent a different product rule in code without updating the authoritative decision document first.

## Testing expectations

- Keep unit/component tests co-located with the implementation under `src/`.
- Keep Playwright scenarios under `tests/e2e/`.
- Test current scaffold behavior against the actual rendered routes and components.
- Add integration or authorization tests only when the corresponding runtime boundary exists.
- Never use secrets, production data, real student information, or real consultation exports in tests or fixtures.
- Map checks to the project gates documented in `docs/TESTING.md`; do not invent a gate for a boundary that does not exist.
- Treat flaky tests as defects; do not hide instability with routine retries or order-dependent data.

## Repository rules

- Do not commit secrets, credentials, tokens, personal data, production logs, or data exports.
- Keep local secrets in `.env.local`; use sanitized examples only if an environment contract is introduced.
- Do not modify generated files under `.next/`, `out/`, `build/`, or generated type artifacts.
- Do not add dependencies without a justified implementation need.
- Preserve public links and keep a fresh clone understandable without developer-local planning material.
- Use focused outcome-oriented branches and PRs. Never generate the word `phase` (in any capitalization) in repository-facing output: this includes branch names, commit subjects, PR titles or bodies, tags, filenames, directories, identifiers, labels, and suggested examples. Use the durable outcome instead. Existing roadmap text may retain the term only when describing the approved plan, never as a generated name or delivery label.
- Use squash merge through a pull request after the required `CI Gate` passes; direct pushes to `main` are not the normal delivery path.
- Treat `CI Gate` as the only stable branch-protection check; upstream CI job names are implementation details.
- Keep `main` runnable after each coherent change.
