# View: Horarios

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md). Horarios is the reference screen for the design system: later migrations follow its composition.

- Route: `/admin/schedules`. Access: Admin.
- Purpose and success condition: build regular and special schedule plans without spreadsheet-style reformatting, creating and adjusting duty assignments while preserving plan history; the selected plan stays coherent, conflicts are explicit, careers are distinguishable at a glance, and special periods never destroy the regular plan.
- Primary action: `Agregar asignación`, which opens the assignment sheet for the selected plan. Secondary: `Nuevo plan` and `Archivo de planes`. Consequential: `Archivar plan`.

## Content order

1. **Page header.** Title `Horarios`, description `Planificar guardias regulares y períodos especiales.`, the primary action `Agregar asignación`, and the quiet secondary actions `Nuevo plan` and `Archivo de planes`.
2. **Plan context.** The selected plan's name as the section heading, an `Activo` or `Inactivo` status badge, a `Regular` or `Especial` badge, and a description list with `Ciclo vigente`, `Vigencia` (`dd/mm/aaaa — dd/mm/aaaa`), and `Fecha de referencia`. The quiet `Archivar plan` action sits at the end of this region. The selected plan's kind is communicated here, not on each block.
3. **Plan selector.** `Seleccionar plan`: a single-selection pill group labeled `Planes de horario` listing the cycle's active plans, each with its name, kind, and validity. The pills wrap instead of scrolling.
4. **Career legend filter.** `Carreras`: one toggle per career present in the selected plan's assignments, ordered by career name. Each toggle shows the career badge (fill and abbreviation) followed by the full career name.
5. **Week grid** in Medium and Wide, or the **day editor** in Compact.

The reference date defaults to today in Argentina, clamped to the open cycle.

### Week grid

- Columns `LUN` to `VIE`, with a time rail from 08:00 to 20:00 in one-hour steps. The range is fixed; deriving it from the assignments belongs to a later scheduling phase.
- A block's top and height represent its start time and duration.
- Concurrent assignments render side by side in lanes with their times fully visible.
- Every block is a button that opens the assignment sheet for editing; an archived plan renders its grid read-only.
- Blocks show a hover state and visible keyboard focus; a drag preview applies only if drag is added later.

### Block anatomy

Each block takes its career from the assignment (`careerName`, `careerColor`), not from the Tutor's current state, so blocks of inactive Tutors keep their color and abbreviation.

- Fill: the career's palette color with its paired foreground (`bg-career-<hue> text-career-<hue>-foreground`).
- Content, in order: the career abbreviation, the Tutor's name, and the time range `08:00–10:00`. Optional modality text follows when recorded. Assignments of 60 minutes or less use one line for the abbreviation, the Tutor's name, and the time; the name truncates first and the abbreviation and time never truncate.
- Recovery (`RECOVERY`): the `bg-hatch` pattern over the career fill and a neutral `Recuperación` badge with the `RotateCcw` icon. On a one-line block the badge collapses to the icon with screen-reader text.
- Conflict: a destructive `CircleAlert` icon and the text `Conflicto` on the block, in addition to the fill. On a one-line block the text collapses to the icon with screen-reader text.
- Selected: the block whose sheet is open carries an ink outline offset from the fill and `aria-pressed="true"`.
- Accessible name: `<Tutor>, <Carrera>, <día>, <inicio> a <fin>`, followed by `, Recuperación` and `, conflicto de horario` when they apply. The same text is the block's tooltip.

### Career legend filter

- Each toggle is a button with `aria-pressed`. With no toggle pressed, every career is shown.
- Pressing toggles shows only the pressed careers' blocks in the grid and the day editor; the others are hidden, not dimmed.
- `Mostrar todas` clears the filter and appears only while a filter is active.
- A polite live region announces `Mostrando <n> de <total> asignaciones` after each change.
- The filter resets when another plan is selected. It never changes data and is not stored in the URL.
- Careers come from the assignments, so a career whose Tutors are inactive still appears while it has assignments in the plan.

### Day editor (Compact)

- `Días del plan`: a `ToggleGroup` with `Lun`, `Mar`, `Mié`, `Jue`, and `Vie`; the selected day is an ink segment.
- Below it, the selected day's assignments as a chronological list. Each item shows the same anatomy as a block (career badge, Tutor's name, time range, modality, recovery and conflict cues) and opens the assignment sheet.
- The page header's `Agregar asignación` is the only add action and preselects the selected day. A day without assignments shows `Agregar una asignación para completar este día del plan.` without a second button.

## Wireframe

```text
Horarios                    [Nuevo plan] [Archivo de planes] [Agregar asignación]
Planificar guardias regulares y períodos especiales.

2do cuatrimestre  [Activo] [Regular]                          [Archivar plan]
Ciclo vigente  Ciclo 2027   Vigencia  02/03/2027 — 31/07/2027   Fecha de referencia  02/03/2027

Seleccionar plan  (2do cuatrimestre · Regular)  (Mesas de julio · Especial)

Carreras  (ISI Ingeniería en Sistemas de Información)  (IQ Ingeniería Química)

        LUN            MAR            MIE            JUE            VIE
08:00   [ISI Husak     ]
        [08:00–10:00   ]
10:00                  [IQ López ////]
                       [Recuperación ]
...
20:00
```

Compact:

