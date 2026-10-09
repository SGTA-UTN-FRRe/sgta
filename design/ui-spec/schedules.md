# View: Horarios

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md). Horarios is the reference screen for the design system: later migrations follow its composition.

- Route: `/admin/schedules`. Access: Admin.
- Purpose and success condition: build regular and special schedule plans without spreadsheet-style reformatting, creating and adjusting duty assignments while preserving plan history; who is present each hour is readable at a glance, careers are distinguishable, coverage gaps are noticeable without alarm, conflicts are explicit, and special periods never destroy the regular plan.
- Primary action: `Agregar asignación`, which opens the assignment sheet for the selected plan. Secondary: `Nuevo plan` and `Archivo de planes`. Consequential: `Archivar plan`.

## Content order

1. **Page header.** Title `Horarios`, description `Planificar guardias regulares y períodos especiales.`, the primary action `Agregar asignación`, and the quiet secondary actions `Nuevo plan` and `Archivo de planes`. The actions sit below the title until Wide.
2. **Plan bar.** One compact region: `Seleccionar plan` with a single-selection pill group labeled `Planes de horario` (each pill shows the plan name and kind; validity is its tooltip), the quiet `Archivar plan` at the end of the row, and a second row with the `Activo` or `Inactivo` status badge, the `Regular` or `Especial` badge, and inline `Vigencia` (`dd/mm/aaaa — dd/mm/aaaa`), `Ciclo vigente`, and `Fecha de referencia`. The selected plan's name is the region's (visually hidden) heading.
3. **Conflict notice** when conflicts exist (see States).
4. **Calendar toolbar.** The view switch `Vista del calendario` (`Matriz` or `Bloques`) and, in Matriz, the coverage summary at the end of the row.
5. **Career legend filter.** `Carreras`, one toggle per career in the selected plan's assignments.
6. **Calendar:** the weekly matrix or the block grid in Medium and Wide; in Compact, the day selector followed by the selected day's matrix or list.

The reference date defaults to today in Argentina, clamped to the open cycle.

## Days and range

- Columns `LUN` to `VIE`; `SÁB` and `DOM` are added only when the plan has assignments on them.
- The visible hours derive from the plan's assignments. Opening hours are not configured yet; they are inferred (see Coverage). Configured opening hours belong to the Operational calendars phase.

## Matrix (primary view)

A table named `Matriz semanal` that answers who is present each hour, replacing the spreadsheet shared today.

- Rows are one-hour slots that someone covers during the week, labeled with their start and end (`09:00` over `10:00`). A stretch of two or more hours without anyone during the whole week collapses into one row reading `<inicio>–<fin> · Sin guardias asignadas`.
- Each cell lists the assignments present in that hour as career chips, ordered by start time and then by name. A chip shows the career fill and abbreviation and the Tutor's display name. An assignment that starts or ends inside the hour adds its partial time (`17:30–` or `–17:30`).
- An assignment repeats in every hour it covers; only its first hour is a tab stop, and every chip opens the assignment sheet. The chips of the assignment whose sheet is open carry the selection outline.
- Hours of a day without service are shaded as closed.

## Coverage

The target is two in-person Tutors per open hour. Coverage is quiet when met and never blocks editing.

- Open hours are inferred per day: hours with someone assigned, plus a single-hour hole between staffed hours. Longer gaps count as closed (for example, the midday break).
- `covered`: two or more distinct in-person Tutors. No marker.
- `minimal`: one in-person Tutor. A small hollow warning dot in the cell corner, `Un solo tutor presencial` as tooltip and screen-reader text.
- `uncovered`: no in-person Tutor in an open hour. A filled warning dot; an empty cell also shows a dashed `Sin cobertura` placeholder. Text: `Sin tutores presenciales`.
- The toolbar summary repeats the dots as a key: `<n> franjas sin presencial` and `<n> con un solo presencial`, or `Cobertura presencial completa` with a success dot.
- Coverage counts every assignment of the plan, so the career filter never hides a gap.

## Blocks (alternative view)

A grid named `Grilla semanal` for exact durations and concurrency.

- A time rail with one-hour steps over the derived range; a block's top and height represent its start time and duration.
- Concurrent assignments render side by side in lanes. Blocks adapt to their measured lane width instead of clipping: narrow lanes stack the abbreviation and time and collapse cue badges to icons with screen-reader text. With many concurrent Tutors the grid scrolls inside its panel; the matrix is the dense reading view.
- An archived plan renders its grid read-only.

