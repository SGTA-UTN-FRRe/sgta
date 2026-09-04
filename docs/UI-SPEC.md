---
document: UI-SPEC
mode: decision
type: implementation-interface-specification
status: approved-baseline
project: SGTA
authority: implementation-ui
inherits_from:
  - DESIGN-STANDARD.md
  - PROJECT-DESIGN.md
---

# SGTA — UI Specification

> Detailed interface, state, responsive, and interaction specification.

# AI READING CONTRACT

Mode: **decision**. This document is authoritative for SGTA interface structure, states, interactions, and responsive behavior.

Rules:
1. All colors, typography, geometry, focus treatment, semantic states, and motion inherit from `PROJECT-DESIGN.md`.
2. Do not invent a competing visual system in component code.
3. Preserve the domain boundaries from `PROJECT.md` and `ARCHITECTURE.md`.
4. Use Server Components by default; Client Components only for real browser interaction.
5. Consequential mutations always validate authorization on the server.
6. The supplied teammate notes are incorporated only where they are compatible with the approved product model.

---

# 1. Global interface rules

## Application shell

### Admin shell

```text
┌──────────────────┬───────────────────────────────────────────────┐
│ Tutorías / SGTA  │ Page context + account                       │
│                  ├───────────────────────────────────────────────┤
│ Tutores          │                                               │
│ Horarios         │              Main workspace                   │
│ Horas            │                                               │
│ Consultas        │                                               │
│ Reportes         │                                               │
│                  │                                               │
│ Configuración    │                                               │
│ Cuenta           │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

- Desktop uses a persistent navy sidebar.
- Clicking the product lockup returns to `/admin`.
- The five primary operational destinations are:
  1. **Tutores**
  2. **Horarios**
  3. **Horas**
  4. **Consultas**
  5. **Reportes**
- **Configuración** is secondary and sits near the bottom; it contains cycle/catalog settings that should not compete with daily work.
- The top content bar contains contextual breadcrumb/title support and the account/session affordance; it does not duplicate the entire sidebar.

### Tutor shell

Tutor uses a simpler authenticated shell:
- **Mi resumen**
- **Mi horario**
- **Mis horas**

No administrative navigation is rendered.

## Navigation

- Active Admin item uses the canonical Faro Marker from `PROJECT-DESIGN.md`.
- Do not add a primary **QR** navigation item. QR/Form is an external intake mechanism; the owned product concept is **Consultas**.
- Do not add a primary **Auditoría de horas** item in the initial navigation. Movement history is accessible from **Horas**; broader technical audit remains an administrative capability.
- **Materias** is a subview/tab under **Tutores**, because the list is derived from tutors, subject assignments, and schedules.
- **Asistencia** is a subview/tab under **Horarios**, because it operates on duty occurrences.

## Page container

- Standard views use the canonical `--max-width` with canonical gutters.
- Schedule and dense reporting canvases may use the full available main workspace while preserving gutters.
- Content remains left-aligned; do not center operational tables in narrow cards.

## Standard spacing

Use the canonical spacing roles:
- `spacing-2xl` between major page regions.
- `spacing-xl` for page header to first content region.
- `spacing-lg` for card/panel padding.
- `spacing-md` and `spacing-sm` for control groups, table tools, and row-level composition.

## Repeated interaction patterns

- **Side sheet:** edit Tutor, edit assignment, inspect an item without losing list context.
- **Dialog:** confirmation, bulk hour transaction, cycle close, or compact irreversible action.
- **Dropdown menu:** secondary row actions only.
- **Popover:** short filters/date choices only.
- **Tabs:** meaningful sibling views or schedule plans; not decorative card selectors.
- **Confirmation:** required for cycle close, movement reversal, and tutor deactivation when consequences must be explicit.

## Feedback patterns

- Field errors render inline below the affected control.
- Form-level/server errors appear in a concise danger banner above actions.
- Successful mutations use a short toast plus immediate visible state update.
- Long-running external import uses inline progress/status rather than a blocking full-screen loader.
- Positive/negative hour states always show sign/text, not color alone.
- Operational numbers, duty hours, dates, and balance calculations strictly enforce tabular figures (`font-variant-numeric: tabular-nums` / `tabular-nums`) to ensure immaculate vertical column alignment in administrative tables.
- Empty states feature a minimalist geometric Faro stroke illustration (Midnight Navy and Faro Amber accents) accompanied by clear, friendly copy (e.g. *“Todo en orden. No hay guardias pendientes para el día de hoy.”*) and one contextual next action when the user can resolve the condition.

## System states

Reachable global states:
- **Default / Populated**
- **Loading**
- **Empty**
- **Error**
- **Success / Confirmation**
- **Permission denied**
- **Required action / Blocked** when a prerequisite such as an open cycle is missing
- **Unavailable** for the Google Sheets integration
- **Partial / Degraded data** when a non-critical report or external source fails

Offline-first behavior is not part of the initial product, so no custom Offline state is specified.

---

# 2. Route inventory

| Route | View | Access | Primary purpose | Priority |
|---|---|---|---|---|
| `/login` | Login | Public | Authenticate an enabled SGTA user with Google | P0 |
| `/admin` | Admin Overview | Admin | Orient the administrator and surface current operational attention | P1 |
| `/admin/tutores` | Tutores | Admin | Manage tutors and inspect their academic assignments | P0 |
| `/admin/tutores/materias` | Materias | Admin | Inspect derived subject coverage and tutor assignments | P0 |
| `/admin/horarios` | Horarios | Admin | Create/manage schedule plans and assignments | P0 |
| `/admin/horarios/asistencia` | Asistencia | Admin | Mark Present/Falta for duty occurrences | P0 |
| `/admin/horas` | Horas | Admin | Inspect balances and register hour movements | P0 |
| `/admin/horas/movimientos` | Movimientos | Admin | Inspect/reverse traceable hour history | P0 |
| `/admin/consultas` | Consultas | Admin | Import, review, classify, and inspect consultations | P0 |
| `/admin/reportes` | Reportes | Admin | Explore canonical operational and consultation indicators | P0 |
| `/admin/configuracion` | Configuración | Admin | Manage cycle and low-frequency catalogs/settings | P1 |
| `/tutor` | Mi resumen | Tutor | Read own current status | P0 |
| `/tutor/horario` | Mi horario | Tutor | Read own active schedule | P0 |
| `/tutor/horas` | Mis horas | Tutor | Read own balance and movement history | P0 |

---

# 3. View specifications

---

# View: Login

## Overview

```text
Route:            /login
Access:           Public
Priority:         P0
Primary user:     Admin / Tutor
Related workflow: Authentication
```

**Purpose:** Authenticate a previously enabled SGTA user with Google.

**User goal:** Enter the system without creating a new public account.

**Success condition:** Valid Google identity resolves to an enabled SGTA user and redirects to the correct role shell.

## Information hierarchy

1. Tutorías / UTN FRRe identity.
2. Short explanation that access is restricted to enabled users.
3. **Continuar con Google**.
4. Assistance copy for an unrecognized account.

**Primary action:** `Continuar con Google`.

**Secondary actions:** None.

**Destructive actions:** None.

## Layout

```text
┌─────────────────────────────────────────────┐
│              Tutorías identity              │
│                                             │
│     Sistema de Gestión de Tutorías          │
│     Acceso para usuarios habilitados        │
│                                             │
│        [ Continuar con Google ]             │
│                                             │
│  ¿Tu cuenta no tiene acceso? Contactá...    │
└─────────────────────────────────────────────┘
```

- Wide/Medium: centered compact authentication surface.
- Compact: full-width surface within mobile gutters.
- No illustration carousel or marketing panels.

## Data requirements

Required: current session state and OAuth configuration.

## Interactions

- Google button disables while redirect/auth is in progress.
- Enabled Admin redirects to `/admin`.
- Enabled Tutor redirects to `/tutor`.
- Valid Google identity without SGTA access returns a clear blocked state.

## States

| State | Reachable? | Visual Presentation, Guidance & Recovery |
|---|:---:|---|
| Default | Yes | Identity + Google CTA |
| Loading | Yes | Disabled CTA with inline progress |
| Error | Yes | Form-level message and retry |
| Permission denied | Yes | “Esta cuenta no está habilitada en SGTA.” with contact guidance |

## Accessibility

- One `h1`.
- Google CTA is first primary focus after brand context.
- No information encoded only in imagery.
- OAuth errors are announced through an accessible live region.

## Microcopy

| Element | Copy |
|---|---|
| Page title | Sistema de Gestión de Tutorías |
| Primary CTA | Continuar con Google |
| Permission message | Esta cuenta no está habilitada en SGTA. |
| Recovery | Contactá a la administración de Tutorías si necesitás acceso. |

## Acceptance criteria

- [ ] Role-based redirect works.
- [ ] Public signup is absent.
- [ ] Keyboard and screen-reader flow verified.
- [ ] Permission-denied state is distinct from technical failure.

---

# View: Admin Overview

## Overview

```text
Route:            /admin
Access:           Admin
Priority:         P1
Primary user:     Admin
Related workflow: Daily orientation
```

**Purpose:** Provide a concise operational landing surface without becoming a decorative dashboard.

**User goal:** See what needs attention and navigate quickly to the relevant module.

**Success condition:** Admin can identify current cycle, pending operational work, and next action in seconds.

## Information hierarchy

1. Current administrative cycle and date context.
2. Action-needed summaries: pending attendance, tutors with negative balance, consultations requiring review.
3. Today/upcoming schedule context.
4. Direct links into the five operational areas.

**Primary action:** None; this page orients rather than forcing a generic CTA.

## Layout

```text
[Current cycle]                    [Account]

