# View: Materias

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/tutors/subjects`. Access: Admin.
- Purpose and success condition: inspect which Tutors cover each Subject, derived from canonical Subject, TutorSubject, and current cycle membership facts; the Admin finds coverage without a separately maintained list.
- Primary action: none; Subjects and their Tutors are edited in [Tutores](tutors.md) and Configuración. The header carries two quiet outline actions: `Ver tutores` (to `/admin/tutors`) and `Actualizar`, which reads the coverage again.

## Content order

1. Page header below Tutores, with a breadcrumb back to `Tutores`, the description `Tutores disponibles por materia.`, `Ver tutores`, and `Actualizar`.
2. Search: `Buscar materia, carrera o tutor`, matching the Subject name, the career name, and each Tutor's formal name, first name, last name, preferred display name, and institutional identifier. The term is kept in the `search` URL parameter (replacing the history entry, preserving other parameters and the fragment); `Limpiar filtros` appears while a term is set.
3. Coverage context: `Ciclo vigente` with the current cycle name, `Criterio de cobertura` with `Solo tutores activos con asignación en el ciclo vigente.`, and `Horas planificadas` with `No disponibles en esta vista hasta contar con datos de horarios.`, because the coverage read model has no schedule data.
4. Result count: `Mostrando <n> materia con cobertura.` or `Mostrando <n> materias con cobertura.`
5. Subject list, ordered by career and then Subject name: the Subject name, its career as a `CareerBadge`, and its Tutors ordered by last and first name. The list contains only active Subjects of active careers that have at least one active Tutor with membership in the current cycle; a Subject without such a Tutor does not appear. Each Tutor is a link with the formal name (`Apellido, Nombre`) to `/admin/tutors?search=<formal name>`. A status badge appears only when it is not the default: `Inactiva` on a Subject, and `Inactivo` with `Relación histórica` on a Tutor.
6. The coverage summary reads `Sin cobertura activa`, `1 tutor activo`, or `<n> tutores activos`, followed by `+ 1 histórico` or `+ <n> históricos` when inactive Tutors are listed.

This view is never independently edited as another source of truth.

## Wireframe

Wide:

```text
Tutores > Materias
Materias                                        [Ver tutores] [Actualizar]
Tutores disponibles por materia.

[Buscar materia, carrera o tutor]

CICLO VIGENTE        CRITERIO DE COBERTURA            HORAS PLANIFICADAS
2026                 Solo tutores activos con ...     No disponibles en esta vista ...

Mostrando 14 materias con cobertura.
Materia                       Carrera     Cobertura activa
Algoritmos y Estructuras ...  (ISI)       2 tutores activos            ^
                                          Benítez, Lucía
                                          Quiroga, Tomás
```

## Responsive exceptions

- Wide (from 1280px): an expandable table with `Materia`, `Carrera`, and `Cobertura activa`; each row's coverage summary is a disclosure, open by default, that lists the Tutors below a divider.
- Medium (from 768px): a compact table with `Materia`, `Carrera`, and `Tutores`, listing the Tutors directly.
- Compact (below 768px): a disclosure list per Subject; the closed summary shows the Subject name, its career badge, and the coverage summary, and opening it lists the Tutors.
- The coverage context stacks in Compact and uses three columns from Medium.

## States

| State | Treatment |
| --- | --- |
| Default | Search, coverage context, result count, and the derived Subject list. |
| Loading | While `Actualizar` or `Reintentar` reads again, the search and `Actualizar` are disabled and the context and list are replaced by a list skeleton announced as `Cargando cobertura de materias`. |
| Empty | `Todavía no hay cobertura` with `Las materias con tutores activos aparecerán aquí cuando existan asignaciones vigentes.` and a `Gestionar tutores` link to `/admin/tutors`. |
| Search empty | `No encontramos cobertura` with `Probar con otro término o limpiar la búsqueda para ver toda la cobertura.`; `Limpiar filtros` in the search bar restores the full list without reading again. |
| Error | `No se pudo cargar la cobertura` with `Reintentar para volver a consultar las materias.` and `Reintentar`; the search and list are hidden and the header keeps `Ver tutores`. |
| Required action | Without an open cycle: `Abrir un ciclo para consultar la cobertura` with `Es necesario contar con un ciclo abierto para consultar la cobertura vigente.` and a `Configurar ciclo` link to `/admin/settings`; the search and list are hidden and the header keeps `Ver tutores`. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Materias |
| Description | Tutores disponibles por materia. |
| Primary action | None |
| Header actions | Ver tutores; Actualizar |
| Search label | Buscar materia, carrera o tutor |
| Clear search | Limpiar filtros |
| Context labels | Ciclo vigente; Criterio de cobertura; Horas planificadas |
| Coverage criterion | Solo tutores activos con asignación en el ciclo vigente. |
| Planned hours | No disponibles en esta vista hasta contar con datos de horarios. |
| Result count | `Mostrando <n> materias con cobertura.` |
| Coverage summary | `Sin cobertura activa`; `1 tutor activo`; `<n> tutores activos`; `+ <n> históricos` |
| Historical Tutor | Inactivo; Relación histórica |
| Empty | Todavía no hay cobertura |
| Empty action | Gestionar tutores |
| Error | No se pudo cargar la cobertura |
| Error description | Reintentar para volver a consultar las materias. |
| Required action | Abrir un ciclo para consultar la cobertura |
| Required action link | Configurar ciclo |
| Loading | Cargando cobertura de materias |
| Success | None |

## Accessibility

- The table and the Compact list are both named `Cobertura de materias`; the table caption is visually hidden and the Subject name is the row header.
- Each Tutor link is named `Ver tutor <formal name>`; each Tutor list is named `Tutores asociados`.
- Coverage summaries are native disclosures operable with Enter and Space; their chevron is decorative.
- The result count is a polite live region; the loading skeleton is a `status`, the error is an `alert`.
- Career badges carry the full career name as their accessible name.
