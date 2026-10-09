# View: Mi resumen

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/tutor`. Access: Tutor, own information only.
- Purpose and success condition: answer the Tutor's most common questions immediately (current hour status, next duty, and subjects), so the Tutor does not need to ask an Admin for routine status.
- Primary action: none; the view is read-only.

## Content order

1. Current balance with its state (BalanceStatus, as in [Horas](hours.md)).
2. Next duty.
3. Subjects.
4. Current cycle, career, and scholarship reference.

## Wireframe

Compact first:

```text
Mi resumen

Horas
1 h 15 min
Debe horas

Próxima guardia
Martes 16:00 - 18:00

Materias
Álgebra
Física
```

## Responsive exceptions

- Wide may use a two-column composition that keeps the same hierarchy.

## States

| State | Treatment |
| --- | --- |
| Default | Balance, next duty, subjects, and context. |
| Loading | The route skeleton. |
| Empty | `Todavía no hay información de resumen` with `Todavía no hay materias ni guardias asignadas para mostrar en el ciclo vigente.`; a missing next duty reads `No hay guardias próximas`. |
| Error | `No se pudo cargar el resumen. Intentar nuevamente.` with `Reintentar`. |
| Required action | An unlinked account shows `La cuenta todavía no está vinculada a un perfil de Tutor. Contactar a la administración de Tutorías para solicitar acceso.`; a Tutor without membership in the current cycle shows `El perfil todavía no tiene una pertenencia configurada para el ciclo vigente.` |

## Copy

| Element | Copy |
| --- | --- |
| Title | Mi resumen |
| Primary action | None |
| Empty | Todavía no hay información de resumen |
| Error | No se pudo cargar el resumen. Intentar nuevamente. |
| Success | None |

## Accessibility

- The balance has a readable text state.
- Schedule times use clear date and time wording.
- No Admin control is present.

## Acceptance criteria

- [ ] Only the Tutor's own information is visible.
- [ ] The Compact experience is first-class.
- [ ] No student identity or contact appears.
