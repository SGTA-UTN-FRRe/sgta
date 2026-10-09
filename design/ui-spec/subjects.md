# View: Materias

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/tutors/subjects`. Access: Admin.
- Purpose and success condition: inspect which Tutors cover each Subject, derived from canonical Subject, TutorSubject, and current scheduling facts; the Admin finds coverage without a separately maintained list.
- Primary action: none; Subjects and their Tutors are edited in [Tutores](tutors.md) and Configuración.

## Content order

1. Page header below Tutores, with a breadcrumb back to `Tutores` and the current cycle.
2. Search: `Buscar materia, carrera o tutor`.
3. Subject list: Materia, Carrera, associated Tutors, and planned hours in the selected or current schedule context when available. A Subject without Tutors shows `Sin tutor asignado.`

This view is never independently edited as another source of truth.

## Responsive exceptions

- Wide: an expandable table.
- Medium: a compact table.
- Compact: a disclosure list per Subject.

## States

| State | Treatment |
| --- | --- |
| Default | Search and the derived Subject list. |
| Loading | A list skeleton announced as `Cargando cobertura de materias`. |
| Empty | `Todavía no hay cobertura` with `Las materias con tutores activos aparecerán aquí cuando existan asignaciones vigentes.` |
| Search empty | `No encontramos cobertura` with `Probar con otro término o limpiar la búsqueda para ver toda la cobertura.` |
| Error | `No se pudo cargar la cobertura` with `Reintentar para volver a consultar las materias.` and `Reintentar`. |
| Required action | `Abrir un ciclo para consultar la cobertura`, linking to Configuración. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Materias |
| Description | Tutores disponibles por materia. |
| Primary action | None |
| Empty | Todavía no hay cobertura |
| Error | No se pudo cargar la cobertura |
| Success | None |
