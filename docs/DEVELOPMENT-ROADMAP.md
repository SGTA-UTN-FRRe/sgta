---
document: DEVELOPMENT-ROADMAP
mode: decision
type: project-roadmap
status: active
scope: SGTA first production-worthy release
authority: planning
---

# SGTA - Development Roadmap

> Outcome-oriented sequencing from the current scaffold to a production-worthy first SGTA release.

# AI reading contract

Mode: **decision**.

Rules:

1. This roadmap defines outcomes, sequencing, scope boundaries, and phase exit criteria.
2. It is not an issue tracker and must not prescribe unnecessary file-level implementation.
3. `PROJECT-DESIGN.md` is authoritative for visual direction and tokens.
4. `UI-SPEC.md` is authoritative for views, states, interactions, and responsive behavior.
5. `TESTING.md` records the current SGTA testing and CI adaptation of the engineering-playbook.
6. Roadmap labels, phase numbers, task numbers, and milestone labels are planning metadata only. They may appear in this roadmap and local execution plans, but must not be copied into Git delivery artifacts or product/code naming.
7. `$plan-implementation` derives durable implementation outcomes from roadmap items, and `$git-delivery` owns branch, commit, pull request, and squash language. This roadmap does not define those delivery procedures.
8. Existing code is baseline, not target.
9. Do not lower target quality because an earlier scaffold is easier to preserve.
10. Do not add features merely to increase feature count.
11. There is no late visual polish phase. Every product phase includes its own UI, responsive, state, accessibility, and visual quality.
12. A phase may use multiple small PRs while keeping `main` runnable.
13. Phase sequencing may be adjusted when a real dependency or validated requirement changes, but the roadmap must be updated in the same decision.
14. GitHub Issues and local execution plans may decompose a phase just in time without rewriting this roadmap into task bureaucracy.

## 1. Objective and quality bar

### 1.1 Objective

Transform the current SGTA scaffold into a coherent operational product for Tutorias UTN FRRe with:

- high-quality tutor and academic administration;
- traceable hour accounting;
- strong scheduling and attendance UX;
- polished tutor self-service;
- safe consultation intake;
- useful reporting;
- secure authorization;
- reproducible testing and CI;
- backup/restore and maintainer continuity.

### 1.2 Quality bar

Target:

> **9 to 10 out of 10 in functional coherence, usability, and visual execution inside the approved scope.**

This does not mean adding more features.

It means:

- implemented workflows feel complete;
- critical states are designed, not improvised;
- accessibility and responsive behavior are part of delivery;
- business results are explainable;
- visual quality is established early and preserved;
- every phase leaves the product in a stronger, runnable state.

## 2. Current baseline

The repository already has a useful scaffold:

- Next.js / React / TypeScript / pnpm;
- lint, typecheck, unit tests, Playwright baseline, and CI;
- feature-first placeholder boundaries;
- shared UI primitives;
- design tokens;
- Admin and Tutor route skeletons;
- responsive navigation.

The secure platform foundation is now implemented: PostgreSQL/Drizzle persistence,
provisioned Google-only authentication, server-side role authorization,
AdministrativeCycle lifecycle controls, safe audit events, and isolated
integration coverage. The later operational workflows remain unimplemented.

Therefore the project continues from the scaffold rather than restarting from zero.

## 3. Roadmap overview

| Phase | Outcome | Priority | Status |
|---|---|---:|---|
| 1 | Documentation and baseline re-alignment | P0 | Active |
| 2 | Engineering quality and repository governance baseline | P0 | Next |
| 3 | Golden Screens and visual-system recalibration | P0 | Planned |
| 4 | Persistence, identity, authorization, cycle, and audit foundation | P0 | Complete |
| 5 | Tutor and academic operations | P0 | Planned |
| 6 | Hour ledger, activities, and recovery | P0 | Planned |
| 7 | Scheduling and attendance | P0 | Planned |
| 8 | Tutor self-service | P0 | Planned |
| 9 | Consultation intake and data curation | P0 | Planned |
| 10 | Admin overview and reporting | P0 | Planned |
| 11 | Cross-surface hardening and lifecycle completion | P0 | Planned |
| 12 | Migration, production readiness, pilot, and first release | P0 | Planned |

