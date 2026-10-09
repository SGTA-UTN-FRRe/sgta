# View: Mi horario

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/tutor/schedule`. Access: Tutor, own information only.
- Purpose and success condition: show the Tutor's effective current schedule and upcoming assignments, reflecting any effective special plan.
- Primary action: none; no edit action exists.

## Content order

1. Page header with `Consultar las guardias asignadas del ciclo vigente.`
2. The effective schedule for the reference date, reflecting the effective special-plan context.
3. Upcoming assignments.

Assignment blocks and items follow the [Horarios](schedules.md) block anatomy (career fill and abbreviation, time range, recovery cue) without edit affordances.

## Responsive exceptions

- Wide: a simple week view plus the upcoming list.
- Compact: chronological grouping by day.

## States

| State | Treatment |
| --- | --- |
| Default | The effective schedule and upcoming list. |
| Loading | The route skeleton. |
| Empty | `No hay guardias asignadas en el período actual.` with `Seleccionar otra fecha o consultar nuevamente cuando el ciclo tenga asignaciones.`; an empty reference date reads `No hay guardias asignadas para la fecha de referencia.` and an empty upcoming list reads `No hay guardias próximas en esta consulta.` |
| Error | `No se pudo cargar el horario` with `No se pudo cargar el horario. Intentar nuevamente.` and `Reintentar`. |
| Required action | An unlinked account shows `La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.`; a Tutor without membership in the current cycle shows `El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Mi horario |
| Description | Consultar las guardias asignadas del ciclo vigente. |
| Primary action | None |
| Empty | No hay guardias asignadas en el período actual. |
| Error | No se pudo cargar el horario |
| Success | None |

## Acceptance criteria

- [ ] The effective special-plan context is reflected correctly.
- [ ] No edit action exists.
- [ ] Compact reading is complete and comfortable.