Necesita atención
[Pending attendance] [Negative balances] [Consultations to review]

Hoy / Próximamente
[compact operational list]

Accesos rápidos
[Tutores] [Horarios] [Horas] [Consultas] [Reportes]
```

Avoid vanity metrics such as total users unless they answer a current operational question.

## States

Default, Loading, Empty, Error, Degraded data.

- Empty attention state: “No hay acciones pendientes.”
- Degraded external data: consultation card shows an unavailable state without blocking the rest of the page.

## Acceptance criteria

- [ ] No fake KPI cards.
- [ ] Each attention item links to the filtered destination.
- [ ] External-source failure does not block internal operational data.

---

# View: Tutores & Materias

## Overview

```text
Routes:           /admin/tutores
                  /admin/tutores/materias
Access:           Admin
Priority:         P0
Primary user:     Admin
Related workflow: Manage tutors and academic catalog
```

**Purpose:** Maintain tutor records and inspect subject coverage derived from canonical relations.

**User goal:** Add/update/inactivate tutors and understand who can tutor each subject.

**Success condition:** Tutor data and subject relationships are current without maintaining duplicate manual lists.

## Information hierarchy

### Tab: Tutores
1. Page title + `Agregar tutor`.
2. Search/status/career filters.
3. Tutor table.
4. Row detail/action sheet.

### Tab: Materias
1. Subject search/filter.
2. Derived subject rows.
3. Expand subject to show associated tutors and currently relevant schedule information.

**Primary action:** `Agregar tutor`.

**Secondary actions:** `Editar`, `Ver materias`, `Reactivar`.

**Destructive actions:** `Desactivar tutor` with confirmation. Do not offer hard delete for tutors with history.

## Layout

```text
Tutores                                      [Agregar tutor]
[Tutores] [Materias]

