# View: Movimientos

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/hours/movements`. Access: Admin.
- Purpose and success condition: inspect persisted hour movements independently of the balance list and correct a confirmed movement without editing its original values; every reversal stays visibly linked to its original.
- Primary action: none; `Revertir movimiento` is a row action.

## Content order

1. Page header below Horas, with a breadcrumb back to `Horas`.
2. Filters: cycle, Tutor, category, text search, direction, origin, and reversal state.
3. Movement list, newest first: date, Tutor, category or source, direction, signed duration, note, Admin actor, cycle, and activity or recovery origin.

Original and reversal rows stay visibly linked in every responsive layout.

## Responsive exceptions

- Compact: each movement becomes a structured row with date, Tutor, and signed duration visible; the original and reversal link stays visible.

## States

| State | Treatment |
| --- | --- |
| Default | Filters and the movement list. |
| Loading | A list skeleton that preserves the columns. |
| Empty | `Todavía no hay movimientos` with `Los movimientos registrados en el ciclo seleccionado aparecerán aquí.` |
| Search empty | `No encontramos movimientos` with `Probar con otro filtro o limpiar la búsqueda actual.` |
| Error | `No se pudo cargar el historial` with `Reintentar`. Reversal errors show `No se pudo completar la operación. Intentar nuevamente.` and keep the selected movement and confirmation context available for retry. |
| Success | `Reversión registrada`; the reversal and its link to the original appear immediately. |
| Required action | No open cycle for reversal. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Movimientos |
| Primary action | None |
| Reverse action | Revertir movimiento |
| Empty | Todavía no hay movimientos |
| Error | No se pudo completar la operación. Intentar nuevamente. |
| Success | Reversión registrada |

## Reversal

- `Revertir movimiento` is available only for a confirmed movement in an open cycle.
- The confirmation is a named modal explaining that the original stays visible and the balance is recalculated from the new opposite movement.
- Already reversed rows and reversal rows expose their relationship but offer no second reversal and no edit or delete control.

## Accessibility

- The reversal modal supports visible dismissal, Escape, focus entry, focus containment, and focus return to the triggering action.
- Origin and reversal meaning is expressed with text and relationships, not color alone.
