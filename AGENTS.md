<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SGTA — Agent Instructions

## Project

SGTA is a Next.js application for the Tutorias area at UTN FRRe, with server-authorized Admin operations and read-only Tutor self-service.
It is deployed for presentation; production cutover and formal scholarship certification remain outside the current runtime.

## Instruction hierarchy

Use this order when instructions overlap:

1. explicit user request;
2. nearest applicable `AGENTS.md`;
3. invoked skill;
4. approved project decision documents;
5. current source, tests, manifests, runtime configuration, and CI as evidence of what exists now.

Do not infer repository workflow from task wording when an explicit rule or skill exists.

## Language policy

Choose the language by artifact, never by the language of the conversation or the task prompt.

| Artifact | Language |
| --- | --- |
| Product UI and user-visible messages (labels, errors, metadata, emails) | Spanish, neutral institutional register per `design/PROJECT-DESIGN.md` › Voice |
| GitHub issues (title, body, comments), issue forms, GitHub Project items and fields | Spanish |
| Roadmap, implementation plans, execution packets | English |
| Development documentation: `README.md`, `docs/`, `design/`, `SECURITY.md`, `AGENTS.md`, `CLAUDE.md`, skills | English |
| Code, identifiers, comments, tests, fixtures, files, directories, route segments | English |
| Branches, commits, PR titles and bodies, squash text | English, per `git-delivery` |

`design/` is development documentation: its prose is English even though it defines Spanish product copy.

Rules for mixed content:

- Quoted product copy stays verbatim in Spanish inside English artifacts (design specs, test assertions).
- Inside Spanish text, identifiers, paths, commands, and route segments stay in English inside backticks.
- `es-AR` sets locale formats only (dates, numbers); it does not set the voice. No voseo, lunfardo, or colloquial regionalisms.
- Reply to the user in the language they write in; that does not change any artifact's language.
- For an unlisted artifact: English if developers or agents read it inside the repository; Spanish if end users or teammates read it outside the repository.

## Planning and delivery boundary

`docs/DEVELOPMENT-ROADMAP.md` is the planning authority for outcomes, sequencing, scope boundaries, and exit criteria. Roadmap labels, phase numbers, task numbers, and milestone labels are planning metadata. They may be used in the roadmap, local execution plans, and prompts to locate work.

Planning metadata must not leak into branches, commit subjects, pull request titles or bodies, squash messages, tags, filenames, directories, identifiers, labels, or product-facing names. Derive the durable implementation outcome before creating delivery text.

## Skills

