<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SGTA - Agent Instructions

## Project

SGTA is an executable Next.js application for the Tutorias UTN FRRe interface. The current runtime includes the public login route with role-aware root redirects, protected Admin and Tutor route/layout shells, responsive navigation, shared UI components, local UI primitives, a PostgreSQL/Drizzle persistence boundary, provisioned Google-only Better Auth configuration, server-side authorization, AdministrativeCycle lifecycle controls, the live Admin overview and canonical operational reports, live Tutor self-service and academic catalog workflows, Admin schedule planning and assignment editing, Admin hour-accounting operations, read-only Google Sheets consultation intake and Admin curation, derived Materias coverage, auditable events, Vitest/Testing Library coverage, PostgreSQL integration coverage, and authenticated/unauthenticated Playwright browser coverage.

The current runtime does not yet include formal scholarship certification or production operational workflows. The `src/auth/` and `src/db/` boundaries contain active secure-foundation implementations, while `src/features/` contains the implemented Admin overview and reporting, cycle/settings, tutor self-service and academic, scheduling, hour-accounting, and consultation slices plus reserved locations for later verticals.

## Instruction hierarchy

Use this order when instructions overlap:

1. explicit user request;
2. nearest applicable `AGENTS.md`;
3. invoked repository skill under `.agents/skills/`;
4. approved project decision documents;
5. current source, tests, manifests, runtime configuration, and CI as evidence of what exists now.

Do not infer repository workflow from task wording when an explicit rule or skill exists.

## Language policy

Choose the language by artifact, never by the language of the conversation or the task prompt.

| Artifact | Language |
| --- | --- |
| Product UI and user-visible messages (labels, errors, metadata, emails) | Spanish, neutral institutional register per `design/PROJECT-DESIGN.md` §2.5 |
| GitHub issues (title, body, comments), issue forms, GitHub Project items and fields | Spanish |
| Roadmap, implementation plans, execution packets | English |
| Development documentation: `README.md`, `docs/`, `design/`, `SECURITY.md`, `AGENTS.md`, `CLAUDE.md`, skills | English |
| Code, identifiers, comments, tests, fixtures, files, directories, route segments | English |
| Branches, commits, PR titles and bodies, squash text | English, per `$git-delivery` |

`design/` is development documentation: its prose is English even though it defines Spanish product copy.

Rules for mixed content:

- Quoted product copy stays verbatim in Spanish inside English artifacts (design specs, test assertions).
- Inside Spanish text, identifiers, paths, commands, and route segments stay in English inside backticks.
- `es-AR` sets locale formats only (dates, numbers); it does not set the voice. No voseo, lunfardo, or colloquial regionalisms.
- Reply to the user in the language they write in; that does not change any artifact's language.
- For an unlisted artifact: English if developers or agents read it inside the repository; Spanish if end users or teammates read it outside the repository.

## Planning and delivery boundary

`docs/DEVELOPMENT-ROADMAP.md` is the planning authority for outcomes, sequencing, scope boundaries, and exit criteria. Roadmap labels, phase numbers, task numbers, milestone labels, and `PHASE-XX.md` names are planning metadata. They may be used in the roadmap, local execution plans, and prompts to locate work.

Planning metadata must not leak into branches, commit subjects, pull request titles or bodies, squash messages, tags, filenames, directories, identifiers, labels, or product-facing names. Derive the durable implementation outcome before creating delivery text.

## Repository skills

Repository skills are optional local tooling and are not included in a fresh
clone. See [Agent tooling](docs/DEVELOPMENT.md#agent-tooling) for the pinned
playbook source and installation instructions. Build and test commands do not
require an AI tool or local skills.

Use the installed skills for their owned procedures:

- `$plan-implementation` turns roadmap or product intent into a decision-complete execution plan.
- `$implement-task` implements one concrete approved task and verifies its boundaries.
- `$git-delivery` creates outcome-oriented branch, commit, pull request, and squash-delivery text when requested.
- `$delegate-task` turns an independently completable plan task or ad-hoc request into a self-contained issue for a teammate.

Do not duplicate those procedures in project documentation.

## Delegation

- **Issue language:** Spanish (see Language policy).
- **Tracker:** GitHub Project #1 owned by `SGTA-UTN-FRRe`.

Delegation is optional. Mark a plan task `Delegable: yes` only when a teammate can complete it from the issue alone and no other task depends on it. Use `$delegate-task` or the Task issue form; the skill owns issue drafting and creation. Create an issue or add it to the project only when explicitly requested.

## Sources of truth

### Current state and evidence

Current source code, tests, manifests, runtime configuration, and CI are the strongest evidence for implemented behavior. `README.md` and the current-state documents under `docs/` are public evidence and must not claim target behavior as a completed runtime capability.

### Approved target decisions

- `design/PROJECT-DESIGN.md` owns visual direction and canonical design tokens.
- `design/UI-SPEC.md` owns routes, states, interactions, responsive behavior, accessibility contracts, and product microcopy.
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
src/features/         implemented cycle/settings, tutor self-service and academic, scheduling, and hour-accounting operations, plus future slices
src/shared/           small cross-feature product components and utilities
src/components/ui/    low-level reusable UI primitives
src/auth/             active authentication, session, and authorization boundary
src/db/               active PostgreSQL persistence, schema, audit, and migration boundary
tests/e2e/            Playwright browser scenarios
tests/integration/    isolated PostgreSQL/Testcontainers scenarios
```

Keep route composition thin and place feature-specific behavior under a feature-owned directory within `src/features/`.

## Key paths

- `src/app/` - routes, layouts, metadata, and global styles;
- `src/features/` - implemented cycle/settings, tutor self-service and academic, scheduling, and hour-accounting slices plus future feature verticals;
- `src/shared/` - shared product components and utilities;
- `src/components/ui/` - low-level UI primitives;
- `src/auth/` - Better Auth configuration, identity policy, provisioning, and server authorization;
- `src/db/` - Drizzle schema, audit validation/recording, and PostgreSQL client boundary;
- `drizzle/` - committed Drizzle migration artifacts;
- `tests/` - unit/component, integration, and Playwright scenarios;
- `vitest.integration.config.ts` - isolated Node/Testcontainers test configuration;
- `scripts/bootstrap-admin.ts` - operator-only first Admin provisioning command;
- `design/` - approved product visual direction and interface behavior specifications;
- `docs/` - current-state documentation, testing contract, and development roadmap;
- `.github/ISSUE_TEMPLATE/` - task intake and security reporting contact;
- `SECURITY.md` - vulnerability disclosure policy;
- `.github/workflows/ci.yml` - CI topology and `CI Gate`;
- `.github/PULL_REQUEST_TEMPLATE.md` - pull request structure.

## Commands

| Task | Command |
| --- | --- |
| Verify (mirrors CI Gate) | `corepack pnpm verify` |
| Template placeholder check | `corepack pnpm check:templates` |
| Install | `corepack pnpm install --frozen-lockfile` |
| Dev | `corepack pnpm dev` |
| Migration check | `corepack pnpm db:check` |
| Apply migrations | `corepack pnpm db:migrate` |
| Lint | `corepack pnpm lint` |
| Type check | `corepack pnpm typecheck` |
| Unit/component tests | `corepack pnpm test` |
| PostgreSQL integration tests | `corepack pnpm test:integration` |
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
