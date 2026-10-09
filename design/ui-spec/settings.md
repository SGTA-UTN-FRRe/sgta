# View: Configuración

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/settings`. Access: Admin.
- Purpose and success condition: keep low-frequency administrative configuration outside the main operational navigation; the Admin manages the current cycle and reference catalogs without cluttering primary navigation.
- Primary action: the current-cycle action: `Crear ciclo` without an open cycle, otherwise `Cerrar ciclo`, which opens the close confirmation.

## Content order

1. Page header.
2. `Ciclo actual` controls, then `Historial de ciclos`.
3. Reference catalogs, secondary to the cycle controls, in separate sections: `Carreras`, `Materias`, hour categories, and `Referencias de beca`.

Each catalog section has an accessible add and edit form and a responsive list or table. Inactive values remain visible for historical context, but inactive Careers cannot be selected for new Subjects and inactive catalog values are not offered as new Tutor form options. No section offers a hard-delete action.

- Careers: normalized name, color in Horarios, edit, and active or inactive state.
- Subjects: a required active Career selection, edit, and active or inactive state.
- Hour categories: a normalized name, an optional activity origin (`Meeting`, `Workshop`, `Extraordinary`, or `Recovery`), edit, and active or inactive state.
- Scholarship reference types: optional known required hours and notes.

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

Ciclo actual   [Ciclo abierto]                [Cerrar ciclo]
Historial de ciclos

Carreras                                       [Agregar carrera]
| Nombre                        Color          Estado    Acciones |
| Ingeniería en Sistemas        ISI  Azul      Activa    ...      |

Materias / Categorías de horas / Referencias de beca
```

## Responsive exceptions

- Compact: each catalog becomes a list of items with the name, the career badge and color label where applicable, the status, and inline actions; forms are one column.

## States

| State | Treatment |
| --- | --- |
| Default | Cycle controls and catalog sections. |
| Loading | A skeleton that preserves the sections. |
| Empty catalog | `Todavía no hay carreras registradas.`, `Todavía no hay materias registradas.`, or `Todavía no hay categorías de horas registradas.` inside the section, with its add action. |
| Error | Duplicate names or types and invalid Career and Subject combinations are reported in the Settings feedback region while the form stays filled, so the Admin can correct the input; server validation remains authoritative. Load or save failures show `No se pudo guardar la configuración. Intentar nuevamente.` |
| Required action | `Requiere acción` when no cycle is open, with `Crear ciclo`. |
| Success | A specific confirmation such as `La carrera se creó correctamente.` or `El ciclo se cerró correctamente. El historial se conserva.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Configuración |
| Description | Administrar el ciclo vigente, el catálogo académico y las referencias de beca. |
| Primary action | Crear ciclo; Cerrar ciclo |
| Cycle status | Ciclo abierto; Requiere acción |
| Close confirmation | Title `Confirmar cierre del ciclo`; action `Confirmar cierre` (`Cerrando ciclo…` while pending) |
| Catalog actions | Agregar carrera; Agregar materia; Agregar categoría de horas; Agregar referencia de beca; Guardar cambios; Activar; Inactivar |
| Career color field | Color en Horarios |
| Empty | Todavía no hay carreras registradas. |
| Error | No se pudo guardar la configuración. Intentar nuevamente. |
| Success | La carrera se creó correctamente. |

## Cycle close

The close action uses the shared confirmation dialog and shows the current cycle's identity, that history remains preserved, that the next cycle begins with a zero hour balance, and an explicit confirmation. No automatic balance transfer is offered. Cycle close is audited.

## Acceptance criteria

- [ ] Low-frequency settings do not clutter primary navigation.
- [ ] Cycle close is explicit and audited.
- [ ] No automatic balance transfer is implied.
- [ ] Every career shows its color as a badge and Spanish label, and the form explains automatic assignment only when creating.