[Buscar...] [Carrera] [Estado]

┌────────────────────────────────────────────────────────────┐
│ Tutor            Carrera   Beca   Materias   Estado   ... │
├────────────────────────────────────────────────────────────┤
│ Guillermo Husak  ISI       ...    [Ver 4]    Activo       │
└────────────────────────────────────────────────────────────┘
```

**Tutor identity cell**
- Primary: `Apellido, Nombre`.
- Secondary: career and optional display alias only if the domain model actually includes it.
- `Legajo` may be shown only if it is confirmed/modelled as an administrative field; it is not introduced by UI alone.

**Materias view**
- Is derived from `Subject`, `TutorSubject`, and relevant schedule data.
- Do not create a second manually maintained “lista de materias”.

## Responsive behavior

- Wide: planar table.
- Medium: secondary columns collapse into row detail.
- Compact: structured tutor list cards; actions in a trailing menu/sheet.
- Materia expansion becomes a stacked disclosure on compact screens.

## Form behavior

Tutor form uses canonical fields already supported by the domain. Required/optional status follows the model, not the teammate mockup.

Validation occurs on blur for clear field errors and again on submit.

Unsaved edits in a sheet prompt before dismissal when data has changed.

## States

Default, Loading, Empty, Error, Success.

Empty:
- Tutores: “Todavía no hay tutores cargados.” + `Agregar tutor`.
- Materias: “No hay materias disponibles para mostrar.” with catalog guidance.

## Acceptance criteria

- [ ] No hard-delete path for historical tutors.
- [ ] Materias view is derived, not duplicated.
- [ ] Filters preserve shareable/query state where practical.
- [ ] Compact view remains readable without shrinking the desktop table.

---

# View: Horarios & Asistencia

## Overview

```text
Routes:           /admin/horarios
                  /admin/horarios/asistencia
