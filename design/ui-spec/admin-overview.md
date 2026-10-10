# View: Admin overview

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/admin`. Access: Admin.
- Purpose and success condition: show the current operational context and what deserves attention now, so the Admin decides what to act on without visiting every module; the Admin understands the cycle context and pending work in seconds.
- Primary action: none by default; each attention item links to its workflow.

## Content order

1. Page header with the current cycle and date context.
2. `Necesita atención`: action-needed items for Tutors with a negative balance (Horas) and consultations pending review (Consultas). Each item pairs its count with a label and a one-line description, and links to its destination.
3. `Hoy`: today's and upcoming duties in chronological order, with a `Ver horarios` link to Horarios.

The view has no operational summary or recent-activity section: no read model backs them, and the attention items and duties already answer what needs action now.

Data: the current open cycle, the count of active Tutors with a negative balance, the count of consultations pending review, the consultation source health, and upcoming duties. The negative-balance read model exposes a count only; the Horas attention item links to `/admin/hours` without a filter because Horas has no URL-backed negative-balance filter. The consultations item links to `/admin/consultations?status=PENDING_REVIEW`. Do not load vanity totals merely because they exist; no decorative KPI panels.

## Wireframe

```text
PageHeader
Current cycle context

Necesita atención
[ Saldo negativo ] [ Consultas por revisar ]

Hoy
duty table (Wide, Medium) or priority list (Compact)
```

## Responsive exceptions

- Medium: attention items wrap; `Hoy` stays a full-width table.
- Compact: attention items become stacked rows; `Hoy` becomes a priority list that stays chronological, with the Tutor as the row identity.

## States

| State | Treatment |
| --- | --- |
| Default | Context, attention items, and today. |
| Loading | Structural skeletons, not a spinner-only page. |
| Empty attention | `No hay acciones pendientes.` with a short description that the cycle is up to date. |
| Empty duties | `Sin guardias próximas` with a description that no duties are scheduled for the coming days of the cycle. |
| Error | A section error depending on the failure scope: hour balances, consultation queue, consultation source status, and upcoming duties fail independently, each with its own title, description, and link to the module that can retry the read. A page-level failure shows the system error state with `Reintentar`. |
| Degraded | A consultation source failure degrades only the external-dependent section; hour and schedule information stays usable. |
| Required action | Without an open cycle, the header shows `Ciclo requerido`, the attention section explains the prerequisite and links to Configuración, and `Hoy` is hidden. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Inicio |
| Primary action | None |
| Attention section | Necesita atención |
| Today section | Hoy |
| Today description | Guardias de hoy y próximamente, en orden cronológico. |
| Today link | Ver horarios |
| Duty table | Label `Guardias próximas`; columns `Tutor`, `Día`, `Horario`, `Modalidad`; row action `Ver horarios` with accessible name `Ver horarios de <Tutor>`, linking to Horarios at the duty date |
| Attention link | `Ver detalle` |
| Empty | No hay acciones pendientes. |
| Error | System error state with `Reintentar`, or the section error with a link to the owning module |
| Success | None |

## Accessibility

- Attention items are links or buttons with meaningful names.
- Section headings form a logical hierarchy.
- Counts are paired with labels.
- Row actions in the duty list name their Tutor.
- Status does not rely on color.

## Acceptance criteria

- [ ] No invented KPI panels.
- [ ] Every attention item has a destination.
- [ ] An external failure does not blank internal operational data.
- [ ] The required open-cycle state is explicit.
- [ ] Wide and Compact hierarchy remain clear.
