---
mode: decision
status: active
---

# SGTA — Development roadmap

> Phase sequencing, scope boundaries, and exit criteria.

## Objective

Complete a supportable first release of SGTA for the Tutorias area at UTN FRRe.
The remaining work redesigns the existing interface on a shared design system,
then moves through workflow hardening, production readiness, and a controlled
operational cutover.

**Current phase:** Design system foundation

## Constraints

- Browser journeys must use a fixed test date independent of wall-clock time before 2027-01-01.
- Separately review major dependency updates before adoption and record compatibility evidence; automation configuration does not establish review approval.
- The first release excludes attendance tracking and duty-occurrence records; absences remain manual hour movements.
- The first release retains informational scholarship references and excludes formal scholarship certification.
- The first release ships a single light color scheme.
- Every visible change composes primitives from `src/components/ui/` and tokens registered in the project design, and passes a screenshot review at 390, 768, and 1440px with no open Blocking or Major findings before its phase exits.
- View content order, states, and copy are specified in the view's UI specification when its phase is planned; a pattern needed by two or more views joins the shared design system instead of being rebuilt locally.

## Phases

| Phase | Outcome | Depends on |
| --- | --- | --- |
| Design system foundation | Re-express the approved direction as tokens, primitives, shared patterns, and one reference screen approved from screenshots; make verification foundations deterministic. | None |
| Interface migration | Move every existing view onto the design system and publish reproducible README screenshots. | Design system foundation |
| Access and lifecycle | Complete controlled Tutor access and safe account and cycle lifecycle behavior. | Interface migration |
| Academic and scheduling workflows | Improve Tutor discovery, academic relationship visibility, and schedule planning. | Interface migration |
| Hours, consultations and reporting | Make consultation imports resilient and deliver complete, explainable operational outputs. | Access and lifecycle; Academic and scheduling workflows |
| Production readiness | Establish production services, secure operations, and proven recovery. | Access and lifecycle; Hours, consultations and reporting |
| Cutover, pilot and first release | Migrate validated data, prove operation with users, and complete maintainer handover. | Production readiness |

## Phase: Design system foundation

### Objective

The approved SGTA visual direction exists as tokens in code, a complete
primitive layer, shared product patterns, and one reference screen, each
approved from rendered screenshots. Fixtures, business dates, and browser
verification are deterministic foundations for later work.

### In scope

- Run a baseline screenshot review of the main Admin and Tutor routes and
  classify each finding as a design-system or a view-level problem.
- Rewrite the project design in the current template while preserving the
  approved brand colors, the Faro identity, Branded Product expression,
  Operational density, and the neutral Spanish voice, and adding a serif
  heading face, neutral surfaces without pastel tints, navy ink actions, and a
  saturated career palette. Register tokens as `oklch()` values with shadcn
  semantic names plus product extensions for navigation, brand surfaces, and
  status pairs, and remove the link to the retired design standard.
- Implement the token registry in `src/app/globals.css` and expose spacing,
  type, tracking, layering, and layout tokens to Tailwind so components need no
  arbitrary values.
- Complete the primitive layer from shadcn/ui, including label, select,
  textarea, checkbox, dialog, alert dialog, sheet, dropdown menu, tabs, tooltip,
  skeleton, and toast primitives as the product needs them, and reconcile the
  existing button, badge, card, input, and table primitives. Dependency
  additions are approved in the phase plan.
- Add a development-only design preview route that renders the type scale,
  every color token, controls in each variant and state, table rows, status
  badges, an empty state, and a page header with the signature move.
- Build shared product patterns from primitives: the application shell with an
  Admin sidebar that becomes a sheet in Compact and a Tutor top navigation bar,
  page header, data table, filter bar, form field, confirmation dialog, and
  system states.
- Add a lint rule that rejects raw `button`, `input`, `select`, `textarea`, and
  `dialog` elements outside `src/components/ui/`, starting at warning level.
- Rebuild Horarios at full fidelity as the reference screen for later
  migrations, with assignments colored and labeled by the Tutor's career and a
  career legend that filters the grid.
- Let Admins assign a palette color to each career in Configuración, migrate
  existing careers, and validate the color on the server.
- Restructure the UI specification in the current template: global rules,
  system states, a route inventory with a README screenshot column, and
  per-view files under `design/ui-spec/`. Remove visual prose that duplicates
  the project design.
- Keep fixture-only data and copy out of production feature imports and remove
  duplicated business-date logic in favor of the shared Argentina date boundary.
- Make browser journeys independent of the machine's current date, pass only
  explicitly allowlisted environment values to the E2E application process, and
  validate the production-build prerequisite and execution limits.

### Out of scope

- Migrating views other than Horarios.
- A dark color scheme.
- New domain capabilities other than the career color, or changes to
  hour-accounting rules.
- Production hosting, data migration, and external service cutover.

### Exit criteria

- The project design and UI specification follow the current templates and are
  approved again after the user reviews the design preview screenshots; the
  token registry and `src/app/globals.css` match.
- The design preview route is unavailable in a production build, verified by an
  automated check.
