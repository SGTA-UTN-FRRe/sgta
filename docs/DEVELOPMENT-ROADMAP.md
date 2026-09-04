---
document: DEVELOPMENT-ROADMAP
mode: decision
type: project-roadmap
status: active
scope: single-project
authority: planning-and-execution
project: SGTA
---

# SGTA — Development Roadmap

> Actionable execution roadmap: phase sequencing, deliverables, dependencies, and exit criteria.

# AI READING CONTRACT

Mode: **decision**. This document defines the approved implementation sequence for the first SGTA release.

Rules:
1. `PROJECT.md` and `ARCHITECTURE.md` remain authoritative for product/domain rules.
2. `STACK.md` and `TECHNICAL-ARCHITECTURE.md` remain authoritative for technical architecture.
3. `PROJECT-DESIGN.md` defines visual direction and canonical tokens.
4. `UI-SPEC.md` defines implementation-level views, states, and interactions.
5. Roadmap tasks are execution scope; GitHub Issues are the daily work units.
6. Do not maintain a second competing execution roadmap. If an older `ROADMAP.md` exists, replace it with this document or keep only a short pointer to this file.

---

## 1. Project Objective & Focus

### 1.1 Objective

Build SGTA as a greenfield, feature-first modular monolith that replaces repetitive spreadsheet administration with a trustworthy operational system for tutors, schedules, attendance, hour balances, consultation intake, and reports.

The first release must be useful to the Área de Tutorías, visually coherent with Tutorías UTN FRRe, inexpensive to operate, and transferable to future maintainers.

### 1.2 Current Focus

- **Active Phase:** Phase 1 — Foundation & Product Shell
- **Immediate Outcome:** A reproducible Next.js project with CI, canonical visual tokens, shared shell, and enough design-system infrastructure to implement the first vertical feature without redesigning the application structure.

---

## 2. Roadmap Overview

| Phase | Milestone / Outcome | Priority | Status |
|---|---|:---:|:---:|
| **Phase 1** | Foundation & Product Shell | P0 | Active |
| **Phase 2** | Database, Identity, Authorization & Audit Foundation | P0 | Next |
| **Phase 3** | Tutors, Academic Catalog & Administrative Cycles | P0 | Planned |
| **Phase 4** | Hour Ledger, Activities & Recovery | P0 | Planned |
| **Phase 5** | Scheduling & Attendance | P0 | Planned |
| **Phase 6** | Tutor Self-Service Portal | P0 | Planned |
| **Phase 7** | Consultation Intake & Data Curation | P0 | Planned |
| **Phase 8** | Reporting, Lifecycle & Hardening | P0 | Planned |
| **Phase 9** | Migration, Production Pilot & First Release | P0 | Planned |

**Parallelization note:** after Phase 3, Hour Ledger (Phase 4), the independent portions of Scheduling (Phase 5), and Consultation Intake (Phase 7) can be distributed across developers. Phase numbers express release organization, not a rule that all work must be sequential.

---

## 3. Phase Specifications

### Phase 1 — Foundation & Product Shell

- **Priority:** P0
- **Status:** Active
- **Depends on:** None

#### Objective

Create the reproducible engineering and visual foundation from which every SGTA feature can be implemented consistently.

#### In Scope (Deliverables)

- Bootstrap Next.js App Router + TypeScript on Node.js LTS with `pnpm`.
- Configure Tailwind CSS, `shadcn/ui`, ESLint, Vitest, Testing Library, and Playwright baseline.
- Create feature-first structure: `src/features`, `src/db`, `src/auth`, `src/shared`.
- Add canonical tokens from `PROJECT-DESIGN.md`: Midnight Navy (`#0B172E`), Beacon Blue (`#0284C7`), Faro Amber (`#F59E0B`), Porcelain Canvas (`#F8FAFC`), and tabular figures (`tabular-nums`).
- Implement shared application primitives:
  - Admin shell with responsive sidebar;
  - Tutor shell skeleton;
  - `AppSidebar` featuring active Faro Marker navigation;
  - `PageHeader` with context title and dominant action slot;
  - Button, input, badge, and status foundations;
  - Global focus ring and feedback behavior.
