# View: Horas

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin/hours`. Access: Admin.
- Purpose and success condition: explain each Tutor's current hour status and register traceable individual or bulk movements, so the Admin knows who owes hours and records a justified change efficiently; every displayed balance can be explained by movement history.
- Primary action: `Registrar movimiento`, which opens the movement dialog. Secondary: `Ver movimientos` (links to [Movimientos](movements.md)), search, filters, and each row's contextual history. Reversing a confirmed movement happens in [Movimientos](movements.md); Horas shows reversal state read-only.

## Content order

1. Page header with the secondary `Ver movimientos` link and `Registrar movimiento`.
2. Search and filters: `Buscar tutor`, `Estado` (`Todos`, `Al día`, `Debe horas`), `Categoría` (`Todas` or an active category), the result count, and `Limpiar filtros` while a search or filter is active. In Compact, `Estado` and `Categoría` move into the shared `Filtros` sheet.
3. Tutor balance list: Tutor, Saldo, Estado, and the row action `Ver movimientos`.
4. Selected Tutor history, in a sheet.
5. Movement dialog.

Balance rows carry the Tutor's formal name as a link to the Tutor registry, the career name and current cycle as secondary text, the derived balance, and the derived state. The career appears as text, not as a career badge, because the hour read model carries no career color. Search matches the Tutor name, career, and cycle. `Categoría` keeps Tutors with at least one movement of that category in the current cycle. Movement history carries date, category, direction, duration, note, origin reference when meaningful, Admin actor, and reversal state, newest first by default. Durations use the shared duration format; source minutes stay intact internally.

## Wireframe

```text
Horas                                  [Registrar movimiento]
Consultar saldos y registrar movimientos de horas.

[Buscar tutor] [Estado] [Categoría]