### Block anatomy

Each block takes its career from the assignment (`careerName`, `careerColor`), not from the Tutor's current state, so blocks of inactive Tutors keep their color and abbreviation.

- Fill: the career's palette color with its paired foreground (`bg-career-<hue> text-career-<hue>-foreground`) and a `border-input` edge.
- Content, in order: the career abbreviation, the Tutor's display name, and the time range `08:00–10:00`; virtual assignments add `Virtual` with the `Monitor` icon. Assignments of 60 minutes or less use one line; the name truncates first and the abbreviation and time never truncate.
- Recovery (`RECOVERY`): the `bg-hatch` pattern over the career fill and a neutral `Recuperación` badge with the `RotateCcw` icon.
- Conflict: a destructive edge, a `CircleAlert` icon, and `Conflicto`.
- Selected: an ink outline offset from the fill and `aria-pressed="true"`.

## Names and modality

- The calendar shows the Tutor's preferred display name, falling back to the first name. When two Tutors in the plan share it, the initial of the last name is appended (`Ema G.`, `Ema P.`), then the career abbreviation if still ambiguous. The formal name stays available for identification.
- Modality belongs to each assignment: `Presencial` or `Virtual`. Both coexist in the same calendar. Virtual assignments keep the career color and add the `Monitor` icon (with `Virtual` text in blocks and lists), so an all-virtual week stays light.
- Accessible name, also the tooltip: `<Apellido, Nombre>[ (<nombre preferido>)], <Carrera>, <día>, <inicio> a <fin>`, followed by `, Virtual`, `, Recuperación`, and `, conflicto de horario` when they apply.

## Career legend filter

- Each toggle is a button with `aria-pressed` showing the career badge and the full career name; in Compact it shows only the badge, with the full name as accessible name and tooltip. With no toggle pressed, every career is shown.
- Pressing toggles shows only the pressed careers in every view; the others are hidden, not dimmed.
- `Mostrar todas` clears the filter and appears only while a filter is active, next to the visible `Mostrando <n> de <total> asignaciones`. That text is announced politely after each change.
- The filter resets when another plan is selected. It never changes data and is not stored in the URL.
- Careers come from the assignments, so a career whose Tutors are inactive still appears while it has assignments in the plan.

## Compact

- `Días del plan`: a `ToggleGroup` with `Lun` to `Vie` (plus `Sáb` and `Dom` when used); the selected day is an ink segment.
- Matriz shows the selected day's hours and chips (`Matriz del día`). Bloques shows the day's assignments as a chronological list with the career badge, display name, time range, modality, and recovery and conflict badges.
- The page header's `Agregar asignación` is the only add action and preselects the selected day. A day without assignments shows `Agregar una asignación para completar este día del plan.` without a second button.

## Wireframe

```text
Horarios                    [Nuevo plan] [Archivo de planes] [Agregar asignación]
Planificar guardias regulares y períodos especiales.

Seleccionar plan (Regular 2027 · Regular) (Mesas de julio · Especial)   [Archivar plan]
[Activo] [Regular]  Vigencia 02/03 — 31/07/2027  Ciclo vigente 2027  Fecha de referencia 02/03/2027

(Matriz|Bloques)                                  ○ 3 con un solo presencial
Carreras (ISI Ingeniería en Sistemas…) (IQ Ingeniería Química) …

        LUN                 MAR             MIÉ ...
09:00   [ISI Maxi] [IQ Silvi ▭]  ·  closed  ...
10:00                    ○
12:00–14:00 · Sin guardias asignadas
14:00   [ISI Juli] [TUP Luciano] [ISI Tomás]
```

## Responsive exceptions

- Wide: the full matrix or block grid; header actions beside the title.
- Medium: the same five-to-seven-column matrix with chips wrapping inside narrower cells; header actions below the title.
- Compact: the day selector replaces the weekly columns. The assignment sheet and the dialogs are full height.

## States