- Implement the five Admin navigation destinations (Tutores, Horarios, Horas, Consultas, Reportes) as route skeletons without fake feature content.
- Configure CI: install -> lint -> typecheck -> test -> build.
- Add `.env.example` without secrets and document local setup.
- Confirm repository ownership, `main` protection, and contributor workflow.

#### Out of Scope

Authentication behavior, database domain models, real CRUD, schedule library, chart library, and Google Sheets integration.

#### Technical Dependencies

GitHub Organization/repository, Node.js LTS, `pnpm`, Next.js, Tailwind, `shadcn/ui`.

#### Exit Criteria

- [ ] Fresh clone can install, build, and run.
- [ ] CI passes.
- [ ] Canonical tokens are implemented once and consumed by shared primitives.
- [ ] Admin shell matches `PROJECT-DESIGN.md` / `UI-SPEC.md` at Wide, Medium, and Compact tiers.
- [ ] No placeholder dashboard metrics or feature logic have been invented.
- [ ] `README.md` documents setup and development commands.

---

### Phase 2 — Database, Identity, Authorization & Audit Foundation

- **Priority:** P0
- **Status:** Next
- **Depends on:** Phase 1

#### Objective

Establish secure persistence, Google-based authentication, SGTA authorization, and a reusable audit mechanism before administrative data is exposed.

#### In Scope (Deliverables)

- PostgreSQL + Drizzle ORM/Kit configuration.
- Versioned SQL migrations and schema composition.
- Better Auth + Google OAuth.
- SGTA user model with exact roles `ADMIN | TUTOR`.
- Enabled-user provisioning with no public signup.
- Server-side authorization helpers.
- Admin/Tutor route protection.
- `features/audit` foundation for actor/action/time/reference.
- Authentication and authorization tests.

#### Out of Scope

Tutor domain CRUD, schedule rules, hour movements, and business reporting.

#### Technical Dependencies

PostgreSQL, Drizzle, Better Auth, Google OAuth project/configuration.

#### Exit Criteria

- [ ] Empty database can be migrated reproducibly.
- [ ] Enabled Admin and Tutor users authenticate and land in the correct shell.
- [ ] Non-enabled Google account cannot enter SGTA.
- [ ] Tutor cannot reach Admin routes.
- [ ] Audit foundation can record a test administrative event without sensitive payload leakage.
- [ ] lint, typecheck, tests, and build pass.

---

### Phase 3 — Tutors, Academic Catalog & Administrative Cycles

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 2

#### Objective

Deliver the canonical people/catalog foundation reused by hours, scheduling, consultation normalization, and reports.

#### In Scope (Deliverables)

- `Tutor`, `Career`, `Subject`, `TutorSubject`.
- `AdministrativeCycle`, `TutorCycleMembership`.
- Scholarship reference entities approved by the domain.
- Tutor Admin view from `UI-SPEC.md`.
- Tutor create/edit/inactivate/reactivate flow.
- Materias subview derived from canonical relations.
- Search/filter and empty/error states.
- Relevant audit events and domain tests.

#### Out of Scope

Hard deletion of historical tutors, formal scholarship certification, balances, attendance, and report dashboards.

#### Technical Dependencies

Phase 2 database/auth/audit foundation.

#### Exit Criteria

- [ ] Admin can manage tutors and subject assignments.
- [ ] Historical tutor records are inactivated rather than destructively deleted.
- [ ] Subject coverage view is derived, not manually duplicated.
- [ ] Cycle association is preserved in data contracts.
- [ ] UI matches responsive and accessibility rules.
- [ ] lint, typecheck, tests, and build pass.

---

### Phase 4 — Hour Ledger, Activities & Recovery

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 3

#### Objective

Make hour status traceable and operationally efficient, including the teammate-requested bulk add/subtract workflow without sacrificing ledger integrity.

#### In Scope (Deliverables)

- `HourCategory` and `HourMovement`.
- Derived balance per Tutor and cycle.
- Base categories: Inasistencia, Recuperación, Reunión, Taller, Actividad extraordinaria.
- Admin Hours view and movement history.
- `BalanceStatus` component.
- `BulkTutorSelector` with Select all + deselect exceptions.
- Individual and bulk movement registration.
- Movement reversal/void workflow.
- `Activity` and recovery credit flow where independent from scheduling.
- Ledger tests and audit events.

