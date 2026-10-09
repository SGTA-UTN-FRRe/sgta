# View: Consultas

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/consultations`. Access: Admin.
- Purpose and success condition: import, review, classify, and inspect canonical consultations from the external Google Sheet source, keeping consultation data current and clean without editing the Sheet; new rows are processed idempotently, ambiguous rows are reviewed, and canonical consultations are reportable.
- Primary action: `Actualizar consultas`, which imports new source rows and reports a summary.

## Content order

1. Page header with `Actualizar consultas`, the last update (`Última actualización`), and the pending review count (`Pendientes de revisión`).
2. Filters: Estado, Carrera, Tutor, Fecha, Clasificación, and `Sugerencia de materia`.
3. Pending review queue with row selection and bulk actions.
4. Consultation list: Fecha, Estudiante, Tutor, Tema, Clasificación, Estado.
5. Review and detail sheet.

The canonical list carries date, student identity, career, Tutor, academic stage, modality, raw topic, classification, and review state. Student contact is visible only to Admins and only where useful.

## Wireframe

```text
Consultas                              [Actualizar consultas]
Última actualización: ...
Pendientes de revisión: ...

[Estado] [Carrera] [Tutor] [Fecha] [Clasificación]
[Sugerencia de materia]

| Fecha   Estudiante   Tutor   Tema   Clasificación   Estado |
```

## Responsive exceptions

- Medium: a reduced table.
- Compact: filters stack and rows keep student, Tutor, and date visible; less important columns move into row detail. The review sheet becomes full height.

## States

| State | Treatment |
| --- | --- |
| Default | The canonical list and import status. |
| Loading | Import progress or a list skeleton. |
| Empty | `Todavía no hay consultas registradas` with `Actualizar consultas`. |
| Search empty | `No hay resultados para estos filtros` with a way to clear the filters. |
| Error | Local query or save error with retry, such as `No se pudo cargar la lista de consultas. Reintentar.` |
| Unavailable | `No se pudo acceder a la fuente de consultas.`; canonical data remains. |
| Degraded | `No se pudo actualizar la fuente. Las consultas registradas siguen disponibles.`; import is unavailable while history stays usable. |
| Success | Import or review summary. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Consultas |
| Description | Importar, revisar y consultar registros de atención académica. |
| Primary action | Actualizar consultas |
| Pending label | Pendientes de revisión |
| Subject suggestion filter | Sugerencia de materia |
| Suggestion options | Todas; Con sugerencia; Sin sugerencia |
| Bulk subject action | Confirmar materia sugerida |
| Bulk general action | Confirmar como General / Varias |
| Filtered selection | Seleccionar todas las filtradas |
| Empty | Todavía no hay consultas registradas |
| Source unavailable | No se pudo acceder a la fuente de consultas. |
| Review save error | No se pudo guardar la revisión. Revisar los campos e intentar nuevamente. |
| Bulk error | No se pudo completar la consolidación masiva. Intentar nuevamente. |
| Retry | Reintentar |
| Success | Import summary with new, already processed, review-required, and error counts |

## Interaction: Actualizar consultas

- Loading shows inline progress and disables a duplicate concurrent import.
- The success summary reports new rows, already processed rows, rows requiring review, and errors.
- Failure keeps existing canonical data available and turns the action into a retry.
- SGTA never writes to Google Sheets, and reimport is idempotent.

## Interaction: Bulk consolidation

- Each pending row has a keyboard-accessible selection checkbox; the page checkbox selects or clears the visible pending rows.
- `Seleccionar todas las filtradas` selects up to 500 matching pending rows in stable date order. If more rows match, the interface reports the selected and remaining counts; the Admin can confirm another batch after the completed rows leave the queue.
- `Confirmar materia sugerida` is available for selected rows with a suggested subject; `Confirmar como General / Varias` is available for any selected rows.
- A confirmation dialog states the selected count and explains that non-blocking observations about surname, topic, academic stage, and modality will be acknowledged.
- The server revalidates each row in one transaction. Rows with blocking issues, unresolved duplicate decisions, a missing suggestion for the subject action, or an existing final state are omitted and counted in the result.
- Suggestions guide the Admin; they never consolidate a row automatically.

## Review sheet

Shows the relevant raw source value, the normalized candidate, the reason for review, and explicit Admin decision fields. The Admin may resolve the Tutor, career, a valid date correction when evidence supports it, classification, and a duplicate decision. Ambiguous values are never silently guessed.

## Classification

The final canonical state is `Materia` with a subject, or `General / Varias`. `Pendiente de clasificación` is temporary, and pending rows are excluded from subject-level metrics.

## Accessibility

- Import progress is announced without stealing focus.
- The review reason is not communicated by color alone.
- Student contact fields are labeled.
- Filter controls are keyboard reachable.
- Row checkboxes, page selection, filtered selection, and bulk confirmation are keyboard reachable.
- Bulk confirmation is announced with the selected count and returns focus to the initiating action.
- The sheet contains focus and returns it on close.

## Acceptance criteria

- [ ] SGTA never writes to Google Sheets.
- [ ] Reimport is idempotent.
- [ ] Existing canonical data survives a source outage.
- [ ] Ambiguity is reviewed, not guessed.
- [ ] Suggestions do not bypass Admin confirmation.
- [ ] Bulk actions report confirmed and omitted rows and acknowledge only non-blocking observations.
- [ ] Pending classification is excluded from subject metrics.
- [ ] Student contact remains Admin-only.
