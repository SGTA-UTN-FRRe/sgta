# View: Configuración

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/settings`. Access: Admin.
- Purpose and success condition: keep low-frequency administrative configuration outside the main operational navigation; the Admin manages the current cycle and reference catalogs without cluttering primary navigation.
- Primary action: the current-cycle action inside `Ciclo actual`: `Crear ciclo` without an open cycle, otherwise `Cerrar ciclo`, which opens the close confirmation. The page header carries the secondary `Actualizar`, which reloads the cycle and every catalog; it is hidden while a load failure offers `Reintentar`.

## Content order

1. Page header with `Actualizar`.
2. The Settings feedback region (load or save failure, success) and the pending status, when present.
3. `Ciclo actual`: the status badge (`Ciclo abierto` or `Requiere acción`), then
   - with an open cycle: its name, its period (`1 de enero de 2026 — 31 de diciembre de 2026`), `Para crear un ciclo nuevo, primero cerrar el ciclo actual.`, and `Cerrar ciclo`;
   - without one: the required-action notice and the `Crear ciclo` form (`Nombre`, `Fecha de inicio`, `Fecha de finalización`, all required). The form exists only while no cycle is open.
4. `Historial de ciclos`, a button at the end of `Ciclo actual` that opens a dialog listing every cycle, newest first, with its name, period, and `Abierto` or `Cerrado` badge, or `Todavía no hay ciclos registrados.` Opening it performs no mutation.
5. Reference catalogs, secondary to the cycle controls, in separate sections: `Carreras`, `Materias`, `Categorías de horas`, and `Referencias de beca`.

Each catalog section has a title, a description, a count badge of active values (`5 activas`), an accessible add and edit form above a responsive list or table, and `Editar` plus `Activar` or `Inactivar` on each row. `Editar` loads the row into the form, which is then named `Editar <entidad> <nombre>` and offers `Guardar cambios` and `Cancelar`. Inactive values remain visible for historical context, but inactive Careers cannot be selected for new Subjects and inactive catalog values are not offered as new Tutor form options. No section offers a hard-delete action.

- Careers: `Nombre de la carrera`, `Color en Horarios`; columns `Carrera`, `Color`, `Estado`.
- Subjects: `Nombre de la materia` and a required `Carrera` selection whose inactive options read `<Carrera> · inactiva` and are disabled; without an active Career, `Agregar materia` is disabled and `Crear o activar una carrera antes de agregar materias.` explains why. Columns `Materia`, `Carrera` (career badge and name), `Estado`.
- Hour categories: `Nombre de categoría` and `Origen de actividad (opcional)`: `Sin origen de actividad`, `Reunión`, `Taller`, `Extraordinaria`, or `Recuperación`. Columns `Categoría`, `Origen de actividad`, `Estado`.
- Scholarship reference types: `Tipo de referencia`, `Horas requeridas conocidas (informativo)` (a non-negative whole number), and `Notas`. Columns `Tipo`, `Horas conocidas` (`<n> horas` or `Sin dato`), `Notas` (`Sin notas` when empty), `Estado`.
- Status badges read `Activa` or `Inactiva`.

Scholarship hours and notes are informational reference data only. The UI never presents a compliance result, certification, or automatic decision from those fields.

## Career color

The career form includes the `Color en Horarios` field, and the career list shows each career's color.

- Field: a radio group of the eight palette colors. Each option shows a career badge preview with the career's abbreviation in that color, followed by the Spanish color label (`Azul`, `Esmeralda`, `Violeta`, `Amarillo`, `Cian`, `Magenta`, `Lima`, `Grafito`); the radio's accessible name is the color label. Options lay out in two columns in Compact and four from `sm`.
- Description in edit mode: `Identifica a los tutores de esta carrera en la grilla de horarios.`
- Description in create mode adds a second sentence: `Identifica a los tutores de esta carrera en la grilla de horarios. Si no se elige un color, se asigna automáticamente el menos usado.`
- List cell (`Color` column in Wide and Medium, and the Compact list item): the career badge followed by the Spanish color label.
- The server rejects values outside the palette; a color change follows the career audit trail.

## Wireframe

```text
Configuración
Administrar el ciclo vigente, el catálogo académico y las referencias de beca.

Ciclo actual                                   [Ciclo abierto]
2026
1 de enero de 2026 — 31 de diciembre de 2026    [Cerrar ciclo]
Para crear un ciclo nuevo, primero cerrar el ciclo actual.
[Historial de ciclos]

Carreras                                       [5 activas]
Nombre de la carrera  ·  Color en Horarios  ·  [Agregar carrera]
| Carrera                       Color          Estado    Acciones            |
| Ingeniería en Sistemas        ISI  Azul      Activa    Editar  Inactivar   |