#### Out of Scope

Automatic attendance debits, direct balance editing, formal scholarship compliance, and hidden bulk mutations.

#### Technical Dependencies

Tutor/cycle foundation from Phase 3.

#### Exit Criteria

- [ ] Every displayed balance can be reconstructed from movements.
- [ ] Admin can register a meeting credit for many tutors and exclude absentees before confirming.
- [ ] Direction, category, minutes, date, and selected tutors are explicit before submission.
- [ ] Balance cannot be directly edited.
- [ ] Reversed movement remains traceable.
- [ ] lint, typecheck, tests, and build pass.

---

### Phase 5 — Scheduling & Attendance

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 3; Hour Ledger integration requires Phase 4

#### Objective

Replace spreadsheet schedule manipulation with structured regular/special plans and connect duty occurrences to fast attendance.

#### In Scope (Deliverables)

- `SchedulePlan`, `ScheduleAssignment`, `DutyOccurrence`.
- Regular and special plan lifecycle.
- Plan tabs and schedule workspace from `UI-SPEC.md`.
- Evaluation/selection of a calendar/grid dependency only at this phase.
- Accessible form-based schedule editing.
- Drag/resize only if the selected implementation is reliable and accessible.
- `AttendanceRecord` with `PENDING | PRESENT | ABSENT`.
- Fast Present/Falta flow.
- Falta -> proposed debit -> Admin confirmation -> HourMovement integration.
- Schedule/attendance audit events.
- Critical E2E: guard -> absence -> debit -> recovery -> balance.

#### Out of Scope

Automatic hour credit for presence, schedule sizing by consultation demand, and complex absence categories without validated rules.

#### Technical Dependencies

Tutor/catalog/cycle foundation; Hour Ledger for final absence/recovery integration.

#### Exit Criteria

- [ ] Special plan can temporarily replace regular plan without deleting it.
- [ ] Schedule works without drag-and-drop.
- [ ] Present does not modify hour balance.
- [ ] Falta cannot modify balance without Admin confirmation.
- [ ] Compact layout provides a usable day/list alternative.
- [ ] Critical E2E passes.

---

### Phase 6 — Tutor Self-Service Portal

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phases 3–5

#### Objective

Allow each tutor to inspect their own current information without administrative assistance or mutation access.

#### In Scope (Deliverables)

- `Mi resumen`.
- `Mi horario`.
- `Mis horas`.
- Read-only subjects/scholarship reference.
- Mobile-first Tutor presentation.
- Ownership authorization tests.

#### Out of Scope

Tutor editing, general student consultation data, messaging, notifications, and account self-registration.

#### Technical Dependencies

Tutor, schedule, cycle, and hour modules.

#### Exit Criteria

- [ ] Tutor sees only their own data.
- [ ] Tutor can understand schedule and hour status on mobile.
- [ ] No Admin mutation path is reachable/rendered.
- [ ] Student identity/contact is never exposed.
- [ ] lint, typecheck, tests, and build pass.

---

### Phase 7 — Consultation Intake & Data Curation

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 3
- **Can run in parallel with:** Phases 4–6 after Phase 3

#### Objective

Integrate the external Google Form/Sheet source through a read-only, reviewable, idempotent intake pipeline.

#### In Scope (Deliverables)

- Google Sheets read-only adapter behind `ConsultationSourceReader`.
- `ConsultationStaging`.
- Selection of approved columns only.
- Normalization for career, tutor alias, modality, and academic stage.
- Date validation, missing-data flags, possible duplicate detection.
- Admin review UI.
- Canonical `Consultation`.
- `SUBJECT` / `GENERAL` classification with temporary `PENDING_CLASSIFICATION`.
- `Actualizar consultas` action and import result summary.
- Import/review/classification audit events.

#### Out of Scope

Writing to Google Sheets, replacing Google Forms, automatic ambiguous correction, periodic sync, and a standalone “QR module”.

#### Technical Dependencies

Google Cloud/Sheets access, Tutor/Career/Subject canonical data.

#### Exit Criteria

