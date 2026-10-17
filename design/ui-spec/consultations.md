# View: Consultas

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/consultations`. Access: Admin.
- Purpose and success condition: import, review, classify, and inspect canonical consultations from the external Google Sheet source, keeping consultation data current and clean without editing the Sheet; new rows are processed idempotently, ambiguous rows are reviewed, and canonical consultations are reportable.
- Primary action: `Actualizar consultas`, which imports new source rows and reports a summary; it reads `Reintentar` while the last import failed.

## Content order

1. Page header with the title, the description, and `Actualizar consultas`.
2. Import status region `Estado de la importación`: the source status badge and its explanation, `Última actualización correcta: <fecha>` (`Sin registros` before the first successful import), and the counts `Pendientes de revisión` and `Filas con errores`. Import, refresh, and invalid-filter notices follow it.
3. Filters: `Buscar consultas` (`Estudiante, carrera, tutor o tema`), `Estado`, `Carrera`, `Tutor`, `Desde`, `Hasta`, `Clasificación`, and `Sugerencia de materia`, the result count, and `Limpiar filtros` while a search or filter is active. In Compact, every filter except `Buscar consultas` moves into the shared `Filtros` sheet. Below the filters, `<n> consultas registradas · <n> pendientes de revisión` reports the canonical matches and the global pending count.
4. Pending review queue `Pendientes de revisión` with its total, the selection toolbar, and bulk actions. Each pending row shows its selection checkbox, student, status, date, career, Tutor, unresolved observations in plain language, classification, the suggested subject or `Sin sugerencia de materia`, and `Revisar a <Estudiante>`.
5. Canonical list `Consultas registradas` with `Mostrando <a>–<b> de <n>`: Estudiante, Fecha, Tutor, Carrera, Tema, Clasificación (with the subject), and Estado, plus the row action `Ver detalle`. Pages hold 50 consultations and use `Anterior`, `Página <n>`, and `Siguiente`.
6. Review and detail sheet.

The canonical list carries date, student identity, career, Tutor, academic stage, modality, raw topic, classification, and review state. Student contact is visible only to Admins: as a labeled `mailto:` link under the student in the Medium and Wide table, and in the review detail.

Status labels are `Pendiente de revisión`, `Lista para consolidar`, `Consolidada`, and `Duplicada`. Careers render with the career badge; a career that does not match the career list appears as text.

Filters:

- Filters are kept in the URL as `search`, `status`, `careerId`, `tutorId`, `fromDate`, `toDate`, `classification`, and `suggestion`, with the canonical page as `limit` and `offset`. Browser back and forward restore earlier filters.
- Filters apply on change. Typing a search replaces the current history entry; other filter changes add one. Every change returns to the first page and clears the bulk selection.
- `Estado` offers `Todos`, `Pendientes de revisión`, `Listas para consolidar`, `Consolidadas`, and `Duplicadas`; `Clasificación` offers `Todas`, `Materia`, `General / Varias`, and `Pendiente de clasificación`; inactive Tutors read `<Tutor> · Inactivo`.
- The result count adds the canonical matches and the visible pending rows. `Limpiar filtros` restores the defaults and reads the list again.
- Invalid URL filters reset to the defaults and show `Los filtros de la dirección no son válidos. Se muestran todas las consultas.` with `Limpiar filtros`.

## Wireframe

```text
Consultas                                     [Actualizar consultas]
Importar, revisar y consultar registros de atención académica.

Estado de la importación  [Fuente actualizada]   Pendientes de revisión  n
Última actualización correcta: ...                Filas con errores       n

[Buscar consultas] [Estado] [Carrera] [Tutor] [Desde] [Hasta]
[Clasificación] [Sugerencia de materia]          n resultados  [Limpiar filtros]

Pendientes de revisión                                            n en total
[ ] Seleccionar página  [Seleccionar todas las filtradas]  n seleccionadas · máximo 500
                       [Confirmar materia sugerida] [Confirmar como General / Varias]
[ ] Estudiante  [Pendiente de revisión]                       [Revisar a Estudiante]

