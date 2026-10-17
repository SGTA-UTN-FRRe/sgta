# SGTA — Project

> Product purpose, scope, workflows, and business rules.

## Product

SGTA is the operational workspace for the Tutorias area at UTN FRRe. It gives
Admins tools to manage tutoring operations and gives each Tutor a protected,
read-only view of their own current-cycle information.

## Problem

Tutoring operations involve people, academic assignments, schedules, hour
records, and consultations. SGTA brings these workflows into one role-aware
application with cycle context and traceable changes.

## Scope

### In scope

- Admin management of Tutors, academic relationships, cycles, schedules, and hour movements.
- Tutor self-service for the owner's summary, effective schedule, balance, and movement history.
- Read-only consultation import, Admin review, canonical records, and operational reporting.
- Server-authorized access and audit records for supported administrative changes.

### Out of scope

- Attendance tracking or duty-occurrence records.
- Formal scholarship certification.
- Full production operations and data cutover.

## Core workflows

### Admin operations

```text
Admin signs in with an enabled provisioned identity
  -> manages cycle context, tutors, and academic relationships
  -> maintains regular and special schedule plans
  -> records or reverses explicit hour movements
  -> reviews the overview and canonical reports
```

### Consultation curation

```text
Admin requests an import from the configured read-only Sheets source
  -> source rows enter staging for review
  -> Admin resolves anomalies, duplicates, and classification
  -> approved rows become canonical consultations for reporting
```

### Tutor self-service

```text
Tutor signs in with an enabled identity linked to a Tutor record
  -> views the linked Tutor's current-cycle context
  -> views the effective schedule and movement-derived hours
```

## Business rules

- Only enabled, provisioned Google identities can use the application; public sign-up is disabled.
- Tutor self-service is read-only and is scoped to the Tutor linked to the signed-in identity.
- Schedule assignments describe planned time. Hour balances change through explicit ledger movements.
- Hour balances derive from credit and debit movements; corrections are represented by reversal movements.
- Google Sheets is an import source only. Admin review controls which staged rows become canonical consultations.
- Hour categories classify explicit movements. Categories linked to activities or recovery accept credits and create the corresponding activity origin; absences are recorded manually as debits under "Inasistencia", without attendance automation. See the [hour service](../src/features/hours/hour-service.ts) and [migration-upgrade coverage](../tests/integration/migration-upgrade.integration.test.ts).
- Scholarship references hold informational types, known required hours, and notes; they do not certify eligibility or award a scholarship. See the [Tutor catalog service](../src/features/tutors/tutor-service.ts).
- Cycle membership scopes operational records. Closing a cycle preserves its history and blocks further operational writes; a successor must be opened explicitly, with no automatic membership or hour transfer. See the [cycle service](../src/features/cycles/cycle-service.ts) and [integration coverage](../tests/integration/foundation.integration.test.ts).
- "Materias" coverage is derived from canonical Tutor-subject relationships and current-cycle membership, restricted to active Tutors, subjects, and careers; it is not a separate editable total. See `listSubjectCoverage` in the [Tutor service](../src/features/tutors/tutor-service.ts).

## Functional status

State on 2026-10-16, when the [roadmap](DEVELOPMENT-ROADMAP.md#pause) paused.
"Automated" means covered by unit, integration, or browser tests in CI. No area
has been validated in daily use by the Tutorias area; that validation is the
first [definition priority](DEVELOPMENT-ROADMAP.md#definition-priorities).

| Area | Works today | Automated | Missing or unconfirmed |
| --- | --- | --- | --- |
| Access | Google sign-in for provisioned, enabled identities; role-aware redirect from `/`; sign-out in both shells; `/forbidden`. Identities are provisioned with `auth:bootstrap-admin` or the Admin-only `POST /api/admin/users`. | Unit, integration, E2E | No Admin screen to grant or remove access; no guard against disabling the last Admin; no scoped permissions; no Tutor profile view. |
| Cycles | Create a cycle and close the current one from Configuración; closed cycles block operational writes and preserve history. | Unit, integration, E2E | No reopening. Pending negative balances do not carry into the next cycle. |
| Tutors and catalogs | Tutor create, edit, enable and disable; academic relationships; derived subject coverage in Materias; careers with Admin-chosen colors, subjects, hour categories, and informational scholarship references in Configuración. | Unit, integration, E2E | Catalog rules (scholarships per cycle, aliases, subject scope) are not approved. |
| Schedules | Regular and special plans per cycle with assignments, modality, conflict validation, week and day views, and coverage. | Unit, integration, E2E | One calendar only; no weekly changes over a base plan, configured opening hours, exports, or drag and drop. |
| Hours | Movement-derived balances, individual and bulk movements, reversals, and movement history with filters. | Unit, integration, E2E | Absences are manual debits; no automation from schedules by design. |
| Consultations | Import from the read-only Google Sheets source into staging, review, bulk actions, classification, and canonical records. | Unit, integration, E2E with a local source fixture | Import limits for a growing source, row reordering or deletion, and the data rules for student fields are not resolved. |
| Reports | Demand, hours, and coverage views over canonical records with date filters. | Unit, integration | No CSV or print export; total definitions are not documented for users. |
| Admin overview | Current-cycle context and pending attention items, such as import incidents or a missing cycle. | Unit, E2E | — |
| Tutor self-service | Owner-scoped summary, effective schedule, and hours, read-only. | Unit, E2E | Not tested with Tutors on their phones. |
| Interface | Every view composes `src/components/ui/` primitives and shared patterns; lint rejects raw controls and arbitrary design values; screenshot review at 390, 768, and 1440px. | Unit, E2E accessibility checks, lint | Light scheme only. No public page besides login. |
| Operations | Presentation deployment on Vercel with Neon; initial-data import and verification commands; CI Gate on pull requests. | CI | No production environment, backups, restore drill, or maintainer handover. |

## Current limitations

- Scholarship references are maintained, but formal scholarship certification is not implemented.
- The runtime has no production cutover, backup, or operational migration workflow.
- Consultation import requires the optional server-side Sheets configuration. Previously consolidated consultations remain available when the source is unavailable.
- Closing a cycle does not carry pending negative balances into the next cycle; do not close a real operational cycle until the transition rule is implemented.

## Provenance

SGTA is the internal workspace for the Tutorias area at UTN FRRe.

## Related documentation

- [Architecture](ARCHITECTURE.md)
- [Development](DEVELOPMENT.md)
- [Deployment](DEPLOYMENT.md)
- [Testing](TESTING.md)
- [Design direction](../design/PROJECT-DESIGN.md)
- [UI specification](../design/UI-SPEC.md)
- [Development roadmap](DEVELOPMENT-ROADMAP.md)
