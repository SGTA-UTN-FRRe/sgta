# View: Tutores

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/tutors`. Access: Admin.
- Purpose and success condition: manage Tutor records and academic relationships from one canonical workflow, so the Admin can add, find, edit, deactivate, reactivate, and understand a Tutor quickly; Tutor data stays current without duplicate subject or coverage sources.
- Primary action: `Agregar tutor`, which opens the Tutor form sheet. Secondary: `Editar`, `Ver materias`, `Reactivar`. Consequential: `Desactivar tutor`.

## Content order

1. Page header with `Agregar tutor`.
2. Search and filters: `Buscar tutor`, `Carrera`, `Estado`, the shared result count (`<n> resultado` or `<n> resultados`), and `Limpiar filtros` while any filter is active. In Compact only the search stays inline; `Carrera` and `Estado` move to the `Filtros` sheet.
3. Tutor list: Tutor, Carrera (career badge), Beca, Materias (the count of assigned subjects), Estado, and row actions. The Tutor cell shows the formal name as the control that opens the detail sheet, `Datos incompletos` when applicable, and the cycle membership line.
4. Selected Tutor detail or edit sheet.
5. Link `Ver materias` to the derived [Materias](subjects.md) subview, below the list.

Tutor data: id, first name, optional last name, optional preferred display name, optional institutional identifier, primary career, status, subject assignments, cycle membership, scholarship reference when available, and the optional provisioned Tutor account email for Admin-only account ownership management. Account identifiers and session or provider details never appear in Tutor-facing views.

Name formatting:

- Formal table identity is `Apellido, Nombre`, joining only the parts that exist.
- Informal display uses the preferred name, falling back to the first name.
- A missing surname shows no placeholder or dangling separator.
- The list shows `Datos incompletos` when the surname or institutional identifier is missing, derived from the null fields.
- No alias is fabricated.

## Wireframe

```text
Tutores                                      [Agregar tutor]
Gestionar perfiles, carrera, materias y estado.

[Buscar tutor...] [Carrera] [Estado]

| Tutor             Carrera   Beca    Materias   Estado     ... |
| Husak, Guillermo  ISI       ...     4          Activo         |
```

## Responsive exceptions

- Medium: keep Tutor, Carrera, Materias, and Estado; `Beca` moves to the row detail sheet.
- Compact: structured rows with the full name dominant and state and career visible; secondary actions move to a row menu named `Acciones para <Tutor>`. The form sheet and the confirmation dialogs become full height. The list shows every record without pagination, so it grows long with the registry.

## States

| State | Treatment |
| --- | --- |
| Default | Search, filters, and the Tutor list. |
| Loading | A list skeleton that preserves the columns; the header action is disabled. |
| Empty | `Todavía no hay tutores` with `Agregar el primer tutor para comenzar a organizar la cobertura.` and `Agregar tutor`. |
| Search empty | `No encontramos tutores` with `Probar con otro nombre o limpiar los filtros.` and `Limpiar filtros`. |
| Error | A load failure shows the system error state `No se pudo cargar la lista` with `Reintentar`; a save or status failure shows a form banner or a message inside the confirmation dialog and preserves the input. |
| Success | An inline `Cambios guardados` notice with the concise confirmation. |
| Required action | Without an open cycle, `Abrir un ciclo para gestionar tutores` with `Configurar ciclo`; without an active career, `Completar el catálogo académico` with `Configurar catálogo`. Both link to Configuración. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Tutores |
| Description | Gestionar perfiles, carrera, materias y estado. |
| Primary action | Agregar tutor |
| Empty | `Todavía no hay tutores` with `Agregar tutor` |
| Incomplete data | Datos incompletos |
| Deactivate action | Desactivar tutor |
| Reactivate action | Reactivar |
| Movement link | `Ver movimientos` |
| Unsaved changes | `¿Cerrar la ficha?`, `Hay cambios sin guardar.`, `Cerrar`, `Cancelar` |
| Error | Form banner with field errors; system error state for loads |
| Success | `El tutor se agregó correctamente.`, `Los datos del tutor se actualizaron correctamente.`, `El tutor se desactivó y sus antecedentes se conservaron.`, `El tutor se reactivó correctamente.` |

## Interaction: Add or edit a Tutor

A right side sheet, full height in Compact, titled `Agregar tutor`, `Editar <Tutor>`, or `Detalle de <Tutor>`, with a visible `Cerrar panel de tutor` control and a footer holding `Cerrar` and the submit action (`Agregar tutor` or `Guardar cambios`, disabled until the form changes). The detail mode is read-only and offers `Ver movimientos` when the Tutor belongs to the open cycle. The sheet has these sections:

1. Identidad: `Nombre` (required), `Apellido (opcional)`, `Nombre preferido (opcional)`, `Identificador institucional (opcional)`.
2. Contexto académico: `Carrera` (required) with its career badge. Changing the career clears the selected subjects.
3. Materias: the subjects of the selected career as labeled checkboxes with a selection count. Inactive subjects stay visible, disabled, marked `Inactiva · se conserva como antecedente`.
4. Ciclo y beca: `Ciclo abierto` and `Referencia de beca (opcional)`; inactive references stay visible and disabled.
5. Cuenta de acceso: `Correo de la cuenta habilitada (opcional)`.
6. Estado: the current status badge; a new Tutor is created active and later changes use the row actions.
Account linking:

- The Admin may enter the normalized email of an existing enabled provisioned Tutor account.
- An empty value clears the current link while preserving the Tutor record and history.
- The interface reports distinct safe errors for unknown, non-Tutor, disabled, or already-linked accounts.
- The UI never accepts or displays an application user identifier, session identifier, or provider token.

Validation:

- First name and career are required; surname is optional and a blank surname is stored as absent.
- A duplicate institutional identifier is prevented when present.
- Duplicate subject assignments are prevented.

Success closes the sheet, updates the list, and shows concise feedback. A server error shows a form banner and inline field errors and preserves valid input. Unsaved changes require confirmation before dismissing the sheet by the close control, `Cerrar`, or Escape; the confirmation is the shared alert dialog with the copy above and returns focus to the sheet's close control. Leaving the page by browser navigation or reload is not intercepted.

## Interaction: Deactivate

`Desactivar tutor` opens the confirmation dialog, which states that the Tutor becomes inactive and that subjects and cycle history are preserved, and on confirmation updates the state without destroying history. `Reactivar` uses the same dialog and states that the Tutor becomes available again. A failure stays inside the dialog and allows retry. Historical Tutors are never hard-deleted.

## Accessibility

- Table headers have semantic scope.
- Row actions carry the Tutor's identity in their accessible names: `Editar <Tutor>`, `Ver materias de <Tutor>`, `Desactivar tutor <Tutor>` or `Reactivar <Tutor>`, and in Compact the menu `Acciones para <Tutor>`. The movements link in the detail sheet is named `Ver movimientos de <Tutor>`.
- The sheet is named and traps focus.
- The status confirmation dialog returns focus to the triggering action.
- Filter labels stay programmatically associated.

## Acceptance criteria

- [ ] Historical Tutors are not hard-deleted.
- [ ] Materias is derived, not manually duplicated.
- [ ] Create, edit, deactivate, and reactivate work across supported widths.
- [ ] Error and empty states are deliberate.
- [ ] Keyboard and focus behavior are verified.