- The raw-element lint rule flags a fixture containing each restricted element
  and passes primitives and pages that compose them.
- Horarios uses only primitives, shared patterns, and registered tokens, and
  passes the screenshot review in Constraints.
- Every career has a palette color: existing careers are migrated, new careers
  receive one, and the server rejects values outside the palette.
- Token, primitive, and shell changes add no new Blocking or Major finding to
  other views compared with the baseline screenshot review.
- Production feature code does not import fixture modules, and server-side
  business-date calculations use the shared date boundary.
- Browser journeys pass with a fixed test date before the deadline in
  Constraints.
- E2E environment forwarding is enforced by an explicit allowlist; the runner
  rejects a missing production build and has validated execution limits.
- The required lint, type, unit, integration, build, and browser checks pass.

## Phase: Interface migration

### Objective

Every existing view uses the design system consistently, overlays are
accessible primitives, and README screenshots can be regenerated from
deterministic demo data.

### In scope

- Migrate the remaining views in priority order: Admin operating views, Tutor
  views, and Login, then Materias and Configuración. Deliver one view at a time
  with before and after screenshots.
- Replace hand-built modal regions with dialog, alert dialog, and sheet
  primitives, and replace raw controls and arbitrary values with primitives,
  shared patterns, and tokens.
- Split oversized screen modules along the shared patterns without changing
  behavior.
- Make filters, movement links, and label conventions consistent across related
  views.
- Reconcile each view's UI specification with its delivered content and states.
- Apply the shared duration format, compact system states, and career colors in
  every view that shows durations, empty states, or careers.
- Add a Screenshots command and README screenshots for the views marked in the
  UI specification's README column.
- Run a final screenshot review across all views and raise the raw-element lint
  rule to error.

### Out of scope

- New views or domain behavior.
- A dark color scheme.
- Changes to hour-accounting rules.

### Exit criteria

- The raw-element lint rule runs at error level with no violations.
- Components outside `src/components/ui/` use no arbitrary color, radius,
  shadow, font, type-size, tracking, or layering values.
- Every overlay uses a primitive with focus entry, containment, Escape dismissal,
  and focus return, verified by browser accessibility checks.
- Every view passes the screenshot review in Constraints.
- README screenshots regenerate from deterministic demo data with a documented
  Screenshots command.
- Existing browser journeys pass without behavior changes.

## Phase: Access and lifecycle

### Objective

Let Admins manage application access safely and make account and cycle state
understandable to the people who use it.

### In scope

- Provide protected Admin workflows to enable and disable Tutor access and
  maintain the link between an application identity and its Tutor record.
- Prevent actions that would leave the application without an enabled Admin.
- Make sign-out and session expiration clear across Admin and Tutor surfaces;
  provide a read-only Tutor profile and signed-in Admin user context.
- Complete missing confirmations for account and cycle lifecycle actions,
  including authorized reopening with audit and preserved history.

### Out of scope

- Public registration, password-based sign-in, or access to another Tutor's
  profile.
- Automatic hour transfer or formal scholarship decisions at cycle changes.

### Exit criteria

- Admin access changes are validated and authorized on the server and cannot
  disable or demote the last enabled Admin.
- Tutor reads remain owner-scoped, including profile and lifecycle context.
- Sign-out and expired-session paths recover safely across protected pages and
  APIs, including 12-hour expiration.
- Tutors can read only their own profile; Admin surfaces expose the signed-in
  user's context. Account and cycle lifecycle confirmations cover the affected
  actions before mutation.
- Cycle actions reject writes to closed cycles; only the most recently closed
  cycle can be reopened. Server authorization, confirmation, historical
  preservation, and an audit record are verified.

## Phase: Academic and scheduling workflows

### Objective

Make academic relationships and schedule planning easier to find, understand,
and maintain using cycle-aware canonical data.

### In scope

- Improve Admin Tutor discovery by academic relationship and schedule
  availability.
- Keep Tutor subject relationships visible in the relevant list and detail
  states.
- Derive schedule views from the selected plan and its assignments rather than
  an arbitrary fixed time range.
- Review data-model changes against approved institutional decisions on
  scholarship cardinality per cycle, Admin-to-Tutor linkage, career and subject
  aliases, and global or career-specific subject scope before implementing schema
  changes or including them in a production migration.

### Out of scope

- Attendance recording or automatic hour movements derived from schedule
  assignments.
- Unvalidated catalog or scholarship rules.

### Exit criteria

- Admins can find Tutors by the supported academic and availability criteria;
  results remain correct for regular and effective special plans.
- Tutor academic relationships are visible in compact and wide layouts without
  creating a second source of truth.
- Schedule views include the full configured range and preserve special-plan
  precedence without writing schedule data during reads.
- Scholarship relationships per cycle, Admin-to-Tutor linkage, aliases, and
  subject scope each have an approved institutional decision before schema
  implementation. Any resulting schema change has a migration and isolated
  integration coverage; proposed models do not substitute for approval.

## Phase: Hours, consultations and reporting