Access:           Admin
Priority:         P0
Primary user:     Admin
Related workflow: Plan duty schedules and register attendance
```

**Purpose:** Manage regular/special schedule plans and register what actually occurred.

**User goal:** Build schedules quickly, switch between plans, and mark attendance without manual spreadsheet rearrangement.

**Success condition:** Plans remain structured and editable; special periods do not destroy the regular schedule; attendance references real duty occurrences.

## Information hierarchy

### Horarios
1. Plan tabs / active period context.
2. `Nuevo plan` / `Agregar asignación`.
3. Weekly/time grid.
4. Selected assignment detail.

### Asistencia
1. Date/shift selector.
2. Duty occurrence list.
3. Fast Present/Falta controls.
4. Pending debit confirmation when a Falta is recorded.

## Layout

```text
Horarios                     [Agregar asignación]
[Regular] [Bienal] [+ Nuevo plan]

        LUN      MAR      MIÉ      JUE      VIE
08:00   [Tutor A ─────]
10:00             [Tutor B ───────────]
12:00   ...

Selected block -> edit sheet
```

Schedule blocks:
- show tutor name, time range, and modality/type where relevant;
- visual height represents duration;
- do **not** resize according to student count, because consultation volume is not part of the scheduling model;
- drag/resize is allowed only after the chosen grid library proves accessible and reliable;
- form-based editing remains available.

## Interactions

### Move / resize assignment
- Client interaction previews the change.
- Save occurs through server-validated mutation.
- Conflict/invalid interval returns the block to the last valid state and explains the error.

### Mark attendance
- **Presente:** records attendance immediately with positive feedback. Visual badge turns green/soft; does not create hour credit.
- **Falta:** records attendance and immediately surfaces an explicit confirmation dialog: *“La guardia programada de [Tutor] era de [X] hs ([Y] min). ¿Confirmar débito sugerido o ajustar minutos manualmente?”*.
- Admin can confirm the suggested debit with one click, adjust the minute count, or attach an explanatory note.
- No automatic or silent hour balance mutation without explicit human confirmation.

## Responsive behavior

- Wide: full week grid.
- Medium: reduced grid/day grouping.
- Compact: day-focused list; complex drag editing is replaced by edit sheets/forms.
- Attendance stays optimized for fast touch interaction.

## States

Default, Loading, Empty, Error, Required action.

Required action examples:
- no open cycle;
- no active plan for selected date.

## Acceptance criteria

- [ ] Regular and special plans remain independently recoverable.
- [ ] Present does not create hour credit.
- [ ] Falta cannot silently mutate balance.
- [ ] Schedule remains usable without drag-and-drop.

---

# View: Horas & Movimientos

## Overview

```text
Routes:           /admin/horas
                  /admin/horas/movimientos
Access:           Admin
Priority:         P0
Primary user:     Admin
Related workflow: Maintain traceable hour balances
```

**Purpose:** Make balances understandable and allow individual/bulk recognized hour movements.

**User goal:** See who is al día/debe horas and register a justified credit/debit efficiently.

**Success condition:** Every balance is derived from traceable movements and bulk operations remain explicit.

## Information hierarchy

1. `Registrar movimiento`.
2. Filter/search.
3. Tutor balance table.
4. Movement history/detail.

**Balance display**
- Always include sign and formatted duration.
- Pair with text `Al día` / `Debe horas`.
- Positive/negative color is supportive only.

## Layout

```text
Horas                                  [Registrar movimiento]

[Buscar tutor...] [Estado] [Categoría]

┌────────────────────────────────────────────┐
│ Tutor             Saldo        Estado     │
├────────────────────────────────────────────┤
│ G. Husak (ISI)     -01:30       Debe horas │
│ ...                                        │
└────────────────────────────────────────────┘
```

### Dialog: Registrar movimiento

**Purpose:** Support both one-person and multi-person transactions.

```text
Tipo:       [Crédito | Débito]
Categoría:  [Reunión v]
Duración:   [ 1 h ] [ 15 min ]
Fecha:      [...]
Nota:       [...]

