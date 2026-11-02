---
mode: decision
status: active
---

# SGTA — Development roadmap

> Phase sequencing, scope boundaries, and exit criteria.

## Objective

Deliver the complete flow of Tutorias information, from capture to export,
because the area's reports depend on it. Everything else is deferred until the
project needs it.

**Current phase:** Data definition

**Roadmap status:** Active since 2026-11-02, after a pause that began on
2026-10-16.

## Current focus

The interface migration closed before the pause: every existing view composes
the shared design system, matches its UI specification, and passed the
screenshot review. The implemented behavior is described in
[Project › Functional status](PROJECT.md#functional-status).

The phases run in the order of the table below. Work outside the flow waits in
[Deferred](#deferred) until a confirmed need brings it back.

- One maintainer develops SGTA and delivers through pull requests. Work is
  planned from this roadmap, without a project board.
- Tutorias has no prescribed report structure and no formal roles. The project
  owner decides the data flow and presents it to coordination, which approves or
  corrects it. A correction updates the affected phase.

### Data decisions

These decisions apply to every phase of the data flow:

- **Records:** an attention is one Tutor intervention on one matter; an activity
  is organized for several people; a participation is one identified student at
  a GET; a student links those records.
- **Figures:** registered consultations, people served, attendance at
  activities, and identified students have published definitions and are never
  added together.
- **Identity:** the student form requires DNI and accepts an optional legajo.
  Matching is deterministic: a matching identifier with a compatible surname
  links records, a conflict goes to review, and a name alone never links them.
- **Per-record values:** career and academic condition belong to each record,
  not to the student.
- **Subjects:** one subject catalog, where a subject can belong to several
  careers. It lists tutored subjects plus Seminario Universitario and Otra.
- **GETs:** each modality is its own GET, with its own responsible Tutors and
  declared attendance. While forms are in use, responses join a GET by subject,
  date, and modality; an ambiguous join keeps the participation without a
  specific GET and changes no figure.
- **Review:** clean rows consolidate automatically, only genuine exceptions need
  review, and a record in review still counts.
- **Sources:** forms and sheets are read-only for SGTA. Corrections happen in
  SGTA, and a new import never overwrites them.
- **Access for now:** the people who administer data are Admins with individual
  accounts, and other team members keep the Tutor role, which is the one with
  self-service views. Role design comes last.

### Definition priorities

Each item needs answers from the people who run Tutorias, not code. Record each
answer as an approved decision in the phase it unblocks.

| Priority | What must be defined or tested | Who answers | Unblocks |
| --- | --- | --- | --- |
| 1 | Walk Consultas and Reportes with an Admin on desktop and phone; record what is wrong, missing, or unused. | Tutorias Admin | Data intake; Reports and export. |
| 2 | Name the production owner, hosting and Google Workspace accounts, and who maintains SGTA. | Tutorias area and UTN FRRe | Production readiness. |
| 3 | Confirm whether a legajo identifies one person or can vary by career. DNI remains the main key meanwhile. | Tutorias coordination | Data intake refinement; not blocking. |

## Constraints

- Browser journeys must use a fixed test date independent of wall-clock time before 2027-01-01.
- Separately review major dependency updates before adoption and record compatibility evidence; automation configuration does not establish review approval.
- The first release excludes Tutor attendance tracking and duty-occurrence records; absences remain manual hour movements.
- The first release retains informational scholarship references and excludes formal scholarship certification.
- Before the first release, define the personal-data notice and retention period for student data, with institutional advice. Forms start without a notice until then.
- Before closing a real cycle, resolve the cycle transition: closing today preserves history but does not carry pending negative balances into the next cycle.
- The first release ships a single light color scheme.
- Every visible change composes primitives from `src/components/ui/` and tokens registered in the project design, and passes a screenshot review at 390, 768, and 1440px with no open Blocking or Major findings before its phase exits.
- View content order, states, and copy are specified in the view's UI specification when its phase is planned; a pattern needed by two or more views joins the shared design system instead of being rebuilt locally.

## Phases

| Phase | Outcome | Depends on |
| --- | --- | --- |
| Data definition | Three forms capture consistent data with the fields SGTA will use. | None |
| Data intake | SGTA reads the forms' sheets, normalizes them, and reviews only exceptions. | Data definition |
| Production readiness | Establish production services, secure operations, and proven recovery, so identified data can be loaded. | Data intake |
| Activities | GETs and other activities, with participations, are visible in SGTA. | Data intake |
| Reports and export | Generate the annual and follow-up reports and export them. | Data intake; Activities |
| 2026 migration | Normalize and load the 2026 history without blocking any other phase. | Data intake; Activities |
| In-app registration | Activities and quick consultations move into SGTA and replace their forms. | Activities; Production readiness |

## Phase: Data definition

### Objective

Capture consistent data from the start of 2027, using forms with the same fields
SGTA will use, so quality data accumulates before the application absorbs it.

### In scope

- Present the operating proposal to coordination for approval or correction:
  records, figures, fields, report structure, and daily procedures.
- Prepare official catalogs for careers, subjects, Tutors, channels, orientation
  reasons, and activity types.
- Build three Google Forms owned by an area account, with closed options and DNI
  format validation:
  - a student form that registers a consultation or GET attendance;
  - Tutor quick registration;
  - Activities, to plan a GET, record its result, or record another activity.
- Close the current form and daily sheet when the new forms open, keeping their
  data unchanged for the report in progress and the later migration.

### Out of scope

- Application code.
- The 2026 report, which keeps its current process.
- Institutional sign-off on the personal-data notice and retention period.

### Exit criteria

- The forms are in use, with a target of 2026-11-15, and November and December
  serve as a low-volume test.
- A test response for every form path reaches its sheet, and every option
  matches its catalog.
- Options are adjusted from the test and frozen before the 2027 intake.

## Phase: Data intake

### Objective

Read the real forms' sheets, so clean data reaches canonical records without
manual work and Admins review only genuine exceptions. The current import has
only run on a rewritten copy of the source; on the live sheet, every row would
land in review.

### In scope

- Read the three sheets through a source registry that replaces the single-source
  environment configuration, using incremental or paginated intake. Validate
  row and payload limits and execution duration against the deployment function
  limit, while preserving idempotency, review, and canonical history.
- Identify each response with a stable key that does not depend on its row:
  timestamp, person or Tutor identifier, and subject. Evaluate Forms API response
  IDs as an alternative. Reconcile reordered and deleted source rows.
- Store a per-source value map, so resolving one unrecognized value applies to
  every matching row, including career codes.
- Consolidate clean rows automatically and route exceptions to the existing
  review flow.
- Allow audited corrections to canonical consultations that a new import cannot
  overwrite.
- Change the consultation model: optional student name, career, and Tutor;
  consultation type, orientation reason, channel, origin, and people served; a
  consultation classified as Otra without a catalog subject.
- Replace career-owned subjects with one subject catalog and careers per subject,
  including Tutor coverage and report filters.
- Add student identity with DNI, legajo, deterministic matching, identifier
  correction, and a reversible merge.
- Document date interpretation and spreadsheet locale for each source.

### Out of scope

- Writing to any source.
- Activity views, which belong to the Activities phase.
- Loading identified data before Production readiness exits.

### Exit criteria

- Tests with fixtures shaped like the real forms cover row and payload limits,
  incremental intake, and reordered or deleted rows without silently duplicating
  or losing canonical records. Measured duration fits the deployment function
  limit, and source outages leave reviewed history available.
- Only genuine exceptions reach review, and a record in review still counts.
- A correction survives a new import; a conflicting source change goes to review.
- Student matching covers every association rule, including conflicts and
  name-only coincidences, verified by integration tests.

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

- Loading real hour, schedule, or Tutor records, or beginning the Tutor pilot.
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
- Error reporting is exercised without exposing credentials or personal records.
- Identified data from the new forms loads into production only after the restore
  drill passes; until then, it stays in the sheets.
- The runbook explains provisioning, migrations, secret rotation, monitoring,
  recovery, and maintainer responsibilities without relying on local-only
  planning files.

## Phase: Activities

### Objective

Make GETs and other activities visible in SGTA with their attendance, because
they move the largest volume of people the area serves and appear in its reports.

### In scope

- Add an activity record, separate from the hour-ledger `activity` origin: type,
  subject, topic, date, modality, place, responsible Tutors, status, declared
  attendance, and observations.
- Import the Activities form, joining a plan and a result by subject, date, and
  modality, and treating a result with no plan as a valid GET.
- Add participations from the student form, keyed by person, subject, date, and
  modality, with a nullable link to one GET. A response can link up to two days
  after its GET if only one GET matches.
- Provide an Admin view of activities and programmed GETs with no result, and
  show the pending ones as attention items on Inicio.
- Give the hour-ledger activities and the new activities distinct product labels.

### Out of scope

- Creating or editing activities in SGTA, which belongs to In-app registration.
- Automatic hour movements. An activity may link to an hour origin later only as
  an explicit Admin action.
- Tutor attendance tracking.

### Exit criteria

- Plans, results, and participations import idempotently; two GETs on the same
  subject, date, and modality remain ambiguous without changing any figure.
- A participation with no matching GET and duplicate results reach review.
- Declared attendance and registered participations stay separate and are never
  forced to match.

## Phase: Reports and export

### Objective

Let the area generate its reports at any time from reviewed records, with every
figure defined and traceable.

### In scope

- An annual report with aggregated data only: the four figures; consultations by
  frequency, type, subject, career, modality, channel, condition, and orientation
  reason; GETs held and cancelled, with attendance; other activities by type;
  identified students; and definitions. Each report states its period, cutoff,
  generation date, filters, and pending reviews. A period starts the day after the
  previous cutoff; the proposed cutoff is October 31.
- An internal follow-up report with DNI: a view per student, a view per student
  and subject, and a chronological record found by DNI or name. Declared results
  can be added as annotations identified as declared information.
- PDF for the annual report, and Excel and CSV for both. Exports use locale-aware
  formatting and formula-injection protection. Excel needs dependency approval.
- Keep the current Reportes view as the operational report.
- Document and test count semantics, so consultation totals are not confused with
  counts of unique people.

### Out of scope

- Causal claims, academic records, grade integration, or verified results.
- Automatic scholarship certification.

### Exit criteria

- Coordination approves or corrects the structure using data from the new forms.
- Exports contain every row allowed by the applied filters and safely encode
  user-controlled values.
- Report totals have documented definitions, accessible alternatives, and no
  unsupported academic or scholarship claims.
- Only authorized users can generate the follow-up report, verified on the server,
  and the annual report contains no personal identifiers.

## Phase: 2026 migration

### Objective

Bring the 2026 history into SGTA once the system works. This phase has no deadline
and never blocks another phase.

### In scope

- Load the 2026 form as unidentified consultations.
- Deduplicate the daily sheet's rows without a source against the form, and review
  only those that do not match.
- Load the daily sheet's Instagram rows with their counts, flagging aggregated
  rows.
- Load GETs, events, workshops, and trainings from the annual schedule with their
  recorded attendance, leaving out team meetings.
- Explain the difference between the previously reported 907 and the new figures,
  since 907 counted people rather than consultations.

### Out of scope

- Requiring fields that were never collected.

### Exit criteria

- Every source reconciles to its row counts, without duplicating the form.
- Migrated records are identified by origin, and 2026 and 2027 figures are not
  presented as directly comparable.

## Phase: In-app registration

### Objective

Move activities and quick consultations into SGTA, so Tutors stop using the two
internal forms. Those forms are a bridge that records data in the expected format.

### In scope

- Create, edit, reschedule, cancel, and record the result of a GET or other
  activity, keeping change history. Deleting is limited to records created by
  mistake with no participations, and it leaves an audit record.
- Generate each GET's identifier and QR, with its code already filled in, so
  participations join it directly and students stop choosing the subject.
- Register a quick consultation with the same fields as its form, in few steps on
  a phone, with the Tutor taken from the session.
- Create canonical consultations directly, without a staging row. Today
  `consultation.staging_id` is required.
- Add one server-enforced write rule: a Tutor registers their own consultations and
  manages activities they are responsible for, while Admins can operate on all of
  them. This is an exception to read-only Tutor self-service.
- Close each form the day its function moves into SGTA. Records loaded earlier
  remain, and a GET planned by form can be closed in SGTA.

### Out of scope

- The student form, which remains because students do not sign in to SGTA.
- Role design or scoped permissions beyond the write rule above.

### Exit criteria

- Tutors can write only their own consultations and activities, verified on the
  server, and every change leaves an audit record.
- Forms and in-app records produce the same figures, with no record entered in both
  places after a function's cutover.
- The quick consultation and activity flows pass a test with Tutors on their phones.

## Deferred

These outcomes are not planned. Each returns as a phase only when a confirmed need
brings it back, with its scope reviewed against the data flow as it then exists.
Their earlier scope and exit criteria remain available with
`git show eab17f4:docs/DEVELOPMENT-ROADMAP.md`.

| Outcome | Scope when last defined | Needs first |
| --- | --- | --- |
| Access and lifecycle | Access screens, last-Admin guard, Tutor profile, cycle reopening and hour transition, scoped permissions. | Who grants access and how accounts link to Tutors; the cycle transition rule, official dates, and who closes a cycle. |
| Academic workflows | Tutor discovery by academic relationship and availability. | Scholarships per cycle and Admin-to-Tutor linkage. |
| Operational calendars | Office and event calendars, weekly changes over a permanent base, opening hours, and PNG and PDF exports. | The real guard-planning process. |
| Hour operations | Tutor search in hour operations and consistent movement labels. | A walk of the Hours view with its users. |
| Academic agenda | Published GETs and exams; GETs reuse the records of the Activities phase. | Who maintains exams, and whether students need public access. |
| Public landing and Admin home | A public page and a daily-operation Inicio. | A confirmed need after the data flow works. |
| Cutover, pilot and first release | Migrate operational data, run a pilot, and hand over maintenance. | The data flow, and the outcomes above that the first release requires. |

## Maintenance

When a phase completes, move **Current phase** to the next phase and delete the
completed phase's section and table row; Git history keeps them. Update
sequencing when a real dependency or validated institutional requirement
changes, and move work in or out of Deferred when its need changes. Decompose complex work in a local execution plan without turning this
roadmap into an issue tracker.
