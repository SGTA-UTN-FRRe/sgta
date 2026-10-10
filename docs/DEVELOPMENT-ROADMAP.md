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

**Current phase:** Interface migration

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
| Interface migration | Move every existing view onto the design system and publish reproducible README screenshots. | None |
| Access and lifecycle | Complete controlled Tutor access and safe account and cycle lifecycle behavior. | Interface migration |
| Academic workflows | Improve Tutor discovery and academic relationship visibility. | Interface migration |
| Operational calendars | Plan office and event calendars week by week from a permanent base, and publish them as shareable images and documents. | Interface migration |
| Hours, consultations and reporting | Make consultation imports resilient and deliver complete, explainable operational outputs. | Access and lifecycle; Academic workflows |
| Academic agenda | Publish support classes (GETs) and exam dates with delegated management. | Access and lifecycle; Operational calendars |
| Production readiness | Establish production services, secure operations, and proven recovery. | Access and lifecycle; Hours, consultations and reporting; Operational calendars; Academic agenda |
| Cutover, pilot and first release | Migrate validated data, prove operation with users, and complete maintainer handover. | Production readiness |

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
- Implement the approved hour transition between cycles: when a new cycle
  starts, accumulated positive balances reset to zero and pending negative
  balances carry forward, recorded as auditable movements so balances stay
  movement-derived, with a controlled way to correct or revert a mistaken
  closing. Today closing a cycle only changes its status and every balance of
  the next cycle starts from zero, so pending negative hours are lost; this
  must be corrected before cycle closing is used in production.
- Grant scoped permissions (for example, managing one agenda) without general
  Admin rights, for the Academic agenda phase.

### Out of scope

- Public registration, password-based sign-in, or access to another Tutor's
  profile.
- Formal scholarship decisions at cycle changes.

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
- Starting a new cycle resets positive balances and carries negative balances
  forward through auditable movements; a mistaken closing can be corrected
  without losing history.
- Scoped permissions are enforced on the server and grant no Admin access
  beyond their scope.

## Phase: Academic workflows

### Objective

Make academic relationships easier to find, understand, and maintain using
cycle-aware canonical data.

### In scope

- Improve Admin Tutor discovery by academic relationship and schedule
  availability.
- Keep Tutor subject relationships visible in the relevant list and detail
  states.
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
- Scholarship relationships per cycle, Admin-to-Tutor linkage, aliases, and
  subject scope each have an approved institutional decision before schema
  implementation. Any resulting schema change has a migration and isolated
  integration coverage; proposed models do not substitute for approval.

## Phase: Operational calendars

### Objective

Let the person who organizes the guards plan office and event calendars week by
week without destroying a permanent base, see coverage at a glance, and publish
each calendar in a form that is clearly better than the spreadsheets shared
today.

### In scope

- Multiple calendars, such as the office and each extraordinary event, managed
  by the same Admin, selected with tabs or a selector, each with its own plans.
  Events can span several weeks and include Saturdays and Sundays. Assignment
  conflicts are validated per Tutor across calendars, so a Tutor can serve in
  the office and at an event when the times are compatible.
- Weekly planning on top of a permanent base: changes for one dated week
  (additions, moves, removals, absences, and recoveries) never modify the base,
  and `Restablecer semana` discards only that week's changes. Schedule data
  never creates or deletes hour movements.
- Configured opening hours per calendar and day, replacing the hours inferred
  from assignments, and a configurable coverage target (two in-person Tutors by
  default) that warns without blocking.
- Export each calendar for a chosen period (a working week, or an event range
  with weekends) as a PNG optimized for messaging apps and as a PDF, from a
  dedicated presentation layout with full display names, career colors and
  legend, modality, and coverage. The PNG dependency is approved.
- Drag and drop in the matrix to move assignments between days and hours, with
  server validation and the form edit kept as the equivalent path.
- Filters by modality and activity type where they improve reading.
- Keep regular plans attached to administrative cycles: each semester starts
  with the Tutors' habitual recurring schedule as its regular plan, weekly
  adjustments (absences, changes, recoveries, coverage) apply on top of it, and
  a new semester may set a new habitual schedule. Schedule planning and the
  hour-accounting closing share the cycle period but stay separate
  responsibilities: closing a cycle never edits plans, and plan changes never
  create hour movements.

### Out of scope

- Attendance recording or automatic hour movements derived from schedules.
- Academic agenda content (GETs and exams).

### Exit criteria

- Office and event calendars coexist, are selected without losing context, and
  each validates conflicts per Tutor across calendars.
- A week can be changed and restored without altering the base plan or any
  hour movement, verified by integration tests.
- Coverage uses configured opening hours and the coverage target, and its
  indicators pass the screenshot review without dominating the calendar.
- PNG and PDF exports render every assignment of the chosen calendar and period
  with full names and the career legend, stay legible at phone width, and
  are verified by automated checks.
- Drag and drop and the keyboard or form alternative produce the same validated
  result.

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

## Phase: Academic agenda

### Objective

Give Tutors and students one reliable place to consult support classes (GETs)
and upcoming exams, maintained by the people responsible for them.

### In scope

- GETs: weekly or extraordinary support classes with subject, responsible
  Tutor, date, time, place, topic, and participant count, optionally related to
  an upcoming exam. GETs and exams are distinct records.
- Exams: midterms, make-up exams, finals, and entry-course evaluations,
  associated with subjects or careers.
- Delegated management through the scoped permissions from Access and
  lifecycle, without a new global role.
- An agenda section within Horarios, with distinct views for GETs and exams,
  reusing the calendar components.
- `GETs de la semana` and `Próximos exámenes` (next 7 to 14 days) on Inicio.

### Out of scope

- Student registration, attendance, or grades.
- Synchronizing official academic calendars from external systems.

### Exit criteria

- Delegated managers can maintain only the agenda content their permission
  covers, verified on the server.
- GETs and exams are listed, filtered, and related without being merged, and
  Inicio shows the weekly GETs and upcoming exams with correct date windows.

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