| State | Treatment |
| --- | --- |
| Default | Plan bar, calendar toolbar, career legend, and the matrix (or blocks), or the Compact day views. |
| Loading | A skeleton that preserves the header, plan, and calendar regions, announced as `Cargando horarios` with `Estamos preparando el plan y sus asignaciones.` |
| Required action | No open cycle: `Abrir un ciclo para gestionar horarios` with `Abrir un ciclo administrativo para comenzar a organizar las guardias.` and `Configurar ciclo` linking to `/admin/settings`; the header action becomes the same link. |
| No plan | `No hay un plan de horario activo` with `Crear o activar un plan para comenzar a organizar las guardias.` and `Crear plan`. When archived plans exist the description is `No hay planes activos en este ciclo. Crear un plan nuevo o reactivar uno desde Archivo de planes.` and `Archivo de planes` is offered too. The header action becomes `Crear plan`. |
| Empty plan | `Este horario todavía no tiene asignaciones.` with `Agregar una asignación para comenzar a organizar las guardias.`; the header's `Agregar asignación` is the action. |
| Conflict | A compact inline notice `Hay asignaciones superpuestas` naming each conflicting pair by Tutor, day, and time, with `Revisar conflicto`, which opens the first conflicting assignment. Conflicting chips and blocks show their cue. |
| Error | `No se pudo cargar el horario` with `Reintentar para volver a consultar el plan seleccionado.` and `Reintentar`. Save errors stay inside the open sheet or dialog with valid input preserved. |
| Success | A toast titled `Cambios guardados` with the operation's message; the calendar updates without losing the selected plan. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Horarios |
| Description | Planificar guardias regulares y períodos especiales. |
| Primary action | Agregar asignación |
| Secondary actions | Nuevo plan; Archivo de planes; Archivar plan |
| Plan bar | Seleccionar plan (group name `Planes de horario`); Ciclo vigente; Vigencia; Fecha de referencia; Activo; Inactivo; Regular; Especial |
| Calendar toolbar | Vista del calendario; Matriz; Bloques |
| Matrix | Matriz semanal; Matriz del día; Horario; Sin guardias asignadas; Sin cobertura |
| Coverage | Un solo tutor presencial; Sin tutores presenciales; `<n>` franja(s) sin presencial; `<n>` con un solo presencial; Cobertura presencial completa |
| Career legend | Carreras; Mostrar todas; Mostrando `<n>` de `<total>` asignaciones |
| Day selector | Días del plan; Lun; Mar; Mié; Jue; Vie; Sáb; Dom; Agregar una asignación para completar este día del plan. |
| Cues | Virtual; Recuperación; Conflicto |
| Empty | Este horario todavía no tiene asignaciones. |
| Error | No se pudo cargar el horario |
| Success | La asignación se guardó correctamente.; La asignación se eliminó correctamente.; El plan se guardó correctamente.; El plan fue archivado correctamente.; El plan fue reactivado correctamente. |

## Overlays

### Assignment sheet

A right `Sheet`, full height in Compact.

- Title `Nueva asignación` or `Editar asignación`, description `Los cambios se validan y guardan en el sistema para el plan seleccionado.`
- Fields, in order: `Plan seleccionado` (read-only: name, kind, and validity), `Tutor` (native select of eligible Tutors showing the formal name, the preferred name in parentheses when it differs, and the career; `No hay tutores elegibles` when none), `Repetición` (`Día de la semana` or `Fecha específica`), then `Día` or `Fecha`, `Inicio`, `Fin`, `Tipo de asignación` (`Guardia` or `Recuperación`), and `Modalidad` (`Presencial`, the default, or `Virtual`).
- `Resumen de asignación` summarizes the entry, including its modality, followed by `La validación del servidor conserva la vigencia, elegibilidad y conflictos del plan.`
- Footer: `Cancelar` and `Guardar asignación` (`Guardando...` while pending); in edit mode a secondary destructive `Eliminar asignación` sits at the leading edge.
- Validation copy: `Completar tutor y horario para continuar.`, `Seleccionar un día de la semana válido.`, `Seleccionar una fecha para la asignación.`, `El fin debe ser posterior al inicio y pertenecer al día.`, and `Revisar los datos ingresados antes de guardar.`
- Server errors shown in the sheet: `La asignación se superpone con otra guardia del mismo tutor.`, `La fecha de la asignación debe pertenecer a la vigencia del plan.`, `La fecha debe pertenecer al ciclo administrativo vigente.`, `El tutor seleccionado no pertenece al ciclo vigente.`, `El tutor seleccionado ya no está activo.`, `La asignación ya no está disponible. Actualizar el horario e intentar nuevamente.`, `El registro ya tiene el estado solicitado.`, `La sesión expiró. Volver a iniciar sesión para continuar.`, and `No se pudo guardar el cambio. Intentar nuevamente.`