Materias / Categorías de horas / Referencias de beca
```

## Responsive exceptions

- Wide: full catalog tables with labeled row actions.
- Medium: tables keep every column; the `Materias` career cell shows only the career badge, whose accessible name and tooltip are the career name; `Editar` shows only its icon and keeps its accessible name; row actions stay on one line.
- Compact: each catalog becomes a list of items with the name and row actions, then the remaining fields (career badge and name or color label where applicable, and status); forms are one column.

## States

| State | Treatment |
| --- | --- |
| Default | Cycle controls and catalog sections. |
| Loading | One shared status above the sections, `Guardando cambios de configuración…` for a save or `Actualizando configuración…` for `Actualizar`, with a thin skeleton line; the sections stay visible and every form and row action is disabled. The cycle submit reads `Guardando ciclo…` only while a cycle is being created. |
| Empty catalog | A muted line inside the section, below its form, which is the add action: `Todavía no hay carreras registradas.`, `Todavía no hay materias registradas.`, `Todavía no hay categorías de horas registradas.`, or `Todavía no hay referencias de beca registradas.` |
| Error | Load failure: `No se pudo cargar la configuración.` with `Reintentar para volver a consultar los datos.` and `Reintentar`. On the first load, it replaces the cycle and catalog sections; after a failed `Actualizar`, the last loaded data stays visible below it. A session or permission reason replaces the description (`La sesión expiró. Volver a iniciar sesión para continuar.`, `La cuenta no tiene permisos para administrar la configuración.`). Save failure: the specific reason is reported in the Settings feedback region while the form stays filled, with no retry action, so the Admin can correct the input and submit again; server validation remains authoritative. Reasons include duplicate names or types, invalid Career and Subject combinations, an inactive selection, `Ya existe un ciclo abierto. Cerrar el ciclo actual antes de crear otro.`, an invalid date range, and invalid known hours; the fallback is `No se pudo guardar la configuración. Intentar nuevamente.` |
| Required action | The `Requiere acción` badge and the notice `Todavía no hay un ciclo abierto` with `Crear un ciclo para establecer el contexto de las operaciones administrativas.`, followed by the `Crear ciclo` form. |
| Success | A specific confirmation in the feedback region: `<Entidad> se creó correctamente.`, `<Entidad> se actualizó correctamente.`, `<Entidad> se activó correctamente.`, `<Entidad> se inactivó y se conservaron sus relaciones.` (`…sus movimientos.` for hour categories), `El ciclo se creó correctamente.`, or `El ciclo se cerró correctamente. El historial se conserva.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Configuración |
| Description | Administrar el ciclo vigente, el catálogo académico y las referencias de beca. |
| Primary action | Crear ciclo; Cerrar ciclo |
| Secondary action | Actualizar; Reintentar after a load failure |
| Cycle status | Ciclo abierto; Requiere acción |
| Open-cycle hint | Para crear un ciclo nuevo, primero cerrar el ciclo actual. |
| Required-action notice | Todavía no hay un ciclo abierto; Crear un ciclo para establecer el contexto de las operaciones administrativas. |
| Cycle history | Historial de ciclos; Los ciclos cerrados conservan su información para consulta futura.; Abierto; Cerrado; Todavía no hay ciclos registrados. |
| Close confirmation | Title `Confirmar cierre del ciclo`; action `Confirmar cierre` (`Cerrando ciclo…` while pending) |
| Catalog actions | Agregar carrera; Agregar materia; Agregar categoría de horas; Agregar referencia de beca; Editar; Guardar cambios; Cancelar; Activar; Inactivar |
| Pending | Guardando cambios de configuración…; Actualizando configuración…; Guardando ciclo… |
| Career color field | Color en Horarios |
| Empty | Todavía no hay carreras registradas. (and the matching line for each catalog) |
| Load error | No se pudo cargar la configuración.; Reintentar para volver a consultar los datos. |
| Save error fallback | No se pudo guardar la configuración. Intentar nuevamente. |
| Success | La carrera se creó correctamente. |

## Cycle close

The close action uses the shared confirmation dialog and shows the current cycle's identity, that history remains preserved, that the next cycle begins with a zero hour balance, and an explicit confirmation. No automatic balance transfer is offered. Cycle close is audited. While pending, the confirmation reads `Cerrando ciclo…` and cannot submit again. After a successful close, focus moves to the cycle history region and `Ciclo actual` shows the `Crear ciclo` form for the successor, which starts with a zero balance.

## Accessibility

- Every catalog form is named (`Agregar carrera`, `Editar carrera <nombre>`, and the matching names for the other catalogs); row actions carry the entity and its name (`Editar materia Física I`, `Inactivar carrera <nombre>`).
- The cycle history and close confirmation are a dialog and an alert dialog that contain focus, close with Escape, and return focus to their trigger; after a close, focus moves to the cycle history region.
- The feedback region is an alert for failures and a polite status for success; the pending status is a polite status named by its message.

## Acceptance criteria

- [ ] Low-frequency settings do not clutter primary navigation.
- [ ] Cycle close is explicit and audited.
- [ ] No automatic balance transfer is implied.
- [ ] Every career shows its color as a badge and Spanish label, and the form explains automatic assignment only when creating.
