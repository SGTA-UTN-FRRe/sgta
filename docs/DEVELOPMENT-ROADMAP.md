---
mode: decision
status: active
---

# SGTA - Development roadmap

> Direction, phase sequencing, scope boundaries, and exit criteria.

## Objective

Complete a supportable first release of SGTA for the Tutorias area at UTN FRRe.
The roadmap moves from repository and interface alignment through workflow
hardening, production readiness, and a controlled operational cutover.

**Current phase:** Repository and domain reset

## Constraints

- Protected pages and APIs enforce identity and role rules on the server.
- Operational records remain cycle-aware, and closing a cycle preserves its
  history.
- Hour balances derive only from signed hour movements; corrections use
  traceable reversals.
- Absences remain explicit manual hour movements. SGTA has no attendance
  tracking or duty-occurrence records.
- Google Sheets remains a read-only consultation source; canonical reporting
  uses SGTA records.
- Scholarship references are informational. Formal scholarship certification
  is outside the first release.
- Each phase keeps `main` runnable and updates current-state documentation only
  when repository evidence changes.

## Phases

| Phase | Outcome | Depends on |
| --- | --- | --- |
| Repository and domain reset | Remove attendance and occurrence behavior and align repository contracts and documentation with the current product. | None |
| UI engineering foundation | Align design decisions with the product and make shared interface and browser-test foundations reliable. | Repository and domain reset |
| Access and lifecycle | Complete controlled Tutor access and safe account and cycle lifecycle behavior. | UI engineering foundation |
| Academic and scheduling workflows | Improve Tutor discovery, academic relationship visibility, and schedule planning. | UI engineering foundation |
| Hours, consultations and reporting | Make consultation imports resilient and deliver complete, explainable operational outputs. | Access and lifecycle; Academic and scheduling workflows |
| Production readiness | Establish production services, secure operations, and proven recovery. | Access and lifecycle; Hours, consultations and reporting |
| Cutover, pilot and first release | Migrate validated data, prove operation with users, and complete maintainer handover. | Production readiness |

## Phase: Repository and domain reset

### Objective

Remove the attendance domain and make repository guidance, current-state
evidence, and shared decision documents describe the product that exists.

### In scope

- Remove attendance routes, services, movement origins, persistence, and
  schedule-read occurrence writes while retaining manual hour movements.
- Separate current-state project, architecture, development, deployment, and
  testing documentation from approved design decisions.
- Align agent guidance, repository skills, issue intake, and hygiene files with
  the engineering-playbook.
- Provide a local verification command and a CI guard against unresolved
  template placeholders.

### Out of scope

- Rewriting the product visual direction or interface specification.
- Introducing new operational product behavior.
- Production data migration or live service cutover.

### Exit criteria

- No attendance route, service, API, schema object, or attendance-derived
  movement remains; schedule reads do not materialize duty occurrences.
- README and current-state documents match the source, tests, manifests,
  runtime configuration, and CI; design documents have one canonical location
  and working links.
- Repository instructions, skills, issue forms, and hygiene files follow the
  approved repository workflow.
- The local verification command and required CI Gate pass on both delivery
  branches.

## Phase: UI engineering foundation

### Objective

Reconcile visual and interaction decisions with the current product, then make
shared UI code and browser verification reliable foundations for later work.

### In scope

- Update the project design and UI specification against current product scope
  and the established interface.
- Keep fixture-only data out of production feature imports and remove duplicated
  business-date logic in favor of the shared Argentina date boundary.
- Make browser journeys independent of the machine's current date and align
  viewport, state, and accessibility checks with the approved UI contract.

### Out of scope

- New domain capabilities or changes to hour-accounting rules.
- Production hosting, data migration, and external service cutover.

### Exit criteria

- The approved design documents describe the intended visual direction,
  routes, interactions, responsive behavior, and accessible states without
  stale repository paths.
- Production feature code does not depend on development-only fixture modules.
- Server-side business-date calculations use the shared date boundary, and
  browser journeys pass with a fixed test date independent of wall-clock time.
- The required lint, type, unit, integration, build, and browser checks pass.