- [ ] Source is read-only.
- [ ] Re-running import does not duplicate consolidated rows.
- [ ] Ambiguous records enter review instead of being guessed.
- [ ] Every consolidated Consultation is `SUBJECT` or `GENERAL`.
- [ ] Existing canonical data remains usable when Sheets is unavailable.
- [ ] lint, typecheck, tests, and build pass.

---

### Phase 8 — Reporting, Lifecycle & Hardening

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Operational modules and Consultation Intake

#### Objective

Turn canonical operation into reliable indicators and close the lifecycle/privacy/security rules required before production.

#### In Scope (Deliverables)

- Report filters and canonical aggregations.
- Consultation indicators.
- Operational indicators for tutors, coverage, attendance, balances, and activities.
- Accessible charts only where they materially improve comprehension.
- Manual cycle-close workflow.
- New-cycle zero-balance behavior.
- Privacy review for student identity/contact.
- Audit coverage review.
- Authorization matrix regression.
- Constraint, transaction, and index review.
- UI degraded/error states for reports and external-source failures.

#### Out of Scope

Causal academic claims, bespoke institutional reports not yet requested, automatic balance carry-over, advanced observability, and new roles.

#### Technical Dependencies

Canonical operational and consultation modules.

#### Exit Criteria

- [ ] Reports derive from canonical data; no manual report store exists.
- [ ] Pending consultation classifications do not contaminate subject metrics.
- [ ] Cycle close is explicit and preserves history.
- [ ] Student contact remains Admin-only.
- [ ] All approved auditable events are covered.
- [ ] Security/authorization regression passes.

---

### Phase 9 — Migration, Production Pilot & First Release

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 8

#### Objective

Move the approved initial data/workflows into production, prove recovery and continuity, validate the application with Tutorías, and cut the first stable release.

#### In Scope (Deliverables)

- Initial data migration scripts/process where useful.
- Neon production database.
- Initial hosting deployment defined by `STACK.md`.
- Production OAuth and Sheets configuration.
- `pg_dump` -> private Cloudflare R2 backup process.
- Retention policy implementation.
- Full restore drill on temporary PostgreSQL.
- Production smoke test.
- Admin pilot using real workflow.
- Tutor pilot.
- UX/rule corrections required to operate.
- Operational documentation and handover.
- First stable release/tag.

#### Out of Scope

Non-blocking enhancement ideas, advanced scholarship rules, mobile client, public API, microservices, and speculative infrastructure.

#### Technical Dependencies

Production provider access, stable migrations, approved data sources, completed hardening.

#### Exit Criteria

- [ ] Production deploy is reproducible.
- [ ] Initial data is validated.
- [ ] Backup exists outside the DB provider.
- [ ] Restore drill succeeds and is documented.
- [ ] Admin completes the critical workflow without spreadsheet duplication for migrated scope.
- [ ] Tutor self-service works.
- [ ] Another maintainer can clone, deploy, locate backups, and follow handover documentation.
- [ ] Pilot blockers are resolved and first stable release is tagged.

---

## 4. Roadmap Maintenance

- **When to update:** when a phase completes, a real technical constraint appears, or validated product priorities change.
- **How to update:** edit this document in place; mark completed phases `Completed`, promote the next relevant phase to `Active`, and keep deferred ideas outside the critical path.
- **Team execution:** create GitHub Milestones from phases and Issues from small vertical work units. An Issue should have one responsible owner, acceptance criteria, dependencies, and a Pull Request.
- **Avoid duplicate planning:** GitHub Projects tracks live work state; this file remains the project-level execution contract.
- **Change control:** if implementation reveals a functional, architectural, or visual decision change, update the corresponding canonical document (`PROJECT`, `ARCHITECTURE`, `STACK`, `PROJECT-DESIGN`, or `UI-SPEC`) instead of silently changing behavior in code.

### Explicitly deferred unless a real requirement appears

- microservices;
- Redis;
- queues/workers;
- separate public API;
- generic repositories;
- distributed event bus;
- Kubernetes;
- business file storage;
- periodic Sheets synchronization;
- email/password fallback;
- SSO institutional;
- formal scholarship certification;
- additional roles;
- standalone mobile app.