| Tutor               Saldo          Estado       |
| Husak, Guillermo    1 h 30 min     Debe horas   |
```

## Responsive exceptions

- Medium: the table with the movement dialog and the history sheet.
- Compact: each row becomes a structured balance item with the balance prominent; history opens as a full-height sheet, and the movement dialog becomes full height with its title and actions fixed while the form scrolls.

## States

| State | Treatment |
| --- | --- |
| Default | The balance list. |
| Loading | Stable skeleton rows labeled `Cargando saldos`; `Registrar movimiento` and the filters are disabled. |
| Empty | `Todavía no hay saldos` with `Todavía no hay saldos cargados.` and `Registrar movimiento`. |
| Search empty | `No encontramos saldos` with `No hay resultados para la búsqueda actual.` and `Limpiar filtros`. Clearing announces `Se limpiaron la búsqueda y los filtros.` |
| Error | A load failure shows `No se pudieron cargar las horas` with `Reintentar para volver a consultar los saldos.` and `Reintentar`. History loads show `No se pudo cargar el historial` with `Reintentar` inside the sheet. Transactions show `No se pudo completar la operación. Intentar nuevamente.` at the top of the dialog form, with `No se registró ningún movimiento.` before the reason, and preserve the input. |
| Success | `Movimiento registrado` with `Se registraron movimientos para <n> tutores. Origen: <origen>.`; if the refreshed view cannot load, the notice adds that Horas must be reloaded to show the updated balance. |
| Required action | An inline notice with its resolution link replaces the list: no open cycle (`Abrir un ciclo para consultar horas`, `Configurar ciclo`), no active category (`Configurar categorías de horas`, `Configurar categorías`), or no eligible Tutor (`No hay tutores elegibles`, `Revisar tutores`). Inside the dialog, `No hay categoría de recuperación activa` blocks `Reconocer recuperación`, `No hay categorías activas disponibles para registrar movimientos.` blocks `Movimiento` when only recovery categories are active, and `No hay tutores elegibles disponibles para registrar movimientos.` replaces an empty Tutor list. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Horas |
| Description | Consultar saldos y registrar movimientos de horas. |
| Primary action | Registrar movimiento |
| Secondary and row action | Ver movimientos |
| Dialog submit | Registrar movimientos; Reconocer recuperación for recovery |
| Owes label | Debe horas |
| Current label | Al día |
| Reverse action | Revertir movimiento |
| Empty | Todavía no hay saldos |
| Search empty | No encontramos saldos |
| Error | No se pudo completar la operación. Intentar nuevamente. |
| Success | Movimiento registrado |
| History empty | Todavía no hay movimientos |
| History footer | El saldo se calcula a partir de los movimientos registrados y no se puede modificar directamente. |

## Pattern: BalanceStatus

Explains a current hour state with the duration and the state label together, so the meaning never depends on a sign or a color:

```text
1 h 15 min
Debe horas
```

`Debe horas` applies to a balance below zero; `Al día` applies to zero or a positive balance. Zero reads `0 min` and never uses a status color. Signs are reserved for movements, per PROJECT-DESIGN › Visual rules.

## Pattern: BulkTutorSelector

Selects several Tutors for one shared administrative movement: search, select all eligible, deselect exceptions, a visible selected count, a keyboard-operable checkbox list, and a predictable mixed state.

- Every eligible Tutor starts selected.
- `Buscar tutor` narrows only the visible list by name or career and never changes the selection. While a search is active, the count reads `<n> de <total> tutores seleccionados; la selección incluye los tutores ocultos por la búsqueda.`
- `Seleccionar todos` acts on every eligible Tutor, visible or not, and shows the mixed state when only some are selected.
- Each row shows the formal name and career.

## Dialog: Registrar movimiento

| Field | Type | Required | Rule |
| --- | --- | :---: | --- |
| Tipo de registro | Segmented choice | Yes | `Movimiento` or `Reconocer recuperación` |
| Dirección | Segmented choice | Yes | `Crédito` or `Débito` |
| Categoría | Select | Yes | Active category only |
| Duración | Hours and minutes | Yes | Total positive minutes; defaults to 1 h 30 min |
| Fecha | Date | Yes | Valid administrative date in the open cycle; defaults to the cycle start |
| Nota | Text | No | Short explanatory note |
| Tutores | BulkTutorSelector | Yes | At least one eligible Tutor |

Selection behavior:

- `Seleccionar todos` selects every eligible Tutor; individual exceptions can be deselected.
- The selected count stays visible.
- Tutors hidden by the dialog search stay selected, and the count says so.
- `Reconocer recuperación` selects the active recovery category and records a credit through the same atomic transaction; recovery and activity categories cannot be submitted as debits.
- Activity and recovery categories expose their source kind in the selection summary and in the persisted movement history.

The dialog shows an explicit summary before submit:

```text
Registrar movimiento - Crédito - Reunión de equipo - Reunión - 1 h 30 min - 12 tutores - 14/09/2026
```

Success commits one traceable movement per affected Tutor in one atomic transaction; balances update only after the whole transaction succeeds, and the confirmation reports the affected Tutor count.

Failure: bulk creation is atomic. All selected Tutor movements are created inside one database transaction; if any movement cannot be created, none are committed. The UI explains that nothing was recorded and preserves the valid transaction input for retry; the message receives focus when it is out of view.

Dismissal: `Cancelar`, the close control, and Escape close the dialog and keep the draft for the rest of the visit, so dismissal needs no confirmation; focus returns to the trigger. While the open dialog has edits, reloading or leaving the site asks for the browser's confirmation. Dismissal is disabled while the transaction is submitting.

## Sheet: contextual history

`Ver movimientos` on a row opens a right sheet titled with the Tutor's formal name and described as `Movimientos del <ciclo>. El saldo se calcula a partir de los movimientos confirmados.` It shows:

1. `Saldo` with the BalanceStatus pattern.
2. `Movimientos` with the record count and the Tutor's movements, newest first: date and category; direction, signed duration, and origin (`Carga manual` or the activity kind); a status badge (`Confirmado`, `Revertido`, or `Reversión`); note (`Sin nota` when absent) and actor; the registered activity origin and date when present; and, for reversed movements, `El movimiento original se conserva sin editar y se muestra como revertido.`
3. A footer with the history footer copy and a `Ver movimientos` link to Movimientos filtered by cycle and Tutor.

Loading shows `Cargando movimientos…`; empty shows `Todavía no hay movimientos` with `Todavía no hay movimientos para este tutor en el ciclo actual.`

## Movement reversal

Confirmed movement values are never edited in place. `Revertir movimiento` lives in [Movimientos](movements.md), where it opens the confirmation dialog that explains that the original movement remains visible, the reversal is traceable, and the balance is recalculated. Horas shows the reversal state in the contextual history and links there through `Ver movimientos`.

## Accessibility

- The balance is accompanied by `Al día` or `Debe horas`.
- Dialog fields have visible labels.
- Tutor checkboxes expose the full Tutor name.
- The select-all mixed state is announced.
- The error summary moves focus only when needed.
- The row action and the history link are named `Ver movimientos de <Tutor>`.
- The history sheet is named by the Tutor, contains focus, closes with Escape, and returns focus to its trigger.
- The reversal confirmation in Movimientos is a named modal with focus return.

## Acceptance criteria

- [ ] A balance is never directly editable.
- [ ] Every balance is explainable from movement history.
- [ ] Bulk select all and deselect exceptions are efficient and accessible.
- [ ] The transaction summary is explicit before submit.
- [ ] Confirmed movements are corrected through traceable reversal, never value overwrite.
- [ ] Compact and Wide flows are complete.
