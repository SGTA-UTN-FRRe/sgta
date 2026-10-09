# View: Tutores

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/tutors`. Access: Admin.
- Purpose and success condition: manage Tutor records and academic relationships from one canonical workflow, so the Admin can add, find, edit, deactivate, reactivate, and understand a Tutor quickly; Tutor data stays current without duplicate subject or coverage sources.
- Primary action: `Agregar tutor`, which opens the Tutor form sheet. Secondary: `Editar`, `Ver materias`, `Reactivar`. Consequential: `Desactivar tutor`.

## Content order

1. Page header with `Agregar tutor`.
2. Search and filters: `Buscar tutor`, `Carrera`, `Estado`.
3. Tutor list: Tutor, Carrera (career badge), Beca, Materias, Estado, and row actions.
4. Selected Tutor detail or edit sheet.
5. Link to the derived [Materias](subjects.md) subview.

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

- Medium: keep Tutor, Carrera, Materias, and Estado; move secondary data to row detail.
- Compact: structured rows with the full name dominant and state and career visible; secondary actions move to a named row menu. The form sheet becomes full height, or a dedicated form page if the form becomes too long.

## States

| State | Treatment |
| --- | --- |
| Default | Search, filters, and the Tutor list. |
| Loading | A list skeleton that preserves the columns. |
| Empty | `Todavía no hay tutores` with `Agregar tutor`. |
| Search empty | Clear search and filters. |
| Error | Explain the load or save failure with a retry. |
| Success | Toast or inline update. |
| Required action | Missing academic catalog or cycle prerequisite, when applicable. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Tutores |
| Description | Gestionar perfiles, carrera, materias y estado. |
| Primary action | Agregar tutor |
| Empty | `Todavía no hay tutores` with `Agregar tutor` |
| Incomplete data | Datos incompletos |
| Deactivate action | Desactivar tutor |
| Error | Form banner with field errors; system error state for loads |
| Success | Concise confirmation |

## Interaction: Add or edit a Tutor

A right side sheet in Wide and Medium with these sections:

1. Identidad
2. Contexto académico
3. Materias
4. Ciclo y beca
5. Cuenta de acceso
6. Estado

Account linking:

- The Admin may enter the normalized email of an existing enabled provisioned Tutor account.
- An empty value clears the current link while preserving the Tutor record and history.
- The interface reports distinct safe errors for unknown, non-Tutor, disabled, or already-linked accounts.
- The UI never accepts or displays an application user identifier, session identifier, or provider token.

Validation:

- First name and career are required; surname is optional and a blank surname is stored as absent.
- A duplicate institutional identifier is prevented when present.
- Duplicate subject assignments are prevented.

Success closes the sheet or keeps it open according to the action, updates the list, and shows concise feedback. A server error shows a form banner and inline field errors and preserves valid input. Unsaved changes require confirmation before a destructive dismissal or navigation.

## Interaction: Deactivate

`Desactivar tutor` opens the confirmation dialog, states what remains preserved, and on confirmation updates the state without destroying history. Historical Tutors are never hard-deleted.

## Accessibility

- Table headers have semantic scope.
- The row menu's accessible name includes the Tutor's identity.
- The sheet is named and traps focus.
- The deactivation dialog returns focus to the triggering action.
- Filter labels stay programmatically associated.

## Acceptance criteria

- [ ] Historical Tutors are not hard-deleted.
- [ ] Materias is derived, not manually duplicated.
- [ ] Create, edit, deactivate, and reactivate work across supported widths.
- [ ] Error and empty states are deliberate.
- [ ] Keyboard and focus behavior are verified.
