<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SGTA - Agent Instructions

## Project

SGTA is an executable Next.js scaffold for the Tutorias UTN FRRe interface. The current runtime includes the public landing page, Admin and Tutor route/layout skeletons, responsive navigation, shared UI components, local UI primitives, Vitest/Testing Library coverage, and a baseline Playwright suite.

The current runtime does not include PostgreSQL, Drizzle, Better Auth, Google OAuth, server-side role guards, SGTA domain persistence, Google Sheets access, or operational workflows. The reserved `src/auth/`, `src/db/`, and `src/features/` boundaries do not prove that those subsystems exist.

## Instruction hierarchy

Use this order when instructions overlap:

1. explicit user request;
2. nearest applicable `AGENTS.md`;
3. invoked repository skill under `.agents/skills/`;
4. approved project decision documents;
5. current source, tests, manifests, runtime configuration, and CI as evidence of what exists now.

Do not infer repository workflow from task wording when an explicit rule or skill exists.

## Language boundary

Engineering artifacts are written in English, including repository documentation, code identifiers and technical comments, test names and technical fixtures, branch names, commit messages, pull request titles and descriptions, and squash merge text.

User-facing SGTA product copy may remain Spanish. Product language does not change engineering language.

SGTA's product locale and writing register are separate. The `es-AR` locale controls Argentina-specific formatting and localization behavior; it does not authorize Rioplatense or colloquial Argentine writing. Follow `docs/PROJECT-DESIGN.md` for the approved writing voice and `docs/UI-SPEC.md` for concrete product microcopy.

## Planning and delivery boundary

`docs/DEVELOPMENT-ROADMAP.md` is the planning authority for outcomes, sequencing, scope boundaries, and exit criteria. Roadmap labels, phase numbers, task numbers, milestone labels, and `PHASE-XX.md` names are planning metadata. They may be used in the roadmap, local execution plans, and prompts to locate work.

Planning metadata must not leak into branches, commit subjects, pull request titles or bodies, squash messages, tags, filenames, directories, identifiers, labels, or product-facing names. Derive the durable implementation outcome before creating delivery text.

## Repository skills

Use the installed skills for their owned procedures:

- `$plan-implementation` turns roadmap or product intent into a decision-complete execution plan.
- `$implement-task` implements one concrete approved task and verifies its boundaries.
- `$git-delivery` creates outcome-oriented branch, commit, pull request, and squash-delivery text when requested.

Do not duplicate those procedures in project documentation.

## Sources of truth

### Current state and evidence

Current source code, tests, manifests, runtime configuration, and CI are the strongest evidence for implemented behavior. `README.md` and `docs/TESTING.md` are public current-state documentation and must not claim target behavior as a completed runtime capability.

### Approved target decisions

- `docs/PROJECT-DESIGN.md` owns visual direction and canonical design tokens.
- `docs/UI-SPEC.md` owns routes, states, interactions, responsive behavior, accessibility contracts, and product microcopy.
- `docs/DEVELOPMENT-ROADMAP.md` owns planning outcomes and sequencing.

Use existing decision documents instead of creating competing specifications. Update current-state documentation only when implementation makes a new fact true.

### Local planning material

`local-docs/` is a private boundary for planning, execution packets, screenshots, audits, and personal routing notes. It is not product authority and a fresh clone must remain understandable without it.

## Technology and architecture

- TypeScript 5 with strict mode;
- Node.js 22 LTS (`>=22.0.0 <25`);
- Next.js 16 App Router and React 19;
- Tailwind CSS 4 with local UI primitives;
- Corepack pnpm 11.

Key boundaries:

```text
src/app/              App Router routes, layouts, metadata, and global styles
src/features/         feature-owned UI and future vertical slices
src/shared/           small cross-feature product components and utilities
src/components/ui/    low-level reusable UI primitives
src/auth/             reserved authentication and authorization boundary
src/db/               reserved persistence, schema, and migration boundary
tests/e2e/            Playwright browser scenarios
```

Keep route composition thin and place feature-specific behavior under a feature-owned directory within `src/features/`.

## Key paths

- `src/app/` - routes, layouts, metadata, and global styles;
- `src/features/` - future feature vertical slices;
- `src/shared/` - shared product components and utilities;
- `src/components/ui/` - low-level UI primitives;
- `tests/` - Playwright end-to-end scenarios;
- `docs/` - shared decisions and current testing contract;
- `.github/workflows/ci.yml` - CI topology and `CI Gate`;
- `.github/PULL_REQUEST_TEMPLATE.md` - pull request structure.

## Commands

| Task | Command |
| --- | --- |
| Install | `corepack pnpm install --frozen-lockfile` |
| Dev | `corepack pnpm dev` |
| Lint | `corepack pnpm lint` |
| Type check | `corepack pnpm typecheck` |
| Unit/component tests | `corepack pnpm test` |
| E2E | `corepack pnpm test:e2e` |
| Production build | `corepack pnpm build` |

The E2E browser may require `corepack pnpm exec playwright install chromium` once per environment.

## Code and domain invariants

- Use React Server Components by default; add Client Components only for hooks, event listeners, or browser interaction.
- Keep `src/shared/` small and add code there only for real cross-feature consumers.
- Maintain strict TypeScript, validate external and mutation inputs at their boundaries, and preserve established error handling.
- When protected behavior is implemented, enforce authentication and authorization on the server rather than through client-only role checks.
- Future domain work must preserve cycle-aware data, auditable changes, and movement-derived hour balances from the approved project decisions.
- Do not add dependencies without a justified implementation need or edit generated artifacts manually.

## Testing and repository hygiene

- Keep unit/component tests co-located with their implementation and Playwright scenarios under `tests/e2e/`.
- Add integration or authorization checks only when the corresponding runtime boundary exists.
- Use deterministic synthetic data; never commit secrets, credentials, personal data, production logs, or data exports.
- Run the smallest relevant checks and use the CI contract documented in `docs/TESTING.md`.
- Treat flaky tests as defects and never claim a check passed unless it actually ran successfully.
- Keep generated directories and artifacts out of manual edits.
- Use the normal protected-branch PR flow. Follow `$git-delivery` for delivery language; merge or squash remains a manual user action unless explicitly requested.
- Keep `main` runnable after each coherent change.