### Objective

Keep operational records traceable as source volume grows and make requested
outputs complete and safe to share.

### In scope

- Make consultation synchronization resilient to source growth and row changes:
  validate row/payload limits, incremental or paginated intake, row reordering/deletion
  reconciliation, and execution duration against the deployment function limit,
  while preserving idempotency, review, and canonical history.
- Obtain approved institutional decisions on optional student surname and
  supported consultation sources and participant-count models before schema
  changes. Validate source mappings and date interpretation before adoption.
- Provide complete filtered report exports in CSV and print-ready form with
  locale-aware formatting and formula-injection protection.
- Document and test report count semantics so consultation totals are not
  confused with counts of unique people.
- Preserve movement-derived balances and explicit reversal history.
- Provide Tutor search in hour operations and consistent product labels for
  debit/credit movements while preserving signed ledger semantics.

### Out of scope

- Writing to the consultation source.
- Student-level identity in operational reports or automatic scholarship
  certification.

### Exit criteria

- Import tests cover approved row/payload limits, incremental or paginated intake,
  and reordered or deleted source rows without silently duplicating or losing
  canonical consultations. Measured duration fits the deployment function limit;
  source outages leave reviewed history available.
- Optional student surname, source support, and participant-count semantics
  have approved institutional decisions before schema implementation.
- Exports contain every row allowed by the applied filters and safely encode
  user-controlled values.
- Report totals have documented definitions, accessible alternatives, and no
  unsupported academic or scholarship claims.
- Hour balances remain reconstructable from signed movements and reversals.
- Tutor search finds the intended hour-operation targets, and "Resta" / "Suma"
  labels correspond to debit/credit movements without changing balances or
  reversal behavior.

## Phase: Production readiness

### Objective

Establish a separate production environment and prove that SGTA can be deployed,
operated, monitored, and recovered by authorized maintainers.

### In scope

- Configure production hosting, PostgreSQL, Google OAuth, and read-only Sheets
  access separately from presentation and preview environments.
- Validate Tutor Google accounts and production OAuth consent and access
  before enabling operational sign-in.
- Define the migration-before-deploy procedure, secret handling, first Admin
  provisioning, and operational ownership in the deployment runbook.
- Establish encrypted backups, retention, a tested restore procedure, and safe
  error reporting.

### Out of scope

- Loading real operational data or beginning the Tutor pilot.
- Committing production credentials, personal records, or backup artifacts.

### Exit criteria

- A production deployment can be reproduced from a reviewed revision and
  documented configuration without applying migrations during the build.
- Production OAuth, database, and read-only consultation access pass protected
  smoke checks; previews cannot access production data.
- Tutor Google accounts and production OAuth consent are validated for the
  intended users; staging consultation input remains separate from the live
  read-only production source.
- A backup is encrypted and retained outside the application database, and a
  restore drill recovers a verified database.
- Approved retention rules cover student contact data; error reporting is
  exercised without exposing credentials or personal records.
- The runbook explains provisioning, migrations, secret rotation, monitoring,
  recovery, and maintainer responsibilities without relying on local-only
  planning files.

## Phase: Cutover, pilot and first release

### Objective

Move validated operational data into production, prove the main workflows with
the Tutorias team, and complete a maintainable first release.

### In scope

- Validate source data before cutover: mappings, dates, catalog completeness,
  Tutor names and identity fields, activity history, and recess/vacation plans.
- Reconcile migrated Tutors, academic relationships, cycles, hour balances,
  schedules, and consultation history against approved source records.
- Agree on cutover timing, go/no-go checks, abort criteria, and the transition
  away from the duplicate operational spreadsheet workflow.
- Define the parallel operating period and final spreadsheet cutoff, validate
  official cycle dates, and decide cycle closure and opening timing for the pilot.
- Run an Admin and Tutor pilot, fix defects that block the approved scope, and
  provide concise user and Admin guidance.
- Complete maintainer handover and tag the first stable release.

### Out of scope

- New product verticals or formal scholarship certification.
- Expanding migration scope beyond validated records and the approved first
  release.

### Exit criteria

- Pre-cutover validation records source mappings and date rules, catalog and
  Tutor identity completeness, historical activity treatment, and recess plans;
  unresolved exceptions block adoption of the affected data.
- Migrated records and derived balances reconcile to the approved source
  evidence, with exceptions reviewed by the responsible Admin.
- The pilot completes the main Admin operating loop and Tutor self-service
  without unresolved release-blocking defects.
- Cutover and abort procedures are exercised or reviewed against a documented
  recovery path.
- The parallel operating period, final cutoff, official cycle dates, and pilot
  cycle transition have approved decisions and reconciled balances at cutover.
- User guidance, operator runbook, and maintainer handover are complete, and the
  first stable release is tagged.

## Maintenance

When a phase completes, move **Current phase** to the next phase and delete the
completed phase's section and table row; Git history keeps them. Update
sequencing when a real dependency or validated institutional requirement
changes. Decompose complex work in a local execution plan without turning this
roadmap into an issue tracker.
