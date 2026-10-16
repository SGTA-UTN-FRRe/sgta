# View: Mi resumen

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/tutor`. Access: Tutor, own information only.
- Purpose and success condition: answer the Tutor's most common questions immediately (current hour status, next duty, and subjects), so the Tutor does not need to ask an Admin for routine status.
- Primary action: none; the view is read-only.

## Content order

1. Page header with `Estado actual de <Tutor display name> y sus próximas guardias.`; before the summary loads, or when it cannot be shown, the description reads `Balance, materias y próximas guardias del ciclo vigente.`
2. `Horas`: the current balance as BalanceStatus (as in [Horas](hours.md)), with `Al día` or `Debe horas` and the same status colors.
3. `Próxima guardia`: the long date (for example `Viernes, 18 de septiembre de 2026`), the time range `16:00 a 20:00`, and the modality when one is recorded; or `No hay guardias próximas`.
4. `Materias`: the assigned subjects with the count `1 materia asignada` or `<n> materias asignadas`; an inactive subject adds `Materia inactiva`; with no subjects, `Todavía no hay materias asignadas.`
5. `Ciclo vigente` with `Contexto de la pertenencia actual.`: `Ciclo` (cycle name and date range), `Carrera` as text (the Tutor read model has no career color, so no CareerBadge), and `Referencia de beca` (the reference type, or `Sin referencia registrada`).

## Wireframe

Compact first:

```text
Mi resumen

Horas
1 h 15 min
Debe horas

Próxima guardia
Martes, 22 de septiembre de 2026
16:00 a 18:00 · Presencial

Materias                2 materias asignadas
Álgebra
Física

Ciclo vigente
Ciclo: 2026
Carrera: Ingeniería en Sistemas de Información
Referencia de beca: Sin referencia registrada
```

## Responsive exceptions

- Compact stacks every section in content order.
- Medium places `Horas` and `Próxima guardia` side by side; `Materias` and `Ciclo vigente` stack below.
- Wide also places `Materias` and `Ciclo vigente` side by side, keeping the same hierarchy.

## States

| State | Treatment |
| --- | --- |
| Default | Balance, next duty, subjects, and context. |
| Loading | The route skeleton; `Reintentar`, `Volver a consultar`, and `Actualizar` show the same skeleton in place and move focus to the page title. |
| Empty | When the Tutor has no subjects and no upcoming duty, the summary is replaced by `Todavía no hay información de resumen` with `Todavía no hay materias ni guardias asignadas para mostrar en el ciclo vigente.` and `Actualizar`; a missing next duty alone reads `No hay guardias próximas`. |
| Error | `No se pudo cargar el resumen. Intentar nuevamente.` with `Reintentar`. When the request returns a specific reason, the title is `No se pudo cargar el resumen.` and the description carries the reason (for example `La sesión expiró. Volver a iniciar sesión para continuar.`). |
| Required action | An `Acción requerida` status, a title, a description, and `Volver a consultar`; no link, because the Tutor cannot resolve the prerequisite. An unlinked account shows `Completar la vinculación de la cuenta` with `La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.`; without an open administrative cycle, `No hay un ciclo vigente` with `No hay un ciclo administrativo abierto para mostrar información personal.`; a Tutor without membership in the current cycle, `Completar la pertenencia al ciclo` with `El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Mi resumen |
| Description | Estado actual de <Tutor display name> y sus próximas guardias. |
| Primary action | None |
| Empty | Todavía no hay información de resumen |
| Empty action | Actualizar |
| Next duty empty | No hay guardias próximas |
| Subjects empty | Todavía no hay materias asignadas. |
| Scholarship empty | Sin referencia registrada |
| Error | No se pudo cargar el resumen. Intentar nuevamente. |
| Error action | Reintentar |
| Required-action action | Volver a consultar |
| Success | None |

## Accessibility

- The balance has a readable text state.
- Schedule times use clear date and time wording in `time` elements with machine-readable values.
- Each section is a region named by its heading.
- No Admin control is present.

## Acceptance criteria

- [ ] Only the Tutor's own information is visible.
- [ ] The Compact experience is first-class.
- [ ] No student identity or contact appears.