Tutores
[ ] Seleccionar todos
[x] Tutor A
[x] Tutor B
[ ] Tutor C

                     [Cancelar] [Registrar]
```

- `Seleccionar todos` selects the current eligible tutor set; individual rows can then be deselected.
- The selection count is visible before submission.
- The confirmation summary states direction, category, duration, date, and number of tutors.
- No bulk operation is inferred from color or context.

### Movement history

- Sort newest first by default.
- Show tutor, date, direction, category, minutes, note/origin, Admin actor, and reversal state as permitted.
- `Revertir movimiento` requires confirmation and creates traceable reversal/void behavior according to domain implementation.

## States

Default, Loading, Empty, Error, Success.

## Acceptance criteria

- [ ] Balance is never directly editable.
- [ ] Bulk selector supports Select all + deselect exceptions.
- [ ] Direction/category/minutes are explicit before confirmation.
- [ ] Reversal history remains visible.

---

# View: Consultas

## Overview

```text
Route:            /admin/consultas
Access:           Admin
Priority:         P0
Primary user:     Admin
Related workflow: Import, curate, review, classify consultations
```

**Purpose:** Own the intake and data-quality workflow for consultations coming from Google Sheets.

**User goal:** Bring in new data, resolve anomalies, classify records, and inspect history.

**Success condition:** New source rows are processed idempotently and canonical consultations are usable for reporting.

## Information hierarchy

1. Import status + `Actualizar consultas`.
2. Review-required count.
3. Filters: state, date, career, tutor, classification.
4. Consultation table/history.
5. Detail/review sheet.

**Primary action:** `Actualizar consultas`.

**Secondary actions:** `Revisar`, `Clasificar`, `Ver detalle`.

## Layout

```text
Consultas                              [Actualizar consultas]
Última actualización: ...   Pendientes de revisión: ...

[Estado] [Carrera] [Tutor] [Fecha]

┌─────────────────────────────────────────────────────────────┐
│ Fecha   Estudiante   Tutor   Tema   Clasificación   Estado │
└─────────────────────────────────────────────────────────────┘
```

The chronological history is part of this view. A separate “QR history” is not required.

## Interactions

### Actualizar consultas
- Starts read-only source fetch.
- Shows inline progress.
- Success summary: new, skipped, review-required, errors.
- Technical source identifiers are not shown unless useful to Admin support.

### Review
- Original relevant values are visible alongside normalized values where needed.
- Admin can resolve tutor/career/classification.
- Ambiguous data is never silently guessed.

## States

Default, Loading, Empty, Error, Unavailable, Degraded data, Success.

Unavailable:
- “No se pudo acceder a la fuente de consultas.”
- `Reintentar`.
- Existing canonical data remains browsable.

## Acceptance criteria

- [ ] No write operation targets Google Sheets.
- [ ] Pending classification is visibly distinct and excluded from subject metrics.
- [ ] Existing canonical consultations remain available when Sheets is unavailable.
- [ ] Student contact details remain Admin-only.

---

# View: Reportes

## Overview

```text
Route:            /admin/reportes
Access:           Admin
Priority:         P0
Primary user:     Admin
Related workflow: Inspect demand and operational indicators
```

**Purpose:** Answer administrative questions from canonical data without manual spreadsheet reconstruction.

**User goal:** Filter a period and understand consultation demand, coverage, attendance, and hour status.

**Success condition:** Reports are derived, filterable, and explainable.

## Information hierarchy

1. Global report filters.
2. Small set of useful summary indicators.
3. Tables/series that answer the selected question.
4. Breakdown controls.

## Layout

```text
Reportes
[Período] [Carrera] [Materia] [Tutor] [Modalidad]

Resumen útil
[Consultas] [Tutores con deuda] [Cobertura]

Demanda
[chart only if useful]  [ranked table]