Skills are optional personal tooling installed from the [engineering playbook](https://github.com/acevedo-daniel/engineering-playbook); build and test commands do not require them.

| Work | Skill |
| --- | --- |
| Plan a feature, phase, or refactor | `plan-implementation` |
| Implement a planned task, fix, or feature | `implement-task` |
| Write or repair tests | `write-tests` |
| Set up or change CI or protect main | `setup-ci` |
| Branch, commit, PR, or merge text | `git-delivery` |
| Visual direction and design tokens | `define-design` |
| Any visible UI change or visual review | `build-ui` |
| Hand work to a teammate | `delegate-task` |
| Audit this project against the playbook | `apply-playbook` |
| Record a recurring agent mistake | `record-lesson` |

A skill owns its procedure and output format. Do not duplicate those procedures in project documentation.

## Delegation

- **Issue language:** Spanish (see Language policy).
- **Tracker:** GitHub Project #1 owned by `SGTA-UTN-FRRe`.

Delegation is optional. Mark a plan task `Delegable: yes` only when a teammate can complete it from the issue alone and no other task depends on it. Use `delegate-task` or the Task issue form; the skill owns issue drafting and creation. Create an issue or add it to the project only when explicitly requested. If an issue does not match the repository or its next step is unclear, comment on the issue and wait; sending the comment requires authorization from the user or the invoked delegation skill.

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
src/app/                         App Router routes, layouts, metadata, and global styles
src/features/admin-overview/     Admin overview
src/features/consultations/      Read-only intake and Admin curation
src/features/cycles/             AdministrativeCycle lifecycle
src/features/hours/              Hour ledger and movement operations
src/features/reports/            Canonical operational reports
src/features/schedules/          Schedule plans and assignments
src/features/settings/           Admin settings interface
src/features/tutor-self-service/ Owner-scoped Tutor views
src/features/tutors/              Tutor registry, academic catalogs, and coverage
src/shared/                      Small cross-feature product components and utilities
src/components/ui/               Low-level reusable UI primitives
src/mocks/                       Synthetic test fixtures; production code must not import them
src/config/                      Validated environment configuration
src/auth/                        Authentication, sessions, provisioning, and authorization
src/db/                          PostgreSQL client, schema, and audit boundary
drizzle/                         Committed generated migration artifacts
scripts/                         Operator commands and repository checks
tests/integration/               Isolated PostgreSQL/Testcontainers scenarios
tests/e2e/                       Playwright browser scenarios
```

Keep route composition thin and place feature-specific behavior under its owner in `src/features/`.

## Key paths

- `design/` - approved visual direction and interface behavior specifications.
- `docs/` - current-state documentation, testing contract, and development roadmap.
- `.github/ISSUE_TEMPLATE/` - task intake and security reporting contact.
- `.github/workflows/ci.yml` - CI topology and `CI Gate`.
- `.github/PULL_REQUEST_TEMPLATE.md` - pull request structure.
- `SECURITY.md` - vulnerability disclosure policy.

## Commands

| Task | Command |
| --- | --- |
| Verify (mirrors CI Gate) | `corepack pnpm verify` |
| Template placeholder check | `corepack pnpm check:templates` |
| Install | `corepack pnpm install --frozen-lockfile` |
| Dev | `corepack pnpm dev` |
| Migration check | `corepack pnpm db:check` |
| Generate migrations | `corepack pnpm db:generate` |
| Apply migrations | `corepack pnpm db:migrate` |
| Bootstrap Admin | `corepack pnpm auth:bootstrap-admin` |
| Import initial data (dry-run by default) | `corepack pnpm data:import` |
| Verify initial data | `corepack pnpm data:verify` |
| Review database query plans | `corepack pnpm db:query-audit` |
| Lint | `corepack pnpm lint` |
| Type check | `corepack pnpm typecheck` |
| Unit/component tests | `corepack pnpm test` |
| PostgreSQL integration tests | `corepack pnpm test:integration` |
| E2E | `corepack pnpm test:e2e` |
| Screenshots (README images) | `corepack pnpm screenshots` |
| Review screenshots (every view, three widths) | `corepack pnpm screenshots:review` |
| Production build | `corepack pnpm build` |

The E2E browser may require `corepack pnpm exec playwright install chromium` once per environment.

## Code rules

- Use React Server Components by default; add Client Components only for hooks, event listeners, or browser interaction.
- Keep `src/shared/` small and add code there only for real cross-feature consumers.
- Maintain strict TypeScript, validate external and mutation inputs at their boundaries, and preserve established error handling.
- When protected behavior is implemented, enforce authentication and authorization on the server rather than through client-only role checks.
- Future domain work must preserve cycle-aware data, auditable changes, and movement-derived hour balances from the approved project decisions.
- Prefer established idiomatic patterns unless an approved change replaces them. Do not edit generated artifacts manually.
- Compose visible UI from primitives in `src/components/ui/` and tokens registered in `design/PROJECT-DESIGN.md`; add a missing primitive or variant instead of restyling at the call site.

## Always

- Run `corepack pnpm verify` before reporting runtime work as done; documentation-only deliveries may use the relevant template, lint, type, and diff checks, with the full `CI Gate` required before merge. Never claim a check passed unless it actually ran successfully.
- If the same check still fails after two fix attempts, stop and report the command, failure output, and hypothesis.
- Never weaken, skip, or retry a check merely to obtain a pass.
- Choose each artifact's language from the Language policy.
- Planning labels (phase, task, and milestone names or numbers) never appear in branches, commits, PRs, files, or identifiers.
- Current code is evidence of what exists; `docs/DEVELOPMENT-ROADMAP.md`, `design/PROJECT-DESIGN.md`, and `design/UI-SPEC.md` are the approved target.

## Ask before

Ask the user before the following actions unless the current request or approved execution plan already authorizes them:

- Adding, removing, or upgrading dependencies.
- Changing a database schema, migration, or persisted data.
- Deleting files, data, or public API surface.
- Changing CI workflows, repository settings, or branch protection.
- Editing approved decision documents (`docs/DEVELOPMENT-ROADMAP.md`, `design/PROJECT-DESIGN.md`, `design/UI-SPEC.md`).
- Creating branches, commits, pushes, or pull requests that were not requested.

## Testing rules

- Keep unit/component tests co-located with their implementation and Playwright scenarios under `tests/e2e/`.
- Add integration or authorization checks only when the corresponding runtime boundary exists.
- Use deterministic synthetic data; never commit secrets, credentials, personal data, production logs, or data exports.
- Run the smallest relevant checks and use the CI contract documented in `docs/TESTING.md`.
- Timeouts are budgets set once in `playwright.config.ts`, `vitest.config.ts`, and `src/test/setup.ts`; never add per-test or per-wait overrides. A test that hits its budget has a cause to fix.
- Browser tests import `test` from `tests/e2e/fixtures.ts`, which waits for `html[data-hydrated="true"]`; call `waitForHydration` after click-driven full navigations.
- CI retries E2E tests once; a flaky warning is a defect to fix with `write-tests`, not a pass.
- Keep generated directories and artifacts out of manual edits.
- Test the smallest correct boundary: unit, then integration, then E2E. Add or update tests for changed behavior when that boundary exists.

## Documentation rules

- Current-state docs describe verified repository facts; keep target decisions in their existing authoritative documents.
- Remove stale claims instead of layering contradictory notes.
- When a change alters a view in UI-SPEC's README screenshot column, regenerate its screenshot in the same change once the Screenshots command exists. The Interface migration phase owns that command and the initial README screenshots.
- `local-docs/` is git-ignored and never linked from tracked files: active plans in `execution/`, issue drafts in `issues/`, human-kept material in `keep/`, and every other agent-written file (scripts, PR text, screenshots, build output) in `tmp/`. Deleting `tmp/` contents, plans whose PRs merged, and posted issue drafts needs no confirmation; never delete `keep/`.

## Repository delivery

- Use focused, outcome-oriented branches and pull requests with one dominant outcome per PR.
- Use the normal protected-branch PR flow and keep `main` runnable after each coherent delivery.
- Follow `git-delivery` for naming and delivery text. Merge or squash remains a manual user action unless explicitly requested.
