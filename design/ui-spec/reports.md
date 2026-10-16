# View: Reportes

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/reports`. Access: Admin.
- Purpose and success condition: answer administrative questions from canonical SGTA data, so the Admin filters a period and understands demand, schedule coverage, and hour status; reports are derived, explainable, and accessible, and need no manual spreadsheet reconstruction.
- Primary action: none by default; filters drive the view and are applied together with `Aplicar filtros`.

## Content order

1. Page header.
2. `Filtros` panel: the period as `Desde` and `Hasta`, then `Carrera` (`Todas las carreras`), `Materia` (`Todas las materias`), `Tutor` (`Todos los tutores`), and `Modalidad` (`Todas las modalidades`, `Sin especificar`, then recorded modalities); the helper line `El período incluye ambas fechas y admite hasta 366 días. Una materia elegida debe pertenecer a la carrera seleccionada.`; then `Aplicar filtros` and `Restablecer filtros`. A selected value missing from the loaded options stays selectable as `Selección actual`.
3. `Resumen`: `Período del <desde> al <hasta>` and four metrics: `Consultas`, `De materia`, `Generales`, and `Tutores activos`, each with a one-line scope caption. A metric whose source failed shows `—`.
4. `Demanda`: six ranked tables, `Por carrera`, `Por materia`, `Por tutor`, `Por modalidad`, `Por etapa académica`, and `Evolución mensual`, each with its count column `Consultas`. Ranked groups show the first 50 by count with `Se muestran los primeros 50 resultados ordenados por cantidad.` when more exist.
5. `Cobertura`: `Cobertura de materias` (covered / total subjects, the percentage when defined, and the open cycle) and `Guardias programadas` (`Ocurrencias`, `Tiempo programado`, a table by kind, `Ordinarias` and `Recuperatorias`, and a table by Tutor limited to 50 rows with a notice).
6. `Horas y actividades`: `Estado de saldos actual` (`Tutores incluidos`, `Con saldo negativo`, `Al día`), `Movimientos de horas` (`Créditos`, `Débitos`, and `Neto (créditos menos débitos)` as count and duration, then a table `Fecha`, `Dirección`, `Categoría`, `Movimientos`, `Duración` limited to the first 1,000 groups by date with a notice), and `Actividades` (`Actividades`, `Duración registrada`, and a table `Fecha`, `Tipo`, `Actividades`, `Duración`).

Each section and card names the filters that affect it and, for snapshots, the open cycle it describes. Tutor names in report tables link to the tutor registry searched by that name, with the accessible name `Ver tutor <Tutor>`. Careers appear as text: report groups and filter options carry the career name without its palette, so report tables do not use career color. Durations use the shared duration format; net movement duration is signed.

## Wireframe

```text
Reportes
Filtros
[Desde] [Hasta] [Carrera] [Materia] [Tutor] [Modalidad]
[Aplicar filtros] [Restablecer filtros]

Resumen
[Consultas] [De materia] [Generales] [Tutores activos]

Demanda
[Por carrera] [Por materia] [Por tutor]
[Por modalidad] [Por etapa académica] [Evolución mensual]

Cobertura
[Cobertura de materias]
[Guardias programadas]

Horas y actividades
[Estado de saldos actual] [Movimientos de horas]
[Actividades]
```

## Responsive exceptions

- Medium: sections mix columns where tables allow; filters wrap in order.
- Compact: sections stack; tables become priority lists with the same values and Tutor links. `Desde` stays inline; `Hasta`, `Carrera`, `Materia`, `Tutor`, and `Modalidad` move to the `Filtros` sheet, which has its own `Aplicar filtros`. The trigger badge counts selected `Carrera`, `Materia`, `Tutor`, and `Modalidad` values; the period always applies and is not counted.

## States

| State | Treatment |
| --- | --- |
| Default | Filters and every section. |
| Loading | The Reportes skeleton, announced as `Cargando reportes`. |
| Empty | When the period has no consultations, planned duties, movements, or activities: `No hay datos para los filtros seleccionados.` with `Los indicadores de estado actual, cuando están disponibles, siguen describiendo el ciclo vigente.` and `Restablecer filtros`, shown once after the summary. Summary, coverage, and balance snapshots stay visible. Inside sections, an empty demand reads `Sin consultas consolidadas para los filtros seleccionados.` and empty tables read `Sin consultas para este desglose.`, `Sin guardias programadas en el período.`, `Sin movimientos en el período.`, or `Sin actividades en el período.` as a single muted line. |
| Invalid filters | `No se pudieron aplicar los filtros` with one line per problem; the submitted values stay in the form and no report section renders. |
| Error | `No se pudieron cargar los reportes` with `Los valores enviados se mantienen en el formulario. Reintentar la consulta para volver a cargar los reportes.` and `Reintentar`. |
| Degraded | When one source or section fails, a `Carga parcial` notice reads `Una o más secciones no están disponibles; el resto conserva sus resultados.` with `Reintentar todas`; each failed section shows its own error and `Reintentar` (for example `No se pudo cargar la demanda de consultas`), and unaffected sections stay usable. When filter options fail, the panel shows `No se pudieron cargar todas las opciones de filtro.` with `Los resultados disponibles siguen visibles.` and keeps the selected values. |
| Required action | Without an open cycle, `No hay un ciclo abierto para consultar la cobertura de materias.` and `No hay un ciclo abierto para consultar los saldos actuales.` link to `Configuración`; dated sections stay usable. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Reportes |
| Description | Consultar demanda, cobertura y movimientos a partir de registros consolidados. |
| Primary action | None |
| Apply filters | Aplicar filtros |
| Reset filters | Restablecer filtros |
| Invalid filters | No se pudieron aplicar los filtros |
| Partial load | Carga parcial · Reintentar todas |
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

- are edited as a draft and applied together with `Aplicar filtros`, from the panel or the Compact `Filtros` sheet;
- apply to the sections listed in Filter scope;
- `Restablecer filtros` restores the documented default period;
- valid state is URL-backed and survives reload or sharing;
- invalid or incomplete date ranges retain the submitted values and explain the correction needed.

Charts (none in this release; the ranked tables are the exact-value presentation):

- appear only when they materially improve comprehension;
- require an accessible value or table equivalent;
- use a restrained palette with no rainbow categories;
- temporal demand uses calendar-month buckets for the selected period.

## Accessibility

- Charts have an accessible title, description, and value equivalent.
- Filter order is logical.
- Data tables stay keyboard navigable; each ranked table is a focusable region named by its caption, and its Compact list carries the same values.
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