Operación
[attendance / hours / activity tables]
```

Rules:
- No chart exists just to fill a grid.
- Every chart has a table/accessible data representation.
- Filters apply consistently across related sections.
- Reports prefer aggregate data; student identification is omitted unless the workflow explicitly requires it.

## States

Default, Loading, Empty, Error, Degraded data.

## Acceptance criteria

- [ ] Metrics derive from canonical modules.
- [ ] No manual report table is persisted as a source of truth.
- [ ] Filters are clear and resettable.
- [ ] Charts, when present, have accessible equivalents.

---

# View: Configuración

## Overview

```text
Route:            /admin/configuracion
Access:           Admin
Priority:         P1
Primary user:     Admin
Related workflow: Low-frequency administration
```

**Purpose:** Keep non-daily configuration out of primary operational navigation.

Contains:
- administrative cycle controls;
- hour categories;
- scholarship types/reference info;
- other approved catalogs that do not deserve primary navigation.

Cycle close is a high-consequence dialog with explicit current-cycle summary and confirmation. It never runs automatically.

## States

Default, Loading, Error, Required action, Success.

## Acceptance criteria

- [ ] Closing a cycle requires explicit confirmation.
- [ ] No automatic balance transfer is implied.
- [ ] Low-frequency configuration does not clutter daily work.

---

# View: Tutor Portal

## Overview

```text
Routes:           /tutor
                  /tutor/horario
                  /tutor/horas
Access:           Tutor
Priority:         P0
Primary user:     Tutor
Related workflow: Self-service read-only consultation
```

**Purpose:** Give the tutor direct, understandable access to their own current information.

**User goal:** Know schedule, subjects, current hour status, and history.

**Success condition:** Tutor can answer those questions without asking Admin and cannot mutate administrative data.

## Information hierarchy

### Mi resumen
1. Current hour status.
2. Next assignment.
3. Subjects.
4. Current cycle/scholarship reference if available.

### Mi horario
- Current active/special plan.
- Upcoming assignments.
- Simple week/day view.

### Mis horas
- Balance.
- `Al día` / `Debe horas`.
- Movement history.

## Responsive behavior

Tutor views are fully useful on mobile:
- cards/list on Compact;
- compact table/list on Medium/Wide;
- no admin-only controls rendered.

## States

Default, Loading, Empty, Error, Required action.

Empty examples:
- “No tenés guardias asignadas en el período actual.”
- “Todavía no hay movimientos registrados en este ciclo.”

## Acceptance criteria

- [ ] Tutor can access only their own records.
- [ ] No Admin mutation controls are present.
- [ ] Student consultation identity/contact is never exposed.
- [ ] Mobile layout is first-class for read-only usage.

---

# 4. Shared component specification

## Component: AppSidebar

**Purpose:** Stable product navigation and institutional orientation.

**Variants:** `admin-expanded`, `admin-collapsed`, `mobile-drawer`, `tutor`.

### Anatomy

```text
<AppSidebar>
 ├── BrandLockup
 ├── PrimaryNav
 │    └── NavItem + FaroMarker(active)
 ├── Spacer
 ├── SecondaryNav
 └── AccountEntry
```

**States:** default, hover, focus, active, collapsed.

**Responsive behavior:** persistent on Wide; collapsible on Medium; drawer on Compact.

---

## Component: PageHeader

**Purpose:** Provide page context and one dominant action.

```text
<PageHeader>
 ├── Title + supporting context
 └── PrimaryAction?
```

Do not place more than one primary-styled action in the header.

---

## Component: DataTable

**Purpose:** Planar operational list for tutors, movements, consultations, and reports.

**Capabilities:** sorting/filtering only where the dataset requires them; row actions; empty/loading states; responsive adaptation.

**Rule:** do not introduce a heavy table library until real behavior requires one.

---

## Component: BalanceStatus

**Purpose:** Display a tutor's derived hour state accessibly.

```text
<BalanceStatus>
 ├── SignedDuration
 └── StatusLabel