Parallelization:

- after Phase 4, independent vertical slices may be distributed across developers;
- Phases 6, 7, and 9 contain meaningful independent work;
- integration dependencies still govern merge order;
- phase numbers organize release outcomes, not team ownership.

## 4. Phase specifications

### Phase 1 - Documentation and baseline re-alignment

- **Priority:** P0
- **Status:** Active
- **Depends on:** current repository scaffold

#### Objective

Start the next iteration line with one shared design/roadmap contract, honest current-state public documentation, and a preserved baseline.

#### In scope

Shared `docs/`:

- replace/update `PROJECT-DESIGN.md`;
- replace/update `UI-SPEC.md`;
- replace/update `DEVELOPMENT-ROADMAP.md`.

Current-state repository material:

- rebaseline README and agent instructions where they claim unimplemented runtime facts;
- keep public links valid;
- preserve useful existing shell/primitives;
- verify the current project remains runnable.

Personal/local execution material stays outside `docs/`.

#### Out of scope

- domain implementation;
- major UI redesign;
- dependency migration;
- production work.

#### Exit criteria

- [ ] The three shared decision documents are versioned and consistent.
- [ ] Public current-state documentation does not present unimplemented auth/database/domain behavior as runtime fact.
- [ ] No duplicate shared target authority exists.
- [ ] Current baseline verification passes.
- [ ] `main` remains runnable.

### Phase 2 - Engineering quality and repository governance baseline

- **Priority:** P0
- **Status:** Complete
- **Depends on:** Phase 1

#### Objective

Establish reproducible verification, stable CI semantics, and durable Git delivery language before broad domain implementation.

#### In scope

- adapt the engineering-playbook CI/testing vocabulary to the real SGTA boundaries in `docs/TESTING.md`;
- keep the primary workflow name as `CI`;
- expose the conceptual jobs `Quality`, `Tests`, `E2E`, `Production`, and the stable aggregate `CI Gate`;
- define `Quality` as lint and strict TypeScript checking;
- define `Tests` as the co-located Vitest and Testing Library suite;
- define `E2E` as critical browser workflows through the running application;
- define `Production` as the deployable Next.js build;
- keep `Integration`, `Contract`, and `Docker` absent until SGTA has real boundaries that justify them;
- install dependencies reproducibly with the committed lockfile and explicit Node.js/pnpm versions;
- make the local Playwright web server use the pinned package-manager invocation;
- use explicit job timeouts, obsolete-run cancellation, least-privilege permissions, and failure diagnostics;
- make `CI Gate` fail when any required upstream job fails, is cancelled, or is skipped;
- install the current repository skills under `.agents/skills/` from the engineering-playbook;
- keep Git delivery procedure in `$git-delivery` instead of a duplicate project-specific standard;
- provide a PR template with exactly `Summary` and `Changes` sections;
- route branch, commit, pull request, and squash naming through `$git-delivery` so roadmap metadata stays in planning artifacts;
- apply the small-team GitHub Ruleset and squash-only governance when repository settings are available to configure.

#### Out of scope

- fake `Integration`, `Contract`, or `Docker` gates before the corresponding boundary exists;
- coverage thresholds or tests added only to increase a metric;
- production credentials, production services, or production data in CI;
- speculative deployment or release checks;
- domain features.

#### Exit criteria

