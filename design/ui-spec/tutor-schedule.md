# View: Mi horario

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/tutor/schedule`. Access: Tutor, own information only.
- Purpose and success condition: show the Tutor's effective current schedule and upcoming assignments, reflecting any effective special plan.
- Primary action: none; no edit action exists. `Consultar` only changes the reference date.

## Content order

1. Page header with `Consultar las guardias asignadas del ciclo vigente.`
2. Reference date panel: the current cycle name and its date range, a `Fecha de referencia` date field limited to the cycle, and `Consultar`. The date is required; the field defaults to the reference date of the current query.
3. Schedule context: a plan badge (`Plan Regular`, `Plan Especial`, or `Sin horario asignado`) followed by the effective plan name for the reference date, or `No hay guardias asignadas para la fecha de referencia.` when no plan is effective.
4. `Guardias del período`: the seven days starting at the reference date (ending earlier at the cycle end), introduced by `Del <día y mes> al <día y mes>` and the assignment count (`1 guardia`, `<n> guardias`). Each day shows its weekday, its day and month, and either its assignments or `Sin guardias`.
5. `Próximas guardias`: the period's assignments from the next pending duty onward, each with its long date, kind, time range, and modality. Assignments that already ended are not repeated here.

Assignment blocks follow the [Horarios](schedules.md) block anatomy without edit affordances: time range, the shared `Recuperación` cue, and the modality with the `Virtual` icon from the shared modality labels. The Tutor schedule read model carries no career identity or palette color, so blocks use the neutral card surface instead of a career fill and abbreviation.

## Wireframe

Compact first:

```text
Mi horario
Consultar las guardias asignadas del ciclo vigente.

2026
Jueves, 1 de enero de 2026 — Jueves, 31 de diciembre de 2026
Fecha de referencia [16/09/2026]
[Consultar]

(Plan Regular) Horario regular 2026

Guardias del período
Del 16 de septiembre al 22 de septiembre     2 guardias

MIÉRCOLES
16 de septiembre
Sin guardias

VIERNES
18 de septiembre
  16:00 a 20:00
  Presencial

Próximas guardias
Viernes, 18 de septiembre de 2026
Guardia · 16:00 a 20:00 · Presencial
```

## Responsive exceptions

- Compact: one column with chronological grouping by day; days without assignments collapse to their date and `Sin guardias`.
- Medium: two day columns at 768px and four at 1024px; the upcoming list uses two columns.
- Wide: a seven-column week view from 1280px plus the upcoming list in three columns.

## States

| State | Treatment |
| --- | --- |
| Default | The reference date panel, schedule context, period, and upcoming list. |
| Loading | The route skeleton on navigation; an in-place skeleton after `Consultar`, `Actualizar`, `Reintentar`, or `Volver a consultar`; focus moves to the page title. |
| Empty | The reference date panel and schedule context stay visible; the period shows `No hay guardias asignadas en el período actual.` with `Seleccionar otra fecha o consultar nuevamente cuando el ciclo tenga asignaciones.` and `Actualizar`, and the upcoming list is omitted. When the cycle already ended and no date was requested, the period range is omitted. An empty reference date reads `No hay guardias asignadas para la fecha de referencia.` and an empty upcoming list reads `No hay guardias próximas en esta consulta.` |
| Error | `No se pudo cargar el horario` with `No se pudo cargar el horario. Intentar nuevamente.` or the specific reason (`Revisar la fecha seleccionada antes de intentar nuevamente.`, `La fecha seleccionada no pertenece al ciclo administrativo vigente.`, `No se pudo resolver el horario especial para la fecha seleccionada.`), and `Reintentar`. |
| Required action | `Volver a consultar`; no link. An unlinked account shows `Completar la vinculación de la cuenta` with `La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.`; a Tutor without membership in the current cycle shows `Completar la pertenencia al ciclo` with `El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.`; without an open cycle it shows `No hay un ciclo vigente` with `No hay un ciclo administrativo abierto para mostrar información personal.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Mi horario |
| Description | Consultar las guardias asignadas del ciclo vigente. |
| Primary action | None |
| Date field | Fecha de referencia |
| Query action | Consultar |
| Period heading | Guardias del período |
| Period range | Del `<día y mes>` al `<día y mes>` |
| Empty day | Sin guardias |
| Upcoming heading | Próximas guardias |
| Empty | No hay guardias asignadas en el período actual. |
| Empty action | Actualizar |
| Error | No se pudo cargar el horario |
| Success | None |

## Accessibility

- Dates and the period range use `time` elements with ISO values; time ranges read `HH:mm a HH:mm`.
- The schedule context is a region named `Contexto del horario`; the week is a list named `Vista semanal de guardias`.
- Recovery and `Virtual` cues carry visible text; icons are decorative.

## Acceptance criteria

- [ ] The effective special-plan context is reflected correctly.
- [ ] No edit action exists.
- [ ] Compact reading is complete and comfortable.
- [ ] Another reference date can be selected from the empty state.
