# View: Horas

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/hours`. Access: Admin.
- Purpose and success condition: explain each Tutor's current hour status and register traceable individual or bulk movements, so the Admin knows who owes hours and records a justified change efficiently; every displayed balance can be explained by movement history.
- Primary action: `Registrar movimiento`, which opens the movement dialog. Secondary: `Ver movimientos` (links to [Movimientos](movements.md)), search, and filters. Consequential: reverse a confirmed movement.

## Content order

1. Page header with `Registrar movimiento`.
2. Search and filters: `Buscar tutor`, `Estado`, `Categoría`.
3. Tutor balance list: Tutor, Saldo (balance status), Estado.
4. Selected Tutor history.
5. Movement dialog.

Balance rows carry the Tutor's identity, the current cycle, derived signed minutes, and the derived state. Movement history carries date, category, direction, duration, note, origin reference when meaningful, Admin actor, and reversal state, newest first by default. Durations use the shared duration format; source minutes stay intact internally.

## Wireframe

```text
Horas                                  [Registrar movimiento]
Consultar saldos y registrar movimientos de horas.

[Buscar tutor] [Estado] [Categoría]

| Tutor               Saldo          Estado       |
| Husak, Guillermo    1 h 30 min     Debe horas   |
```

## Responsive exceptions

- Medium: the table with the movement dialog or a sheet.
- Compact: each row becomes a structured balance item with the balance prominent; history opens as a page or full-height sheet, and the movement dialog becomes full height.

## States

| State | Treatment |
| --- | --- |
| Default | The balance list. |
| Loading | Stable rows or a skeleton. |
| Empty | `Todavía no hay saldos` with `Todavía no hay saldos cargados.`; the dialog states `No hay tutores elegibles disponibles para registrar movimientos.` when no Tutor is eligible. |
| Search empty | `No hay resultados para la búsqueda actual.` with a way to clear search and filters. |
| Error | `No se pudo cargar el historial` for history loads; `No se pudo completar la operación. Intentar nuevamente.` for transactions, with valid input preserved when safe. |
| Success | `Movimiento registrado`, stating the affected Tutor count. |
| Required action | No open cycle, `No hay categorías activas disponibles para registrar movimientos.`, or `No hay categoría de recuperación activa` for `Reconocer recuperación`. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Horas |
| Description | Consultar saldos y registrar movimientos de horas. |
| Primary action | Registrar movimiento |
| Dialog submit | Registrar movimientos |
| Owes label | Debe horas |
| Current label | Al día |
| Reverse action | Revertir movimiento |
| Empty | Todavía no hay saldos |
| Error | No se pudo completar la operación. Intentar nuevamente. |
| Success | Movimiento registrado |

## Pattern: BalanceStatus

Explains a current hour state with the duration and the state label together, so the meaning never depends on a sign or a color:

```text
1 h 15 min
Debe horas
```

`Debe horas` applies to a balance below zero; `Al día` applies to zero or a positive balance. Zero reads `0 min` and never uses a status color. Signs are reserved for movements, per PROJECT-DESIGN › Visual rules.

## Pattern: BulkTutorSelector

Selects several Tutors for one shared administrative movement: search, select all eligible, deselect exceptions, a visible selected count, a keyboard-operable checkbox list, and a predictable mixed state.

## Dialog: Registrar movimiento

| Field | Type | Required | Rule |
| --- | --- | :---: | --- |
| Tipo de registro | Segmented choice | Yes | `Movimiento` or `Reconocer recuperación` |
| Dirección | Segmented choice | Yes | `Crédito` or `Débito` |
| Categoría | Select | Yes | Active category only |
| Duración | Hours and minutes | Yes | Total positive minutes |
| Fecha | Date | Yes | Valid administrative date |
| Nota | Text | No | Short explanatory note |
| Tutores | BulkTutorSelector | Yes | At least one eligible Tutor |

Selection behavior:

- `Seleccionar todos` selects every eligible Tutor in the current selection context; individual exceptions can be deselected.
- The selected count stays visible.
- No hidden selection survives an explicit search or filter reset without clear feedback.
- `Reconocer recuperación` selects the active recovery category and records a credit through the same atomic transaction; recovery and activity categories cannot be submitted as debits.
- Activity and recovery categories expose their source kind in the selection summary and in the persisted movement history.

The dialog shows an explicit summary before submit:

```text
Registrar movimiento - Crédito - Reunión de equipo - Reunión - 1 h 30 min - 12 tutores - 14/09/2026
```

Success commits one traceable movement per affected Tutor in one atomic transaction; balances update only after the whole transaction succeeds, and the confirmation reports the affected Tutor count.

Failure: bulk creation is atomic. All selected Tutor movements are created inside one database transaction; if any movement cannot be created, none are committed. The UI explains that nothing was recorded and preserves the valid transaction input for retry.

## Movement reversal

Confirmed movement values are never edited in place. `Revertir movimiento` opens the confirmation dialog, which explains that the original movement remains visible, the reversal is traceable, and the balance is recalculated.

## Accessibility

- The balance is accompanied by `Al día` or `Debe horas`.
- Dialog fields have visible labels.
- Tutor checkboxes expose the full Tutor name.
- The select-all mixed state is announced.
- The error summary moves focus only when needed.
- The reversal confirmation is a named modal with focus return.

## Acceptance criteria

- [ ] A balance is never directly editable.
- [ ] Every balance is explainable from movement history.
- [ ] Bulk select all and deselect exceptions are efficient and accessible.
- [ ] The transaction summary is explicit before submit.
- [ ] Confirmed movements are corrected through traceable reversal, never value overwrite.
- [ ] Compact and Wide flows are complete.