```text
Horarios                         [Agregar asignación]
Plan context
Seleccionar plan
Carreras
(Lun) (Mar) (Mié) (Jue) (Vie)
[ISI  Husak, Guillermo   08:00–10:00 ]
[IQ   López, Ana         10:00–11:00 ] Recuperación
```

## Responsive exceptions

- Wide: the full week grid.
- Medium: the same five-day week grid with narrower lanes; abbreviations and times stay visible and Tutor names truncate, with the full text in the accessible name and tooltip. Header actions wrap below the title.
- Compact: the day editor replaces the grid. The assignment sheet is full height and the dialogs are full height.

## States

| State | Treatment |
| --- | --- |
| Default | Plan context, plan selector, career legend, and the grid or day editor. |
| Loading | A skeleton that preserves the header, plan context, and grid regions, announced as `Cargando horarios` with `Estamos preparando el plan y sus asignaciones.` |
| Required action | No open cycle: `Abrir un ciclo para gestionar horarios` with `Abrir un ciclo administrativo para comenzar a organizar las guardias.` and `Configurar ciclo` linking to `/admin/settings`; the header action becomes the same link. |
| No plan | `No hay un plan de horario activo` with `Crear o activar un plan para comenzar a organizar las guardias.` and `Crear plan`. When archived plans exist the description is `No hay planes activos en este ciclo. Crear un plan nuevo o reactivar uno desde Archivo de planes.` and `Archivo de planes` is offered too. The header action becomes `Crear plan`. |
| Empty plan | `Este horario todavía no tiene asignaciones.` with `Agregar una asignación para comenzar a organizar las guardias.`; the header's `Agregar asignación` is the action. |
| Conflict | An inline destructive notice `Hay asignaciones superpuestas` naming each conflicting assignment by Tutor, day, and time, with `Revisar conflicto`, which opens the first conflicting assignment. Conflicting blocks show their cue. |
| Error | `No se pudo cargar el horario` with `Reintentar para volver a consultar el plan seleccionado.` and `Reintentar`. Save errors stay inside the open sheet or dialog with valid input preserved. |
| Success | A toast titled `Cambios guardados` with the operation's message; the grid updates without losing the selected plan. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Horarios |
| Description | Planificar guardias regulares y períodos especiales. |
| Primary action | Agregar asignación |
| Secondary actions | Nuevo plan; Archivo de planes; Archivar plan |
| Plan context | Ciclo vigente; Vigencia; Fecha de referencia; Activo; Inactivo; Regular; Especial |
| Plan selector | Seleccionar plan (group name `Planes de horario`) |
| Career legend | Carreras; Mostrar todas; Mostrando `<n>` de `<total>` asignaciones |
| Day editor | Días del plan; Lun; Mar; Mié; Jue; Vie; Agregar una asignación para completar este día del plan. |
| Block cues | Recuperación; Conflicto; Sin modalidad (accessible text when no modality is recorded) |
| Empty | Este horario todavía no tiene asignaciones. |
| Error | No se pudo cargar el horario |
| Success | La asignación se guardó correctamente.; La asignación se eliminó correctamente.; El plan se guardó correctamente.; El plan fue archivado correctamente.; El plan fue reactivado correctamente. |

## Overlays

### Assignment sheet

A right `Sheet`, full height in Compact.

- Title `Nueva asignación` or `Editar asignación`, description `Los cambios se validan y guardan en el sistema para el plan seleccionado.`
- Fields, in order: `Plan seleccionado` (read-only: name, kind, and validity), `Tutor` (native select of eligible Tutors; `No hay tutores elegibles` when none), `Repetición` (`Día de la semana` or `Fecha específica`), then `Día` or `Fecha`, `Inicio`, `Fin`, `Tipo de asignación` (`Guardia` or `Recuperación`), and optional `Modalidad`.
- `Resumen de asignación` summarizes the entry, followed by `La validación del servidor conserva la vigencia, elegibilidad y conflictos del plan.`
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

Assignment validation: the end is after the start, the Tutor is eligible and active for the cycle, the date lies within the plan's validity, overlap and conflict rules hold, and no recurrence is impossible. A failure preserves valid values and the conflict message identifies what conflicts.

## Drag and resize

Not part of the current release. If drag or resize is added later as a progressive enhancement, the preview is immediate, the mutation is server validated, an invalid operation returns to the last valid position, and the equivalent form edit stays available.

## Accessibility

- The plan selector, legend toggles, and day `ToggleGroup` use correct grouping semantics and expose their selected state.
- Every assignment is keyboard reachable and its accessible name includes the Tutor, career, day, and time.
- Career, recovery, conflict, and selection are never conveyed by color alone: the abbreviation, hatch with label, icon with text, and outline with `aria-pressed` carry them.
- Drag is never the only edit method.
- Every overlay is named, contains focus, closes with Escape and a visible control, and returns focus to its trigger.

## Acceptance criteria

- [ ] Regular and special plans remain independently recoverable.
- [ ] Overlapping active special-plan ambiguity is prevented.
- [ ] Form editing is complete without drag and drop.
- [ ] The Compact day editor is usable with one add action.
- [ ] Every block shows its career fill and abbreviation, including blocks of inactive Tutors.
- [ ] The career legend filters the grid and day editor and can be cleared.
- [ ] Assignment conflicts identify the conflicting assignments and explain recovery.
