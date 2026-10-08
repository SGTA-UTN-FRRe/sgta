# SGTA - Project

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
- Cycle membership scopes operational records and preserves historical context when a cycle closes.

## Current limitations

- Scholarship references are maintained, but formal scholarship certification is not implemented.
- The runtime has no production cutover, backup, or operational migration workflow.
- Consultation import requires the optional server-side Sheets configuration. Previously consolidated consultations remain available when the source is unavailable.

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