## Phase: Access and lifecycle

### Objective

Let Admins manage application access safely and make account and cycle state
understandable to the people who use it.

### In scope

- Provide protected Admin workflows to enable and disable Tutor access and
  maintain the link between an application identity and its Tutor record.
- Prevent actions that would leave the application without an enabled Admin.
- Make sign-out, session expiration, and the signed-in user's own profile
  context clear across Admin and Tutor surfaces.
- Preserve cycle history and auditable boundaries through lifecycle actions.

### Out of scope

- Public registration, password-based sign-in, or access to another Tutor's
  profile.
- Automatic hour transfer or formal scholarship decisions at cycle changes.

### Exit criteria

- Admin access changes are validated and authorized on the server and cannot
  disable or demote the last enabled Admin.
- Tutor reads remain owner-scoped, including profile and lifecycle context.
- Sign-out and expired-session paths recover safely across protected pages and
  APIs.
- Cycle actions preserve historical records, reject writes to closed cycles,
  and retain audit context.

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
- Review data-model changes against validated institutional requirements before
  they become part of a production migration.

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
- Any schema change is supported by an approved domain decision, migration,
  and isolated integration coverage.

## Phase: Hours, consultations and reporting

### Objective

Keep operational records traceable as source volume grows and make requested
outputs complete and safe to share.

### In scope

- Make consultation synchronization resilient to source growth and row changes
  while preserving idempotency, review, and canonical history.
- Provide complete filtered report exports in CSV and print-ready form with
  locale-aware formatting and formula-injection protection.
- Document and test report count semantics so consultation totals are not
  confused with counts of unique people.
- Preserve movement-derived balances and explicit reversal history.

### Out of scope

- Writing to the consultation source.
- Student-level identity in operational reports or automatic scholarship
  certification.

### Exit criteria

- Repeated imports and source reconciliation do not silently duplicate or lose
  canonical consultations; source outages leave reviewed history available.
- Exports contain every row allowed by the applied filters and safely encode
  user-controlled values.
- Report totals have documented definitions, accessible alternatives, and no
  unsupported academic or scholarship claims.
- Hour balances remain reconstructable from signed movements and reversals.

## Phase: Production readiness

### Objective

Establish a separate production environment and prove that SGTA can be deployed,
operated, monitored, and recovered by authorized maintainers.

### In scope

- Configure production hosting, PostgreSQL, Google OAuth, and read-only Sheets
  access separately from presentation and preview environments.
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
- A backup is encrypted and retained outside the application database, and a
  restore drill recovers a verified database.
- The runbook explains provisioning, migrations, secret rotation, monitoring,
  recovery, and maintainer responsibilities without relying on local-only
  planning files.

## Phase: Cutover, pilot and first release

### Objective

Move validated operational data into production, prove the main workflows with
the Tutorias team, and complete a maintainable first release.

### In scope

- Reconcile migrated Tutors, academic relationships, cycles, hour balances,
  schedules, and consultation history against approved source records.
- Agree on cutover timing, go/no-go checks, abort criteria, and the transition
  away from the duplicate operational spreadsheet workflow.
- Run an Admin and Tutor pilot, fix defects that block the approved scope, and
  provide concise user and Admin guidance.
- Complete maintainer handover and tag the first stable release.

### Out of scope

- New product verticals or formal scholarship certification.
- Expanding migration scope beyond validated records and the approved first
  release.

### Exit criteria

- Migrated records and derived balances reconcile to the approved source
  evidence, with exceptions reviewed by the responsible Admin.
- The pilot completes the main Admin operating loop and Tutor self-service
  without unresolved release-blocking defects.
- Cutover and abort procedures are exercised or reviewed against a documented
  recovery path.
- User guidance, operator runbook, and maintainer handover are complete, and the
  first stable release is tagged.

## Maintenance

When a phase completes, move **Current phase** to the next phase and remove the
completed phase section and table row. Git history preserves completed work.
Update sequencing when a real dependency or validated institutional requirement
changes. Decompose complex work in a local execution plan without turning this
roadmap into an issue tracker.