Consultas registradas                                    Mostrando 1–50 de n
| Estudiante   Fecha   Tutor   Carrera   Tema   Clasificación   Estado   [Ver detalle] |
```

## Responsive exceptions

- Medium: the table hides Carrera and Tema, which appear from 1280px; filters wrap in order; row actions stay visible without horizontal scrolling.
- Compact: the canonical table becomes a priority list with student, date, Tutor, classification and subject, status, and `Ver detalle`; career, topic, and contact move to the review detail. Pending rows stack their action at full width. The review sheet becomes full height.

## States

| State | Treatment |
| --- | --- |
| Default | The import status, the pending queue, and the canonical list. |
| Loading | `Cargando consultas` with a list skeleton before the first read. Later reads keep the current list and show `Actualizando resultados…`. An import shows inline progress on its action and announces `Actualizando consultas.` |
| Empty | `Todavía no hay consultas registradas` with `Al actualizar la fuente, las consultas registradas aparecerán aquí.` and `Actualizar consultas`. An empty pending queue reads `No hay consultas pendientes en este resultado.`, or `No hay consultas pendientes con estos filtros.` while `Estado` is `Pendientes de revisión`. |
| Search empty | `No hay resultados para estos filtros` with `Probar con otros términos o quitar alguno de los filtros.` and `Limpiar filtros`. |
| Error | A first-read failure shows `No se pudo cargar la lista de consultas.` with `Reintentar para volver a cargar las consultas registradas.` and `Reintentar`. A later read failure keeps the shown data and shows `No se pudo cargar la lista de consultas. Reintentar.` with `Se conservan los datos que ya estaban disponibles.` and `Reintentar`. Import, review, and bulk failures appear next to their operation with their own recovery. |
| Unavailable | A failed import shows `Fuente no disponible` with `No se pudo acceder a la fuente de consultas.`; canonical data remains and the primary action reads `Reintentar`. |
| Degraded | A partial import shows `Actualización parcial` with `La fuente respondió, pero algunas filas requieren atención.` and the error-row count; canonical data and import stay available. |
| Success | The import summary, the review outcome inside the sheet, or the bulk result `<n> confirmadas, <n> omitidas.` |

Source status badges: `Fuente actualizada`, `Actualización parcial`, `Actualización en curso`, `Fuente no disponible`, and `Sin actualizaciones` (`Todavía no se registró una actualización de la fuente.`).

## Copy

| Element | Copy |
| --- | --- |
| Title | Consultas |
| Description | Importar, revisar y consultar registros de atención académica. |
| Primary action | Actualizar consultas; Reintentar after a failed import |
| Pending label | Pendientes de revisión |
| Last update | Última actualización correcta |
| Search | Buscar consultas; placeholder Estudiante, carrera, tutor o tema |
| Subject suggestion filter | Sugerencia de materia |
| Suggestion options | Todas; Con sugerencia; Sin sugerencia |
| Page selection | Seleccionar página |
| Filtered selection | Seleccionar todas las filtradas; Seleccionando… while pending |
| Bulk subject action | Confirmar materia sugerida |
| Bulk general action | Confirmar como General / Varias |
| Review action | `Revisar a <Estudiante>` |
| Detail action | Ver detalle |
| Empty | Todavía no hay consultas registradas |
| Search empty | No hay resultados para estos filtros |
| Source unavailable | No se pudo acceder a la fuente de consultas. |
| Import running | Ya hay una actualización en curso. Reintentar en unos momentos. |
| Import error | No se pudo actualizar la fuente. Reintentar.; No se pudo actualizar la fuente. Las consultas registradas siguen disponibles. when the request fails |
| Review save error | No se pudo guardar la revisión. Revisar los campos e intentar nuevamente.; No se pudo guardar la revisión. Revisar la conexión e intentar nuevamente. when the request fails |
| Bulk error | No se pudo completar la consolidación masiva. Intentar nuevamente. |
| Selection error | No se pudieron seleccionar las consultas filtradas. Intentar nuevamente. |
| Retry | Reintentar |
| Success | `Actualización completada: <n> nuevas, <n> ya procesadas, <n> requieren revisión y <n> con errores.` |
| Unsaved changes | `¿Cerrar el detalle?`, `Hay cambios sin guardar en la revisión.`, `Cerrar`, `Cancelar` |

## Interaction: Actualizar consultas

- Loading shows inline progress and disables a duplicate concurrent import.
- The success summary reports new rows, already processed rows, rows requiring review, and errors, followed by the counts `Nuevas`, `Ya procesadas`, `Para revisar`, and `Errores`; the list is read again with the current filters.
- Failure keeps existing canonical data available and turns the action into a retry.
- SGTA never writes to Google Sheets, and reimport is idempotent.

## Interaction: Bulk consolidation

- Each pending row has a keyboard-accessible selection checkbox named `Seleccionar consulta de <Estudiante>`; `Seleccionar página` selects or clears the visible pending rows. The toolbar shows `<n> seleccionadas · máximo 500`, and selecting beyond 500 rows reports `El máximo es 500 consultas por acción.`
- `Seleccionar todas las filtradas` selects up to 500 matching pending rows in stable date order and reports `Se seleccionaron <n> consultas pendientes.` If more rows match, it reports `Se seleccionaron <n> de <total> pendientes; quedan <n> para otra tanda. Confirmar el lote y seleccionar la siguiente tanda para continuar.`; the Admin can confirm another batch after the completed rows leave the queue.
- `Confirmar materia sugerida` and `Confirmar como General / Varias` are available while rows are selected; the server omits selected rows without a suggestion from the subject action.
- The confirmation is an alert dialog titled with the action. It states `Se intentará consolidar <n> consultas con la materia sugerida.` or `Se intentará consolidar <n> consultas como General / Varias.` and explains that non-blocking observations about surname, topic, academic stage, and modality will be acknowledged and that the server revalidates each row and reports confirmed and omitted rows.
- While the action is submitting, confirmation and dismissal are disabled. A failure appears inside the dialog and keeps the selection for retry. Success closes the dialog, reports the result, clears the selection, and reads the list again.
- The server revalidates each row in one transaction. Rows with blocking issues, unresolved duplicate decisions, a missing suggestion for the subject action, or an existing final state are omitted and counted in the result.
- Suggestions guide the Admin; they never consolidate a row automatically.

## Review sheet

- Opens from `Revisar a <Estudiante>` or `Ver detalle` as a wide right sheet titled `Detalle de <Estudiante>` (`Revisión de consulta` while loading) with `Comparar la fila original con los valores normalizados.`, the status badge, and the review version.
- `Valores originales y normalizados` compares the raw source value with the normalized candidate for Carrera, Estudiante, Fecha, Tutor, Tramo académico, Modalidad, Tema, and Contacto; missing values read `Sin dato`.
- `Observaciones que requieren revisión` lists each reason for review in plain language. Each observation needs `Confirmo que revisé esta observación` before saving; observations resolved by a decision field add `Se resuelve al confirmar el campo correspondiente.` Without observations it reads `No se detectaron observaciones.`
- `Decisión de revisión` holds explicit fields for Carrera, Tutor, `Fecha de consulta`, Clasificación, and Materia when the classification is Materia; subjects follow the selected career and inactive options are marked. The submit action reads `Guardar revisión` (`Guardando revisión…` while pending). Ambiguous values are never silently guessed.
- Validation on submit: `La carrera, el tutor y una fecha válida son obligatorios.`, `La materia es obligatoria para esta clasificación.`, `Confirmar cada observación antes de guardar.`, and `Indicar si cada posible duplicado mostrado es duplicado o no.`
- `Posibles duplicados (<n>)` lists each candidate with its student, date, career, and Tutor, `El registro relacionado ya está consolidado.` when it applies, and a decision of `Sin decidir`, `Confirmar duplicado`, or `No es duplicado`; a candidate already marked as the duplicate shows `El otro registro es el duplicado`. More than 100 candidates page with `Anterior` and `Siguientes duplicados`, keeping the decisions already made.
- Saving reports `La revisión quedó guardada.`, `La consulta quedó consolidada.`, or `La consulta quedó identificada como duplicada.` and refreshes the list. Final records are read-only: `Este registro ya tiene un estado final. El detalle se muestra en modo de consulta.`
- A detail load failure shows `No se pudo cargar el detalle de la consulta. Reintentar.` with `Reintentar`. A missing record reads `La consulta ya no está disponible. Actualizar la lista e intentar nuevamente.` A concurrent change reloads the detail and reads `La consulta cambió o una decisión de duplicado entró en conflicto. Se actualizó el detalle; revisar los datos antes de guardar otra vez.`, or `La consulta cambió, pero no se pudo actualizar el detalle. Reintentar la carga antes de guardar.` when the reload fails.
- A pending save prevents dismissal. Unsaved edits require confirmation before dismissing the sheet by `Cerrar detalle`, `Cerrar`, or Escape; the confirmation is the shared alert dialog with the copy above and returns focus to `Cerrar detalle`. Reloading or leaving the site with unsaved edits asks for the browser's confirmation.

## Classification

The final canonical state is `Materia` with a subject, or `General / Varias`. `Pendiente de clasificación` is temporary, and pending rows are excluded from subject-level metrics.

## Accessibility

- Import progress is announced without stealing focus.
- The review reason is not communicated by color alone.
- Student contact fields are labeled; the contact link is named `Contacto de <Estudiante>`.
- Filter controls are keyboard reachable.
- Row checkboxes, page selection, filtered selection, and bulk confirmation are keyboard reachable.
- Row actions name the student: `Revisar a <Estudiante>` and `Ver detalle de <Estudiante>`.
- Bulk confirmation is announced with the selected count and returns focus to the initiating action; after a successful action clears the selection and disables that action, focus moves to the workspace.
- The sheet moves focus to `Cerrar detalle`, contains focus, and returns it to the triggering action on close, or to the workspace when that action is no longer shown.

## Acceptance criteria

- [ ] SGTA never writes to Google Sheets.
- [ ] Reimport is idempotent.
- [ ] Existing canonical data survives a source outage.
- [ ] Ambiguity is reviewed, not guessed.
- [ ] Suggestions do not bypass Admin confirmation.
- [ ] Bulk actions report confirmed and omitted rows and acknowledge only non-blocking observations.
- [ ] Pending classification is excluded from subject metrics.
- [ ] Student contact remains Admin-only.