```

**States:** `current`, `owes-hours`.

Color supports the text; it never replaces the label.

---

## Component: BulkTutorSelector

**Purpose:** Efficiently select multiple tutors for a shared recognized hour movement.

**Capabilities:**
- search;
- select all eligible;
- deselect exceptions;
- selected count;
- keyboard-operable checkbox list.

---

## Component: ScheduleBlock

**Purpose:** Represent one structured schedule assignment.

**Content:** tutor, time, modality/type where applicable.

**States:** default, hover, focus, selected, drag-preview if supported, conflict/error.

**Rule:** block size reflects scheduled duration, not student demand.

---

## Component: StatusBadge

**Purpose:** Compact accessible status for active/inactive, pending/classified, present/absent, etc.

**Rule:** semantic color + text/icon; no color-only meaning.

---

## Component: FilterBar

**Purpose:** Reusable controls directly associated with the dataset below.

**Responsive behavior:** inline on Wide; wrapped on Medium; collapsible sheet/disclosure on Compact when filters become numerous.

---

# 5. Global state matrix

| View / Feature | Reachable States | State Treatment & Recovery Behavior |
|---|---|---|
| Login | Default, Loading, Error, Permission denied | Retry technical failure; access guidance for disabled/unrecognized user |
| Admin Overview | Default, Loading, Empty, Error, Degraded | Preserve usable internal data if one source fails |
| Tutores/Materias | Default, Loading, Empty, Error, Success | Add tutor/catalog guidance; retry failures |
| Horarios | Default, Loading, Empty, Error, Required action | Prompt to create/open required cycle/plan |
| Asistencia | Default, Loading, Empty, Error, Success | Date/plan context preserved after retry |
| Horas | Default, Loading, Empty, Error, Success | Movement form retains valid input after server error where safe |
| Consultas | Default, Loading, Empty, Error, Unavailable, Degraded, Success | Existing canonical data stays usable if Sheets is down |
| Reportes | Default, Loading, Empty, Error, Degraded | Section-level failure where possible rather than whole-page failure |
| Configuración | Default, Loading, Error, Required action, Success | Consequential actions require confirmation |
| Tutor Portal | Default, Loading, Empty, Error, Required action | Clear self-service guidance; no admin recovery actions exposed |

---

# 6. Responsive matrix

| View | Compact Workspace | Medium Workspace | Wide Workspace | Primary Transformation Intent |
|---|---|---|---|---|
| Login | Full-width auth surface | Centered auth surface | Centered auth surface | Reflow |
| Tutores | Structured row cards | Table with collapsed metadata | Full planar table | Replace + Reflow |
| Materias | Disclosure list | Compact table/list | Expandable table | Replace + Reflow |
| Horarios | Day/list editor | Reduced grid | Full week grid | Replace |
| Asistencia | Touch-first occurrence list | List/table hybrid | Compact table/list | Reflow |
| Horas | Balance list + full-screen/sheet transaction | Table + sheet/dialog | Full table + dialog | Reflow |
| Consultas | Stacked filters + rows | Table with collapsed columns | Full table + review sheet | Reflow + Collapse |
| Reportes | Stacked sections | 2-column where useful | Wide report composition | Reflow |
| Tutor Portal | Mobile-first cards/lists | Compact content | Wider read-only workspace | Preserve + Reflow |

---

# 7. Accessibility checklist

- [ ] Semantic headings in logical order.
- [ ] Full keyboard operability.
- [ ] Canonical visible focus treatment on all controls.
- [ ] Compact touch targets meet the canonical minimum.
- [ ] Status indicators include text/icon meaning.
- [ ] Inputs have programmatic labels.
- [ ] Dialogs trap focus and close on Escape when safe.
- [ ] Contrast meets WCAG AA.
- [ ] Drag-and-drop schedule actions have a non-drag alternative.
- [ ] Charts provide accessible textual/table equivalents.
- [ ] Bulk tutor selection supports keyboard interaction and selected-count feedback.

---

# 8. Implementation notes

- UI routes live in Next.js App Router; product rules live in feature/application code.
- Prefer Server Components for data-rendering views.
- Use Client Components only for schedule manipulation, dialogs/sheets, local table/filter interaction, and similar browser behavior.
- Mutations use Server Actions or Route Handlers as thin entry adapters into authorized use cases.
- Do not introduce a separate frontend state architecture for server-owned data without a demonstrated need.
- Zod validates boundary inputs.
- `shadcn/ui` provides primitives, not a visual identity; canonical tokens from `PROJECT-DESIGN.md` override default styling.
- Table library selection is deferred until real sorting/filtering/virtualization requirements justify one.
- Schedule/grid library selection is deferred until the Scheduling implementation phase and must support accessible fallback editing.
- Chart library selection is deferred until Reporting and only after the final indicator set is known.
- Google Sheets integration is server-only and read-only.
- Student contact/identity fields never enter Tutor routes.
