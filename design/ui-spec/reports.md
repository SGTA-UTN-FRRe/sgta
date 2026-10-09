# View: Reportes

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/reports`. Access: Admin.
- Purpose and success condition: answer administrative questions from canonical SGTA data, so the Admin filters a period and understands demand, schedule coverage, and hour status; reports are derived, explainable, and accessible, and need no manual spreadsheet reconstruction.
- Primary action: none by default; filters drive the view.

## Content order

1. Page header.
2. Global filters: Período, Carrera, Materia, Tutor, Modalidad, and `Restablecer filtros`.
3. A concise summary.
4. `Demanda`: consultation demand by career, subject, Tutor, modality, academic stage, and month, with a visualization only where useful and a detailed ranked table.
5. `Cobertura`: subject coverage and scheduled duties.
6. `Horas y actividades`: current balances, movements, and activities.

## Wireframe

```text
Reportes
[Período] [Carrera] [Materia] [Tutor] [Modalidad]

Summary

Demanda
[visualization if useful]
[detailed ranked table]

Cobertura

Horas y actividades
```

## Responsive exceptions

- Medium: sections mix columns where tables allow.
- Compact: sections stack; tables become priority lists.

## States

| State | Treatment |
| --- | --- |
| Default | Filters and every section. |
| Loading | The Reportes skeleton, announced as `Cargando reportes`. |
| Empty | `No hay datos para los filtros seleccionados.` |
| Error | `No se pudieron cargar los reportes` with `Los valores enviados se mantienen en el formulario. Reintentar la consulta para volver a cargar los reportes.` |
| Degraded | When one source or section fails, its own error (for example `No se pudo cargar la demanda de consultas`) appears in that section and unaffected sections stay usable. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Reportes |
| Description | Consultar demanda, cobertura y movimientos a partir de registros consolidados. |
| Primary action | None |
| Reset filters | Restablecer filtros |
| Empty | No hay datos para los filtros seleccionados. |
| Error | No se pudieron cargar los reportes |
| Success | None |

## Data

Consultation measures: totals, career, subject, general, Tutor, modality, academic stage, and a temporal series. Operational measures: active Tutors, subject coverage, planned schedule coverage, current balance state, movements, and activities.

## Period and metric definitions

The period is an inclusive range of date-only values. `fromDate` and `toDate` are serialized as `YYYY-MM-DD` query parameters and must be supplied together. The maximum range is 366 calendar days, including both endpoints. A reversed, partial, or overlong range is invalid; the page keeps the submitted values and explains the error rather than silently widening the query.

The default period is the open AdministrativeCycle from its start date through the earlier of today and its end date, using the Argentina local date. If today precedes the cycle start, the default is the cycle start date only. If cycle-to-date is longer than 366 days, use its most recent 366 days. If there is no open cycle, the default is the current calendar year from January 1 through today. Clearing filters removes the query state and restores this default. Custom periods may cross cycle boundaries. Date-based report sections filter by their own event date, not by `cycleId`; current-state sections continue to use the open cycle independently of the selected period.

Date boundaries use `America/Argentina/Buenos_Aires`; stored date-only values are compared as dates and are not converted through the viewer's browser timezone. Temporal demand is grouped by calendar month, including partial first and last months in the selected range.

Consultation demand uses canonical `Consultation` rows whose consultation date falls in the selected period. Every canonical consultation is classified as `SUBJECT` or `GENERAL`; `PENDING_CLASSIFICATION` remains in staging and review and is excluded from every report total and breakdown until consolidation. Subject totals and rankings include only `SUBJECT` rows; `GENERAL` consultations are shown separately and are never assigned to a Subject. Career, Tutor, Modality, academic-stage, and temporal breakdowns include canonical consultations of either classification. Missing Modality and academic stage are grouped as `Sin especificar`. Report queries do not call the external source, so a source outage does not change counts for already consolidated consultations. No student identity, contact, or raw topic is shown in report data. Selecting a Subject limits consultation demand to matching `SUBJECT` rows.

Operational measures use these definitions:

- **Tutores activos:** count of Tutor records with active status at query time. This is a current-state count and is not constrained by the selected period. Career filtering uses each Tutor's current primary Career.
- **Cobertura de materias:** for the open cycle, count active Subjects under active Careers that have at least one active Tutor with a current TutorSubject relationship and membership in that cycle. The denominator is all active Subjects under active Careers. Show covered and total counts; show a percentage only when the denominator is nonzero. This is a current-cycle snapshot, not a historical coverage reconstruction. When no cycle is open, show that coverage is unavailable rather than deriving it from an older cycle.
- **Guardias programadas:** count effective planned schedule entries and sum their scheduled minutes for each date in the selected period, using the effective plan and regular/special precedence defined by [Horarios](schedules.md). Separate ordinary and recovery-marked schedule entries by kind. This describes scheduled supply; the data model has no required-capacity denominator, so do not label it as a percentage of unmet or fulfilled demand.
- **Estado de saldos actual:** count active Tutors with membership in the open cycle by the existing derived states: `owes` for a signed balance below zero and `current` for zero or a positive balance. Balances are derived from all cycle movements, including reversal entries with their recorded direction. This snapshot is independent of the selected period and is unavailable when there is no open cycle.
- **Movimientos:** group ledger rows by `movementDate`, direction, and category for the selected period, showing row counts and minutes by direction. Net minutes are credits minus debits across all rows. Keep original and reversal rows in the ledger; a reversal offsets the original through its own signed movement and is never silently removed.
- **Actividades:** count distinct Activity records and sum their recorded duration by `activityDate` and kind in the selected period. Activity duration is not multiplied by the number of linked Tutor movements.

## Filter scope

The URL-backed filters are `fromDate`, `toDate`, `careerId`, `subjectId`, `tutorId`, and `modality`. Academic stage is a consultation breakdown in this release, not a filter control. The reserved `modality=UNSPECIFIED` value selects consultations without a recorded Modality; other Modality values match the stored consultation value. Schedule assignments always record `Presencial` or `Virtual` and match by that label, so `UNSPECIFIED` selects no schedule assignment.

Each section identifies when it is a current snapshot and which filters affect it; unrelated sections are not silently reinterpreted by a filter.

| Report section | Period | Career | Subject | Tutor | Modality | Academic stage |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Consultation demand | Yes | Yes | Yes, `SUBJECT` only | Yes | Yes | Breakdown only |
| Active tutor count | No | Yes | No | Yes | No | No |
| Subject coverage snapshot | No | Yes | Yes | Yes | No | No |
| Planned schedule | Yes | No | No | Yes | Yes | No |
| Current balance snapshot | No | Yes | No | Yes | No | No |
| Movements and activities | Yes | No | No | Yes | No | No |

Career and Subject are not applied retroactively to schedule, movement, or activity history: those records do not preserve historical Career/Subject assignments. For the active-tutor and balance snapshots, Career uses the Tutor's current primary Career; subject coverage uses the Career linked to each Subject. A Tutor filter on Activities selects distinct Activity records linked to that Tutor's movement; it does not multiply the activity count or duration. Current balance and coverage sections always name the open cycle they describe and do not imply that the selected date range changes the snapshot. A Modality filter includes only matching recorded modalities; records without a modality are grouped under `Sin especificar` and are included only when that option is selected.

## Interaction

Filters:

- apply to the sections listed in Filter scope;
- `Restablecer filtros` restores the documented default period;
- valid state is URL-backed and survives reload or sharing;
- invalid or incomplete date ranges retain the submitted values and explain the correction needed.

Charts:

- appear only when they materially improve comprehension;
- require an accessible value or table equivalent;
- use a restrained palette with no rainbow categories;
- temporal demand uses calendar-month buckets for the selected period.

## Accessibility

- Charts have an accessible title, description, and value equivalent.
- Filter order is logical.
- Data tables stay keyboard navigable.
- No meaning depends on color.

## Acceptance criteria

- [ ] Every metric derives from canonical data.
- [ ] Period defaults, inclusive date boundaries, supported range, and URL parameters are deterministic.
- [ ] Schedule coverage, balance, movement, and activity values follow the definitions above; no unsupported coverage rate is implied.
- [ ] Each filter affects only the sections listed in Filter scope.
- [ ] No persisted manual report result becomes a source of truth.
- [ ] No causal academic claim is implied.
- [ ] Charts are justified and accessible.
- [ ] Degraded section behavior is deliberate.
