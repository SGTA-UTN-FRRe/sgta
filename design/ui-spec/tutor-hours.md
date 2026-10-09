# View: Mis horas

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/tutor/hours`. Access: Tutor, own information only.
- Purpose and success condition: explain the current balance with the Tutor's personal movement history; the balance is explainable from the displayed history.
- Primary action: none; no mutation control exists.

## Content order

1. Page header with `Saldo de horas y movimientos del ciclo.`
2. `Ciclo vigente`.
3. `Saldo del ciclo` as BalanceStatus (see [Horas](hours.md)) with `Al día` or `Debe horas`.
4. Movement history, newest first, with signed durations.

## Responsive exceptions

None.

## States

| State | Treatment |
| --- | --- |
| Default | Cycle, balance, and history. |
| Loading | The route skeleton. |
| Empty | `Todavía no hay movimientos registrados en este ciclo.` with `El balance aparecerá cuando se registre el primer movimiento del ciclo vigente.` |
| Error | `No se pudieron cargar las horas` with `Reintentar`. |
| Required action | An unlinked account shows `La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.`; a Tutor without membership in the current cycle shows `El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Mis horas |
| Description | Saldo de horas y movimientos del ciclo. |
| Primary action | None |
| Empty | Todavía no hay movimientos registrados en este ciclo. |
| Error | No se pudieron cargar las horas |
| Success | None |

## Acceptance criteria

- [ ] The Tutor sees only their own history.
- [ ] No mutation control exists.
- [ ] The current balance is explainable from the displayed history.