### New plan dialog

A `Dialog` titled `Crear plan de horario` opened by `Nuevo plan` or `Crear plan`.

- Fields: `Nombre`, `Tipo de plan` (`Regular` or `Especial`), `Desde`, and `Hasta`, bounded by the current cycle.
- Actions: `Cancelar` and `Guardar plan` (`Guardando...` while pending).
- Validation copy: `Completar nombre y vigencia para continuar.` and `La fecha final debe ser posterior o igual a la fecha inicial.`
- Server errors: `La vigencia del plan debe estar contenida en el ciclo administrativo.`, `La vigencia del plan especial se superpone con otro plan especial activo.`, `Ya existe otro plan regular activo para este ciclo.`, `El ciclo seleccionado ya no está abierto.`, and `El plan ya no está disponible. Actualizar el horario e intentar nuevamente.`

### Plan archive sheet

A right `Sheet` with the metadata label `Histórico` and the title `Archivo de planes`.

- Lists archived plans (`Listado de planes archivados`), each with an `Archivado` badge and `Reactivar plan`.
- Selecting an archived plan shows its read-only grid titled `Asignaciones de <plan>` with a `Solo lectura` badge and `Modo solo lectura para el plan archivado.`
- Empty: `No hay planes archivados` with `Los planes archivados aparecen aquí para su consulta histórica o reactivación.`

### Archive confirmation

The shared confirmation dialog, opened by `Archivar plan`.

- Title `¿Archivar este plan?`
- Text: `El plan <nombre> se moverá al archivo de planes y dejará de estar disponible en la grilla operativa principal. Se puede reactivar en cualquier momento desde Archivo de planes.`
- Actions: `Cancelar` (initial focus) and `Archivar plan` (`Archivando...` while pending).

## Plan rules

For the first release, the scheduling scope is the active AdministrativeCycle for the Tutorías area. Within that cycle:

- the regular plan remains intact;
- a special plan becomes effective only during its validity;
- at most one active special plan may be effective for any calendar date, so overlapping active special plans are prohibited;
- when no special plan applies to a date, the regular plan is effective.

Assignment validation: the end is after the start, the Tutor is eligible and active for the cycle, the date lies within the plan's validity, the modality is `Presencial` or `Virtual`, overlap and conflict rules hold, and no recurrence is impossible. A failure preserves valid values and the conflict message identifies what conflicts.

Regular plans belong to the cycle on purpose: each semester sets the habitual recurring schedule, weekly adjustments apply on top of it during the semester, and the next semester may set a new one. Planning and the hour-accounting closing share the cycle period but remain separate responsibilities.

## Drag and resize

Not part of this release. Drag and drop in the matrix is planned for the Operational calendars phase: the preview is immediate, the mutation is server validated, an invalid operation returns to the last valid position, and the equivalent form edit stays available.

## Accessibility

- The plan selector, view switch, legend toggles, and day `ToggleGroup` use correct grouping semantics and expose their selected state.
- The matrix is a table with day column headers and hour row headers. Every assignment is keyboard reachable once per view, and its accessible name includes the Tutor, career, day, time, and cues.
- Career, modality, recovery, conflict, coverage, and selection are never conveyed by color alone: the abbreviation, icons with text, hatch with label, coverage text, and outline with `aria-pressed` carry them.
- Drag is never the only edit method.
- Every overlay is named, contains focus, closes with Escape and a visible control, and returns focus to its trigger.

## Acceptance criteria

- [ ] Regular and special plans remain independently recoverable.
- [ ] Overlapping active special-plan ambiguity is prevented.
- [ ] Form editing is complete without drag and drop.
- [ ] The matrix shows everyone present in each hour with career color, abbreviation, and display name.
- [ ] Hours with one or no in-person Tutor are identifiable without dominating the calendar.
- [ ] Every assignment records `Presencial` or `Virtual`, and virtual assignments are identifiable.
- [ ] The Compact day views are usable with one add action.
- [ ] Every chip and block shows its career fill and abbreviation, including those of inactive Tutors.
- [ ] The career legend filters every view and can be cleared.
- [ ] Assignment conflicts identify the conflicting assignments and explain recovery.