- [x] Clean locked install succeeds.
- [x] Local verification commands and CI commands represent the same meaningful gates.
- [x] Public CI names are exactly `Quality`, `Tests`, `E2E`, `Production`, and `CI Gate`.
- [x] `CI Gate` is the only stable aggregate check intended for branch protection.
- [x] Current unit/component and E2E tests are deterministic and use synthetic data.
- [x] E2E failures retain useful report and test-result diagnostics.
- [x] Workflow runs have explicit timeouts, concurrency cancellation, and least-privilege permissions.
- [x] No implementation-specific runtime, framework, browser, or database name appears in a public gate name.
- [x] No speculative `Integration`, `Contract`, or `Docker` gate has been added.
- [x] `$git-delivery`, `$plan-implementation`, and `$implement-task` are installed under `.agents/skills/`.
- [x] The repository skills and PR template define focused delivery structure and outcome-oriented wording.
- [x] Delivery naming is delegated to `$git-delivery` and does not copy roadmap metadata.
- [x] Repository governance is documented against the small-team standard, with `CI Gate` as the technical requirement.
- [x] CI does not depend on personal secrets or production data.

### Phase 3 - Golden Screens and visual-system recalibration

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 2

#### Objective

Prove the target visual language before broad feature implementation.

#### In scope

Golden Screens:

1. Login
2. Admin overview
3. Tutores
4. Horas with bulk movement dialog
5. Horarios

Recalibrate:

- Manrope typography;
- light shell/navigation;
- page header;
- forms;
- tables/lists;
- filters;
- sheets/dialogs;
- status and balance components;
- empty/error states;
- Faro Beam;
- responsive transformations;
- accessibility fundamentals.

Use realistic synthetic Spanish data.

#### Out of scope

- real tutor CRUD;
- real OAuth/database;
- permanent fixture architecture;
- chart library;
- schedule library unless needed only for a bounded interaction spike.

#### Exit criteria

- [ ] Five Golden Screens look like one coherent product.
- [ ] No Golden Screen resembles an uncustomized component-library demo.
- [ ] Wide and Compact review pass.
- [ ] Shared patterns are reusable without becoming a generic internal framework.
- [ ] Fixture data can be replaced cleanly by live features.
- [ ] lint, typecheck, tests, and build pass.

### Phase 4 - Persistence, identity, authorization, cycle, and audit foundation

- **Priority:** P0
- **Status:** Complete
- **Depends on:** Phase 3

#### Objective

Create the real secure platform foundation without degrading the visual contract.

#### In scope

- PostgreSQL;
- Drizzle ORM and migrations;
- Better Auth with Google OAuth;
- enabled-user provisioning;
- roles `ADMIN | TUTOR`;
- server-side authorization;
- Admin/Tutor route guards;
- AdministrativeCycle;
- audit mechanism;
- isolated PostgreSQL-backed integration tests;
- environment/configuration contract.

#### Out of scope

- full Tutor CRUD;
- hour ledger;
- scheduling;
- consultation import.

#### Exit criteria

- [x] Empty database migrates reproducibly.
- [x] Integration tests use isolated non-production PostgreSQL.
- [x] Enabled Admin and Tutor authenticate correctly.
- [x] Unenabled identity cannot enter.
- [x] Tutor cannot access Admin data/actions.
- [x] Audit can persist a representative event safely.
- [x] Golden Screen shell remains intact with real auth state.

### Phase 5 - Tutor and academic operations

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 4

#### Objective

Deliver the first complete production-quality operational vertical slice.

#### In scope

- Career;
- Subject;
- Tutor;
- TutorSubject;
- TutorCycleMembership;
- scholarship reference data;
- Tutor list/search/filter;
- create/edit;
- inactivate/reactivate;
- derived Materias coverage;
- authorization and audit;
- full states/responsive/accessibility.

#### Out of scope

- hard deletion with history;
- formal scholarship certification;
- hour movements;
- schedule assignments.

#### Exit criteria

- [ ] Admin manages tutors and academic relationships end to end.
- [ ] Historical tutors are inactivated, not destructively deleted.
- [ ] Materias is derived from canonical data.
- [ ] Compact/Medium/Wide behavior matches UI-SPEC.
- [ ] Golden Screen quality is preserved with live data.
- [ ] Relevant tests and CI gates pass.

