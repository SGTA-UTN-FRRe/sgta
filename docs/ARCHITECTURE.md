# SGTA - Architecture

> Components, boundaries, data flow, invariants, and trade-offs.

## Summary

SGTA is a server-first Next.js application. App Router routes compose feature
screens and APIs; server-side session and role checks protect persisted
workflows. Feature services use Drizzle to read and write PostgreSQL. The
consultation integration reads an external Google Sheet and imports rows into
local staging; reports use the canonical local records.

```text
Browser
  -> Next.js App Router
       -> server session and authorization
       -> feature routes, screens, and services
            -> Drizzle / PostgreSQL
            <- Google Sheets read-only import
```

## Component boundaries

| Component | Owns | Boundary |
| --- | --- | --- |
| `src/app/` | Route composition, layouts, metadata, loading, and error states | Keeps feature behavior in `src/features/`. |
| `src/auth/` | Better Auth configuration, identity provisioning, sessions, and server authorization | Client code does not make authorization decisions. |
| `src/features/` | Feature screens, validation, APIs, and domain services | Each workflow stays in its feature vertical. |
| `src/shared/` and `src/components/ui/` | Product-wide components and low-level UI primitives | Feature-specific rules stay out of shared UI. |
| `src/db/` | PostgreSQL client, Drizzle schema, migrations, and audit handling | Database access is server-only. |
| Google Sheets source | Read-only consultation input | Source rows are imported into SGTA; application changes do not write to the Sheet. |

## Data and persistence

PostgreSQL is the application persistence boundary. Drizzle schema definitions
live in `src/db/schema.ts`; generated SQL migrations and their journal are
committed under `drizzle/`. Better Auth identity and session records share this
database with cycle-aware SGTA data.

Hour balances are derived from ledger movements. Credit, debit, and reversal
rows remain in history; the system does not rewrite an original movement to
apply a correction. Activity records and audit events retain the supported
context for administrative changes.

Consultation import separates staging from canonical consultations. Staging
preserves the review lifecycle; operational reports query canonical records and
do not depend on a live Sheets request.

Schedule plans and assignments are stored as source data. Effective schedule
entries are resolved from regular and special plans when requested; loading the
schedule workspace is read-only.

## Invariants

- Authentication and role authorization are checked on the server for protected pages and APIs.
- Tutor reads are resolved from the authenticated identity and cannot select another Tutor's data.
- Cycle membership scopes hour and schedule operations; cycle closure preserves history and blocks writes.
- Hour balances derive from signed ledger movements, including reversal rows.
- Consultation source access is read-only; canonical reporting remains local to PostgreSQL.
- Audit metadata is bounded and validated before persistence.

## Trade-offs

### Server-first feature slices

Route handlers and pages keep authorization close to server data access. This
reduces duplicated client-side domain logic; browser interaction still needs
small client components for forms, navigation, and responsive controls.

### Staged external imports

The Sheet remains an operational source, not the reporting database. Staging
adds an explicit review step, while canonical records remain usable when the
external source is unavailable.

### Derived hour balances

Balances are calculated from the movement history instead of maintained as an
independent total. This keeps the ledger explainable and makes reversals
traceable, at the cost of deriving the value from persisted movements.

## Related documentation

- [Project scope and business rules](PROJECT.md)
- [Development setup](DEVELOPMENT.md)
- [Deployment](DEPLOYMENT.md)
- [Testing](TESTING.md)
- [Design direction](../design/PROJECT-DESIGN.md)
- [UI specification](../design/UI-SPEC.md)
