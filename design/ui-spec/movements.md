# View: Movimientos

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/hours/movements`. Access: Admin.
- Purpose and success condition: inspect persisted hour movements independently of the balance list and correct a confirmed movement without editing its original values; every reversal stays visibly linked to its original.
- Primary action: none; `Revertir movimiento` is a row action. The header has no back action; the `Horas` breadcrumb returns to Horas and, when a Tutor filter is active, to that Tutor's balance row.

## Content order

1. Page header below Horas, with a breadcrumb back to `Horas`.
2. Filters: `Buscar` (`Buscar tutor, categoría o nota`), `Ciclo`, `Tutor`, `Categoría`, `Dirección`, `Origen`, and `Estado`, the result count, and `Limpiar filtros` while a search or filter other than the cycle is active. In Compact, every filter except `Buscar` moves into the shared `Filtros` sheet.
3. Movement list, newest first: Tutor, date, and career; signed duration and direction; category and origin (`Carga manual` or the activity kind, with the activity date, duration, and recording Admin when present); note (`Sin nota` when absent); cycle with its status and the Admin actor; and a reversal status badge (`Confirmado`, `Revertido`, or `Reversión`) with the relationship.

Filters:

- `Ciclo`, `Tutor`, and `Categoría` are kept in the URL as `cycleId`, `tutorId`, and `categoryId`; search, `Dirección`, `Origen`, and `Estado` apply only to the current visit.
- The view loads the newest 200 movements of the selected cycle. `Tutor` and `Categoría` options come from the loaded movements; a `tutorId` link to a Tutor without movements keeps the option `Tutor seleccionado`.
- Search matches Tutor name, career, category, cycle, note, Admin actor, and origin.
- Changing the cycle reloads the list and resets `Tutor` and `Categoría`. `Limpiar filtros` keeps the selected cycle and announces `Los filtros se limpiaron y el historial completo volvió a quedar visible.`

The career appears as text, not as a career badge, because the movement read model carries no career color.

Original and reversal rows stay visibly linked in every responsive layout: the original reads `El movimiento original permanece visible como revertido.` with `Ver reversión vinculada`, and the reversal reads `Esta fila compensa un movimiento anterior y no puede revertirse otra vez.` with `Ver movimiento original`. Each link moves to the linked row in the visible layout. When the filters hide the linked row, the link is replaced by `El movimiento vinculado no aparece con los filtros actuales.`

## Responsive exceptions

- Medium: note, cycle, and Admin actor move below the Tutor identity; the row action reads `Revertir`.
- Compact: each movement becomes a structured row with Tutor, date, career, and the row action first, followed by labeled duration, category and origin, note, cycle and actor, and status fields; the original and reversal link stays visible. The row action reads `Revertir`.

## States

| State | Treatment |
| --- | --- |
| Default | Filters and the movement list. |
| Loading | A list skeleton that preserves the columns, labeled `Cargando movimientos`; the filters are disabled while a cycle loads. |
| Empty | `Todavía no hay movimientos` with `Los movimientos registrados en el ciclo seleccionado aparecerán aquí.` |
| Search empty | `No encontramos movimientos` with `Probar con otro filtro o limpiar la búsqueda actual.` and `Limpiar filtros`. |
| Error | A load failure shows `No se pudo cargar el historial` with `Reintentar para volver a consultar los movimientos.` and `Reintentar`. When reloading a cycle fails while movements are shown, the list stays and `No se pudo actualizar el historial` offers `Reintentar`. Reversal errors appear at the top of the confirmation as `No se registró la reversión.` followed by the reason (`No se pudo completar la operación. Intentar nuevamente.` when no specific reason applies) and keep the selected movement and confirmation context available for retry. |
| Success | `Reversión registrada` with `El movimiento fue revertido. El original permanece visible y la compensación quedó registrada.`; the reversal and its link to the original appear immediately. |
| Required action | Without any administrative cycle, `Configurar un ciclo para consultar movimientos` with `Crear un ciclo administrativo para consultar y corregir movimientos de horas.` and `Configurar ciclo` replaces the list. Closed cycles stay selectable and readable: their movements offer no reversal and read `El ciclo está cerrado; este movimiento permanece disponible sólo para consulta.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Movimientos |
| Primary action | None |
| Description | Consultar movimientos de horas y revertir movimientos confirmados. |
| Reverse action | Revertir movimiento; Revertir below Wide |
| Confirmation submit | Confirmar reversión; Registrando reversión… while pending |
| Confirmation cancel | Cancelar |
| Empty | Todavía no hay movimientos |
| Search empty | No encontramos movimientos |
| Error | No se pudo completar la operación. Intentar nuevamente. |
| Success | Reversión registrada |

## Reversal

- `Revertir movimiento` is available only for a confirmed movement in an open cycle.
- The confirmation is a named modal titled `Revertir movimiento` with `Se agregará un movimiento opuesto y el original permanecerá visible como revertido.` It summarizes `Tutor`, `Movimiento` (date and category), `Saldo que compensa`, and `Origen`, and states `El saldo de horas se actualizará con la reversión. El movimiento original seguirá en el historial.`
- While the reversal is submitting, confirmation and dismissal are disabled and other reversal actions cannot start.
- Already reversed rows and reversal rows expose their relationship but offer no second reversal and no edit or delete control.

## Accessibility

- The reversal modal is an alert dialog that supports visible dismissal, Escape, focus entry on `Cancelar`, focus containment, and focus return to the triggering action. After a successful reversal removes that action, focus moves to the page heading.
- Each row action is named `Revertir movimiento de <Tutor> del <fecha>` at every width.
- Origin and reversal meaning is expressed with text and relationships, not color alone.