### Phase 6 - Hour ledger, activities, and recovery

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 5

#### Objective

Make hour status understandable, traceable, and efficient for individual and bulk administrative work.

#### Locked accounting rule

Confirmed hour movements are immutable accounting facts.

A correction never overwrites the original amount.

It creates a traceable reversal referencing the original movement, then a new corrected movement when a replacement fact is required.

The original remains visible as reversed.

No direct mutable balance exists.

#### In scope

- HourCategory;
- HourMovement;
- derived balance;
- movement history;
- reversal behavior;
- bulk movement workflow;
- atomic bulk movement transaction;
- Select all + deselect exceptions;
- Activity;
- meeting/workshop/extraordinary activity credit;
- recovery recognition;
- audit and authorization;
- full states/responsive/accessibility.

#### Exit criteria

- [ ] Every balance is reconstructable from movements.
- [ ] Confirmed movement values are not updated in place.
- [ ] Reversal references the original and remains visible.
- [ ] Admin can safely register a bulk meeting movement atomically.
- [ ] A failed bulk movement commits zero selected tutor movements.
- [ ] Direction, category, duration, date, and selected tutors are explicit before confirmation.
- [ ] UI quality matches the Golden Screen contract.

### Phase 7 - Scheduling and attendance

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 5; hour integration depends on Phase 6

#### Objective

Replace schedule spreadsheet editing with a structured planner and connect effective duty occurrences to fast attendance.

#### Locked scheduling rule

For the first release, scheduling scope is the active AdministrativeCycle for the Tutorias area.

Within that cycle:

- the regular plan remains intact;
- an active special plan applies only inside its validity period;
- at most one active special plan may be effective for any calendar date;
- overlapping active special plans are prohibited;
- when no special plan applies, the regular plan is effective.

#### In scope

- SchedulePlan;
- ScheduleAssignment;
- stable DutyOccurrence identity;
- regular and special plans;
- plan switching;
- schedule workspace;
- form-based editing;
- drag/resize only as progressive enhancement;
- AttendanceRecord;
- Present/Falta;
- absence debit proposal;
- Admin confirmation;
- persisted ABSENT state even when the debit proposal is cancelled;
- recovery scheduling integration;
- audit;
- critical real-stack E2E.

#### Exit criteria

- [ ] Special plans never destroy the regular plan.
- [ ] Ambiguous overlapping special plans are prevented.
- [ ] Schedule is complete without drag-and-drop.
- [ ] Present never changes hour balance.
- [ ] Falta remains recorded even when the proposed debit is cancelled.
- [ ] Falta never changes balance without Admin confirmation.
- [ ] Compact day/list mode is usable.
- [ ] Critical E2E passes.

### Phase 8 - Tutor self-service

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phases 5 to 7

#### Objective

Give tutors a polished read-only product that answers routine questions without Admin intervention.

#### In scope

- Mi resumen;
- Mi horario;
- Mis horas;
- subjects;
- current cycle/scholarship reference;
- mobile-first layouts;
- ownership authorization tests.

#### Out of scope

- Tutor mutations;
- consultation identity;
- messaging;
- notifications;
- public registration.

#### Exit criteria

- [ ] Tutor sees only own information.
- [ ] Compact experience is production-ready.
- [ ] No Admin mutation path is reachable or rendered.
- [ ] Student identity/contact is not exposed.

### Phase 9 - Consultation intake and data curation

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 5
- **Can run in parallel with:** independent parts of Phases 6 to 8

#### Objective

Integrate the external consultation source through a safe, reviewable, read-only pipeline.

#### In scope

- Google Sheets read-only adapter;
- ConsultationStaging;
- source-row idempotency;
- approved field selection;
- normalization;
- anomaly flags;
- duplicate candidates;
- Admin review;
- canonical Consultation;
- SUBJECT / GENERAL classification;
- temporary PENDING_CLASSIFICATION;
- on-demand import summary;
- degraded source behavior;
- audit.

