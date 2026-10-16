# View: Mis horas

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/tutor/hours`. Access: Tutor, own information only.
- Purpose and success condition: explain the current balance with the Tutor's personal movement history; the balance is explainable from the displayed history.
- Primary action: none; no mutation control exists. `Reintentar`, `Actualizar`, and `Volver a consultar` only read the information again.

## Content order

1. Page header with `Saldo de horas y movimientos del ciclo.`
2. Balance panel: `Saldo del ciclo` as BalanceStatus (see [Horas](hours.md)), the unsigned duration with `Al día` or `Debe horas`, followed by `Ciclo vigente` with the cycle name and its date range.
3. `Historial de movimientos` with `Movimientos del ciclo vigente, ordenados del más reciente al más antiguo.`, then the movements, newest first. Each movement shows its category, its direction (`Crédito` or `Débito`) with its long date, its signed duration (for example `+1 h 30 min`), and its note (`Sin nota` when absent).
4. When the history contains reversals, an `Estado` column marks the original with `Movimiento revertido` and the compensation with `Reversión registrada`, each with a link to the other movement (`Ver reversión vinculada` or `Ver movimiento original`) while that movement is displayed. Movements without a reversal show no status.

## Wireframe

Compact first:

```text
Mis horas
Saldo de horas y movimientos del ciclo.

Saldo del ciclo
2 h 30 min
(Al día)
─────────
CICLO VIGENTE
2026
Jueves, 1 de enero de 2026 — Jueves, 31 de diciembre de 2026

(clock) Historial de movimientos
Movimientos del ciclo vigente, ordenados del más reciente al más antiguo.

Recuperación de horas
Crédito · Martes, 15 de septiembre de 2026
Duración
+1 h 30 min
Nota
Recuperación de guardia
```

## Responsive exceptions

- Compact (below 768px): the history is a priority list; each movement shows its category, direction, and date, then labeled `Duración`, `Nota`, and, with reversals, `Estado`.
- Medium (from 768px): the cycle context sits beside the balance, separated by a divider, and the history becomes a table with `Movimiento y fecha` (the note under the date), `Duración`, and, with reversals, `Estado`.
- Wide (from 1280px): the note moves to its own `Nota` column.

## States

| State | Treatment |
| --- | --- |
| Default | Balance panel and history. |
| Loading | The route skeleton on navigation; `Reintentar`, `Actualizar`, and `Volver a consultar` show an in-place skeleton named `Cargando horas` and move focus to the page title. |
| Empty | The balance panel and history are replaced by `Todavía no hay movimientos registrados en este ciclo.` with `El balance aparecerá cuando se registre el primer movimiento del ciclo vigente.` and `Actualizar`. |
| Error | `No se pudieron cargar las horas` and `Reintentar`. When the request returns a specific reason, the description carries it (for example `La sesión expiró. Volver a iniciar sesión para continuar.`); otherwise the title stands alone. |
| Required action | An `Acción requerida` status, a title, a description, and `Volver a consultar`; no link, because the Tutor cannot resolve the prerequisite. An unlinked account shows `Completar la vinculación de la cuenta` with `La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.`; without an open administrative cycle, `No hay un ciclo vigente` with `No hay un ciclo administrativo abierto para mostrar información personal.`; a Tutor without membership in the current cycle, `Completar la pertenencia al ciclo` with `El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Mis horas |
| Description | Saldo de horas y movimientos del ciclo. |
| Primary action | None |
| Cycle label | Ciclo vigente |
| Balance heading | Saldo del ciclo |
| History heading | Historial de movimientos |
| History description | Movimientos del ciclo vigente, ordenados del más reciente al más antiguo. |
| Missing note | Sin nota |
| Reversal statuses | Movimiento revertido; Reversión registrada |
| Relationship links | Ver reversión vinculada; Ver movimiento original |
| Empty | Todavía no hay movimientos registrados en este ciclo. |
| Empty action | Actualizar |
| Error | No se pudieron cargar las horas |
| Error action | Reintentar |
| Required-action action | Volver a consultar |
| Success | None |

## Accessibility

- The balance has a readable text state next to its duration.
- The balance panel and the history are regions named by their headings; the history is a table, or a list below 768px, named `Historial de movimientos`.
- Cycle and movement dates use `time` elements with ISO values.
- Relationship links point to the linked movement in the same layout.
- No mutation control is present.

## Acceptance criteria

- [ ] The Tutor sees only their own history.
- [ ] No mutation control exists.
- [ ] The current balance is explainable from the displayed history.
