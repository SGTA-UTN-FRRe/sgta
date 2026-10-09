# View: Admin overview

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin`. Access: Admin.
- Purpose and success condition: show the current operational context and what deserves attention now, so the Admin decides what to act on without visiting every module; the Admin understands the cycle context and pending work in seconds.
- Primary action: none by default; each attention item links to its workflow.

## Content order

1. Page header with the current cycle and date context.
2. `Necesita atención`: action-needed items such as Tutors with a negative balance (Horas) and consultations pending review (Consultas). Each item pairs its count with a label and links to the relevant destination with a meaningful filter or context.
3. `Hoy`: today's and upcoming duties in chronological order.
4. A concise operational summary.
5. Optional recent relevant administrative activity.

Data: the current open cycle, the negative-balance count and list, consultations requiring review, and upcoming duty context. Do not load vanity totals merely because they exist; no decorative KPI panels.

## Wireframe

```text
PageHeader
Current cycle context

Necesita atención
[ Horas: saldo negativo ] [ Consultas: por revisar ]

Hoy
operational list

Concise summary or recent relevant activity
```

## Responsive exceptions

- Medium: attention items wrap; the `Hoy` list stays full width.
- Compact: attention items become stacked rows; `Hoy` stays chronological.

## States

| State | Treatment |
| --- | --- |
| Default | Context, attention items, and today. |
| Loading | Structural skeletons, not a spinner-only page. |
| Empty attention | `No hay acciones pendientes.` |
| Error | A section or page error depending on the failure scope. |
| Degraded | A consultation source failure degrades only the external-dependent section; hour and schedule information stays usable. |
| Required action | Without an open cycle, explain the prerequisite and link to Configuración. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Inicio |
| Primary action | None |
| Attention section | Necesita atención |
| Today section | Hoy |
| Empty | No hay acciones pendientes. |
| Error | System error state with `Reintentar` |
| Success | None |

## Accessibility

- Attention items are links or buttons with meaningful names.
- Section headings form a logical hierarchy.
- Counts are paired with labels.
- Status does not rely on color.

## Acceptance criteria

- [ ] No invented KPI panels.
- [ ] Every attention item has a destination.
- [ ] An external failure does not blank internal operational data.
- [ ] The required open-cycle state is explicit.
- [ ] Wide and Compact hierarchy remain clear.