#### Out of scope

- writing to Sheet;
- replacing Form;
- periodic sync;
- silent fuzzy correction;
- standalone QR module.

#### Exit criteria

- [ ] Integration is read-only.
- [ ] Reimport is idempotent.
- [ ] Ambiguous data goes to review.
- [ ] Every consolidated consultation is SUBJECT or GENERAL.
- [ ] Pending rows do not contaminate subject metrics.
- [ ] Canonical consultations remain usable when Sheets is unavailable.

### Phase 10 - Admin overview and reporting

- **Priority:** P0
- **Status:** Planned
- **Depends on:** canonical operational and consultation modules

#### Objective

Turn daily operation into useful attention states and reports without decorative dashboard noise.

#### In scope

Admin overview:

- current cycle;
- pending attendance;
- negative balances;
- consultations requiring review;
- today/upcoming schedule.

Reports:

- reusable filters;
- consultation demand;
- subject/career/tutor/modality/stage breakdown;
- temporal demand;
- operational coverage;
- attendance;
- balance state;
- activities.

Visualization:

- select a chart library only if approved charts require one;
- accessible table equivalents;
- restrained product palette.

#### Exit criteria

- [ ] Attention items link to relevant workflows.
- [ ] Metrics derive only from canonical data.
- [ ] No manual reporting source of truth exists.
- [ ] Charts exist only where they improve comprehension.
- [ ] Degraded external-source behavior is deliberate.

### Phase 11 - Cross-surface hardening and lifecycle completion

- **Priority:** P0
- **Status:** Planned
- **Depends on:** first-release user surfaces

#### Objective

Verify the already-polished product as a whole and remove cross-surface weaknesses before production.

This is not a visual rescue phase.

#### In scope

- WCAG 2.2 AA audit;
- keyboard-only critical workflows;
- focus visibility;
- Compact/Medium/Wide review;
- reduced motion;
- loading/error/degraded-state audit;
- server/client boundary review;
- query/index review from real access patterns;
- dependency audit;
- performance review where meaningful;
- E2E stability;
- privacy/logging review;
- authorization regression;
- cycle close completion;
- audit coverage review.

#### Exit criteria

- [ ] No P0 accessibility blocker remains.
- [ ] Critical workflows work by keyboard.
- [ ] Tutor Compact experience is production-ready.
- [ ] Admin core remains usable at supported widths.
- [ ] No sensitive data leaks through logs/errors/routes.
- [ ] Authorization regression passes.
- [ ] CI remains stable and reproducible.

### Phase 12 - Migration, production readiness, pilot, and first release

- **Priority:** P0
- **Status:** Planned
- **Depends on:** Phase 11

#### Objective

Prove production deployment, data transition, recovery, maintainer continuity, and real Tutorias operation.

#### In scope

- initial data migration where useful;
- production PostgreSQL;
- production hosting;
- production OAuth;
- production read-only Sheets access;
- environment configuration;
- pg_dump to private external storage;
- retention;
- restore drill;
- smoke test;
- Admin pilot;
- Tutor pilot;
- workflow corrections required to operate;
- runtime documentation sync;
- handover;
- first stable release.

#### Exit criteria

- [ ] Production deploy is reproducible.
- [ ] Migrated data is validated.
- [ ] External backup exists.
- [ ] Restore drill succeeds.
- [ ] Admin completes the main operational loop.
- [ ] Tutor self-service works.
- [ ] Migrated scope no longer needs a duplicate operational spreadsheet source of truth.
- [ ] Another maintainer can clone, verify, deploy, and locate restore instructions.
- [ ] First stable release is tagged.

## 5. Roadmap maintenance

Update this roadmap when:

- a phase completes;
- a real technical constraint changes sequencing;
- a target product decision changes;
- a validated institutional requirement changes first-release scope.

Do not convert this file into detailed backlog bureaucracy.

A complex active phase may be decomposed in a local execution plan without changing the roadmap unless the target outcome itself changes.
