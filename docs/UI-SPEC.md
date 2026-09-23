---
document: UI-SPEC
mode: decision
type: implementation-interface-specification
status: approved
project: SGTA
authority: implementation-ui
inherits_from:
  - DESIGN-STANDARD.md
  - PROJECT-DESIGN.md
---

# SGTA - UI Specification

> Authoritative shared specification for SGTA routes, layout, states, responsive behavior, interaction, and reusable product components.

# AI reading contract

Mode: **decision**.

Rules:

1. `PROJECT-DESIGN.md` owns visual identity and exact tokens.
2. This file owns view composition, component behavior, interactions, reachable states, responsive transformations, and concrete product microcopy. It inherits product language, locale, writing register, regional voice, and terminology from `PROJECT-DESIGN.md`.
3. Do not preserve weaker existing layout decisions merely because code already exists.
4. Implement against real SGTA domain contracts. Do not invent extra business capabilities.
5. Every implemented P0 view includes all reachable loading, empty, error, success, permission, required-action, unavailable, and degraded states that apply.
6. WCAG 2.2 AA is the accessibility baseline.
7. For UI coding, consume this file and `PROJECT-DESIGN.md` as the active design layer.
8. When a real domain constraint forces a UI change, update this document in the same delivery rather than allowing code and specification to diverge.

## 1. Global experience contracts

### 1.1 Product language

User-facing language is Spanish. Product locale, writing register, regional voice, and terminology follow `PROJECT-DESIGN.md`; this document owns concrete view-level microcopy and does not redefine the voice policy.

Technical names remain implementation details.

| Internal concept | Product label |
|---|---|
| `Tutor` | Tutor |
| `HourLedger` | Horas / Crédito de horas |
| `HourMovement` | Movimiento |
| `AttendanceRecord` | Asistencia |
| `Consultation` | Consulta |
| `SchedulePlan` | Horario / Plan de horario |
| `AdministrativeCycle` | Ciclo |
| `SUBJECT` consultation | Materia |
| `GENERAL` consultation | General / Varias |

### 1.2 Admin application shell

Target Wide composition:

```text
+----------------------+------------------------------------------------------+
| Tutorias             |                                                      |
| SGTA                 |  Page title                              Primary CTA  |
|                      |  Current context / supporting text                    |
| Tutores              |                                                      |
| Horarios             +------------------------------------------------------+
| Horas                |                                                      |
| Consultas            |  Main workspace                                      |
| Reportes             |                                                      |
|                      |                                                      |
| Configuración        |                                                      |
| Account              |                                                      |
+----------------------+------------------------------------------------------+
```

Rules:

- The final Admin sidebar is light.
- The brand area links to `/admin`.
- Five primary destinations remain stable: Tutores, Horarios, Horas, Consultas, Reportes.
- Configuración and account controls are secondary.
- Do not add a second persistent top navigation bar.
- The page header belongs to the content region.
- The current dark sidebar is baseline code, not a locked target.

### 1.3 Tutor application shell

Tutor navigation is intentionally smaller:

- `Mi resumen`
- `Mi horario`
- `Mis horas`

Tutor Compact experience is first-class.

### 1.4 Page header

Every primary view starts with a clear page header.

Anatomy:

```text
Page title
Short supporting context or current cycle
                                           Primary action
```

Rules:

- one primary-styled action;
- secondary actions use quiet controls;
- breadcrumb appears only deeper than a primary destination;
- avoid redundant eyebrow text repeated on every page.

### 1.5 Data presentation

Use planar tables and lists for operational comparison.

Rules:

- quiet header;
- strong identity column;
- tabular figures for dates, durations, and balances;
- subtle row separators;
- row hover only when actionable;
- sticky header where volume justifies it;
- row detail opens sheet or page;
- destructive actions remain secondary;
- Compact never shrinks a Wide table until it becomes unreadable.

### 1.6 Forms

Rules:

- visible label for every field;
- placeholder never substitutes for a label;
- helper text only when it resolves ambiguity;
- validate on submit and on blur where it helps recovery;
- server errors appear at form level and field level when attributable;
- preserve valid input after safe retry;
- protect meaningful unsaved edits;
- primary submit remains explicit.

### 1.7 Overlays

Use:

- **side sheet** for editing or inspecting an item while list context matters;
- **dialog** for compact transactions and confirmation;
- **page** when the workflow has multiple major sections;
- **popover** for short contextual choices only.

Compact sheets and dialogs may become full-height or full-screen.

### 1.8 Feedback

Success:

- concise toast or inline confirmation;
- visible resulting state updates immediately.

Error:

- explain what failed;
- identify the affected operation;
- provide a recovery action.

External integration failure:

- never erase already consolidated data;
- degrade only the part that depends on the external source.

### 1.9 Global states

Reachable product states:

- Default / Populated
- Loading
- Empty
- Error
- Success / Confirmation
- Permission denied
- Required action / Blocked
- Unavailable
- Degraded data

Offline-first behavior is not part of the first release.

## 2. Route inventory

| Route | View | Access | Primary purpose | Priority |
|---|---|---|---|---|
| `/login` | Login | Public | Authenticate an enabled SGTA user | P0 |
| `/admin` | Admin overview | Admin | Understand current operational attention | P0 |
| `/admin/tutors` | Tutores | Admin | Manage tutors and academic assignments | P0 |
| `/admin/tutors/subjects` | Materias | Admin | Inspect derived subject coverage | P1 |
| `/admin/schedules` | Horarios | Admin | Manage regular and special schedule plans | P0 |
| `/admin/schedules/attendance` | Asistencia | Admin | Register attendance by duty occurrence | P0 |
| `/admin/hours` | Horas | Admin | Understand balances and register movements | P0 |
| `/admin/hours/movements` | Movimientos | Admin | Inspect and reverse hour history | P0 |
| `/admin/consultations` | Consultas | Admin | Import, review, classify, and inspect consultations | P0 |
| `/admin/reports` | Reportes | Admin | Explore demand and operational indicators | P0 |
| `/admin/settings` | Configuración | Admin | Low-frequency cycle and reference settings | P1 |
| `/tutor` | Mi resumen | Tutor | Understand own current status | P0 |
| `/tutor/schedule` | Mi horario | Tutor | Read own current schedule | P0 |
| `/tutor/hours` | Mis horas | Tutor | Read own balance and movement history | P0 |

## 3. Golden screen set

Before broad feature implementation, visually calibrate these screens using realistic synthetic Spanish data:

1. Login
2. Admin overview
3. Tutores
4. Horas with bulk movement dialog
5. Horarios

Golden Screens are not throwaway mockups. They define the initial live visual contract.

Acceptance requires:

- Wide screenshot review;
- Compact screenshot review where Compact operation exists;
- canonical token use;
- keyboard and focus inspection;
- realistic content;
- no lorem ipsum or fake KPI filler;
- no deliberate visual debt deferred to a later polish phase.

## 4. Shared product components

### Component: AppSidebar

**Purpose:** Stable product navigation and brand orientation.

**Variants:** `admin-expanded`, `admin-rail`, `mobile-drawer`, `tutor`.

**Anatomy:**

```text
Brand
Primary navigation
Spacer
Secondary navigation
Account
```

**Active state:**

- selected surface;
- strong label;
- Faro Beam/marker;
- no layout shift.

**Accessibility:**

- navigation landmark has an accessible label;
- current route exposes `aria-current="page"`;
- icon-only rail items expose names/tooltips;
- drawer returns focus to its trigger after close.

### Component: PageHeader

**Purpose:** Establish page context and dominant action.

Contains:

- title;
- supporting context;
- optional breadcrumb;
- optional dominant action;
- optional quiet secondary actions.

Never render multiple primary-styled actions.

### Component: FilterBar

**Purpose:** Keep filtering connected to the affected dataset.

Wide:

- inline.

Medium:

- wraps while preserving order.

Compact:

- essential control remains visible;
- additional filters move to `Filtros`.

URL-backed state is preferred when shareability or browser history materially benefits.

### Component: DataTable

**Purpose:** Operational comparison.

Add only required behavior:

- sorting;
- search;
- filters;
- row action;
- pagination.

Do not adopt a heavy table framework before real behavior requires it.

### Component: StatusBadge

**Purpose:** Compact semantic status.

Requirements:

- visible text;
- semantic icon or shape when useful;
- meaning never depends on color alone.

### Component: BalanceStatus

**Purpose:** Explain current hour state.

```text
Signed duration
State label
```

Examples:

```text
+02:30
Al día
```

```text
-01:15
Debe horas
```

### Component: BulkTutorSelector

**Purpose:** Select multiple tutors for one shared administrative movement.

Capabilities:

- search;
- select all eligible;
- deselect exceptions;
- visible selected count;
- keyboard-operable checkbox list;
- predictable mixed state.

### Component: ScheduleBlock

**Purpose:** Represent one schedule assignment.

Content:

- tutor display name;
- scheduled time;
- modality/type when useful.

Visual height represents scheduled duration.

States:

- default;
- hover;
- focus;
- selected;
- drag preview if supported;
- conflict/error.

A non-drag editing path always exists.

### Component: FaroEmptyState

**Purpose:** Consistent high-quality empty state.

Contains:

- restrained Faro geometry;
- direct title;
- one sentence;
- one next action when the user can resolve the condition.

## 5. View specifications

### View: Login

#### Overview

```text
Route: /login
Access: Public
Priority: P0
Primary user: Admin / Tutor
Related workflow: Authentication
```

**Purpose:** Authenticate a previously enabled SGTA user with Google.

**User goal:** Enter the correct workspace without creating a public account.

**Success condition:** A valid enabled identity reaches the correct role surface.

#### Information hierarchy

1. Tutorias / SGTA identity.
2. Clear restricted-access explanation.
3. `Continuar con Google`.
4. Recovery guidance for an account without access.

**Primary action:** `Continuar con Google`.

**Secondary actions:** None.

**Destructive actions:** None.

#### Layout

Wide:

```text
+--------------------------------------------------------------+
|                         |                                    |
| Brand identity          |  Sistema de Gestión de Tutorías    |
| Faro mark / beam        |  Acceso para usuarios habilitados  |
| UTN FRRe context        |                                    |
|                         |  [ Continuar con Google ]          |
|                         |                                    |
|                         |  access/help copy                  |
+--------------------------------------------------------------+
```

Medium:

- same two-zone logic with narrower proportions.

Compact:

- single column;
- brand block above the form;
- CTA fills the usable form width.

**Maximum width:** Login content remains intentionally narrower than the application workspace.

#### Data requirements

Required:

- session state;
- OAuth availability;
- enabled SGTA user resolution after callback.

No product data is loaded before authorization succeeds.

#### Interaction: Continue with Google

**Trigger:** primary button.

**Loading:** disable repeated activation and show progress without layout shift.

**Success:** redirect to `/admin` or `/tutor`.

**Failure:** show technical error with `Reintentar`.

**Permission denied:** show `Esta cuenta no está habilitada en SGTA.` and Admin contact guidance.

#### States

| State | Reachable | Treatment |
|---|:---:|---|
| Default | Yes | Brand + primary CTA |
| Loading | Yes | Disabled CTA + compact progress |
| Error | Yes | Technical explanation + retry |
| Permission denied | Yes | Access explanation + administrative recovery |

#### Accessibility

- one `h1`;
- login button has a clear accessible name;
- errors are announced through a live region;
- brand mark is decorative when redundant with visible text;
- focus never lands on non-interactive decorative elements.

#### Microcopy

| Element | Copy |
|---|---|
| Title | Sistema de Gestión de Tutorías |
| Supporting text | Acceso para usuarios habilitados de Tutorias UTN FRRe. |
| CTA | Continuar con Google |
| Permission title | Esta cuenta no está habilitada en SGTA |
| Recovery | Contactar a la administración de Tutorías para solicitar acceso. |

#### Acceptance criteria

- [ ] Admin and Tutor route correctly.
- [ ] Public signup is absent.
- [ ] Technical error and permission denied are distinct.
- [ ] Compact layout remains complete.
- [ ] Keyboard and screen-reader behavior are verified.

### View: Admin overview

#### Overview

```text
Route: /admin
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Daily operational orientation
```

**Purpose:** Show the current operational context and what deserves attention now.

**User goal:** Decide what to act on without manually visiting every module.

**Success condition:** The Admin understands cycle context and pending work in seconds.

#### Information hierarchy

1. current cycle and date/context;
2. action-needed items;
3. today/upcoming duties;
4. concise operational summary;
5. navigation into the relevant workflow.

**Primary action:** None by default.

#### Layout

Wide:

```text
PageHeader
Current cycle context

Necesita atención
+-------------------+ +-------------------+ +-------------------+
| Asistencia        | | Horas             | | Consultas         |
| pendiente         | | saldo negativo    | | por revisar       |
+-------------------+ +-------------------+ +-------------------+

Hoy / Proximamente
operational list

Recent relevant activity or concise summary
```

Medium:

- attention cards wrap;
- today list remains full-width.

Compact:

- action-needed items become stacked rows/cards;
- today remains chronological.

#### Data requirements

- current open cycle;
- pending attendance count/list;
- negative balance count/list;
- consultations requiring review;
- upcoming duty context.

Optional:

- recent relevant administrative activity.

Do not load vanity totals merely because they exist.

#### Pending attendance definition

An occurrence is pending attention when it belongs to the open cycle, its
scheduled end instant is at or before the current time in
`America/Argentina/Buenos_Aires`, and its attendance is `PENDING` or has not yet
received an `AttendanceRecord`. An occurrence for today is not due until its
scheduled end time. Future and in-progress occurrences remain in the Today /
Próximamente list and do not appear in the pending-attendance count.

The count and linked list use the same rule. Recording either `PRESENT` or
`ABSENT` clears the attendance attention item; a separate absence debit decision
does not keep attendance pending. Closed-cycle occurrences are historical and
do not appear as actionable overview items.

The negative-balance count/list uses active Tutors with membership in the open
cycle and a movement-derived signed balance below zero. Zero and positive
balances are not negative; reversal movements participate with their recorded
direction. The consultation-review count is the number of staging records in
`PENDING_REVIEW`, including rows with pending classification; `READY`,
`CONSOLIDATED`, and `DUPLICATE` rows are not in this attention count. A source
outage does not remove locally stored review records.

#### Interactions

Attention item click:

- navigates to the relevant destination with a meaningful filter/context.

External consultation source failure:

- does not block internal attendance/hour/schedule information.

#### States

| State | Reachable | Treatment |
|---|:---:|---|
| Default | Yes | Context + attention + today |
| Loading | Yes | Structural skeletons, not generic spinner-only page |
| Empty attention | Yes | `No hay acciones pendientes.` |
| Error | Yes | Section or page error depending on failure scope |
| Degraded | Yes | Only affected external-dependent section degrades |
| Required action | Yes | If no open cycle, explain prerequisite and link to Configuración |

#### Accessibility

- attention cards are links/buttons with meaningful names;
- section headings form a logical hierarchy;
- counts are paired with labels;
- status does not rely on color.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Inicio |
| Attention section | Necesita atención |
| Empty attention | No hay acciones pendientes. |
| Today section | Hoy |

#### Acceptance criteria

- [ ] No fake KPI cards.
- [ ] Every attention item has a destination.
- [ ] External failure does not blank internal operational data.
- [ ] Required open-cycle state is explicit.
- [ ] Wide and Compact hierarchy remain clear.

### View: Tutores

#### Overview

```text
Route: /admin/tutors
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Tutor and academic administration
```

**Purpose:** Manage tutor records and academic relationships from one canonical workflow.

**User goal:** Add, find, edit, inactivate, reactivate, and understand a tutor quickly.

**Success condition:** Tutor data remains current without creating duplicate subject/coverage sources.

#### Information hierarchy

1. title + `Agregar tutor`;
2. search and filters;
3. tutor list;
4. selected tutor detail/edit;
5. Materias derived subview.

**Primary action:** `Agregar tutor`.

**Secondary actions:** `Editar`, `Ver materias`, `Reactivar`.

**Destructive/consequential action:** `Desactivar tutor`.

#### Layout

Wide:

```text
Tutores                                      [Agregar tutor]
Gestionar perfiles, carrera, materias y estado

[Buscar tutor...] [Carrera] [Estado]

+------------------------------------------------------------------+
| Tutor                  Carrera   Beca    Materias   Estado     ... |
+------------------------------------------------------------------+
| Guillermo Husak        ISI       ...     4          Activo         |
+------------------------------------------------------------------+
```

Medium:

- preserve Tutor, Carrera, Materias, Estado;
- move secondary data to row detail.

Compact:

- structured rows/cards;
- full name remains visually dominant;
- state and career remain visible;
- secondary actions move to an accessible menu.

#### Data requirements

Tutor:

- id;
- first name;
- last name;
- optional preferred display name;
- optional institutional identifier when available;
- primary career;
- status;
- subject assignments;
- cycle membership;
- scholarship reference when available.
- optional provisioned Tutor account email for Admin-only account ownership management;
- account identifiers and session/provider details are never shown in Tutor-facing views.

Formatting:

- use `Apellido, Nombre` in formal table identity;
- optional preferred name may appear as secondary shorthand;
- do not fabricate an alias.

#### Interaction: Add/Edit tutor

Use a side sheet on Wide/Medium.

Sections:

1. Identidad
2. Contexto academico
3. Materias
4. Ciclo y beca
5. Cuenta de acceso
6. Estado

Account linking:

- Admin may enter the normalized email of an existing enabled provisioned Tutor account;
- the empty value clears the current link while preserving the Tutor record and history;
- the interface reports distinct safe errors for unknown, non-Tutor, disabled, or already-linked accounts;
- the UI never accepts or displays an application user identifier, session identifier, or provider token.

Compact:

- full-height sheet or dedicated form page if the form becomes too long.

Validation:

- required names and career;
- duplicate institutional identifier prevented when present;
- subject assignment duplicates prevented.

Success:

- sheet closes or remains open according to action;
- list updates;
- success feedback is concise.

Server error:

- form banner;
- attributable field errors inline;
- valid input preserved.

Unsaved changes:

- confirm before destructive dismiss/navigation.

#### Interaction: Inactivate

- use `Desactivar tutor`;
- show what remains preserved;
- confirm;
- update state without destroying history.

#### Materias subview

Route: `/admin/tutors/subjects`.

Derived from canonical Subject, TutorSubject, and current relevant scheduling facts.

Display:

- Materia;
- tutor(s);
- planned hours in the selected/current schedule context when available.

It is never independently edited as another source of truth.

#### States

| State | Reachable | Treatment |
|---|:---:|---|
| Default | Yes | Search/filter + tutor list |
| Loading | Yes | Table/list skeleton preserving columns |
| Empty | Yes | Faro empty state + `Agregar tutor` |
| Search empty | Yes | Clear filters/search action |
| Error | Yes | Explain load/save failure + retry |
| Success | Yes | Toast/inline update |
| Required action | Yes | Missing academic catalog/cycle prerequisite when applicable |

#### Accessibility

- table headers have semantic scope;
- row action menu has accessible name including tutor identity;
- sheet is named and traps focus;
- deactivation dialog returns focus to the triggering action;
- filter labels remain programmatically associated.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Tutores |
| Description | Gestionar perfiles, carrera, materias y estado. |
| CTA | Agregar tutor |
| Empty title | Todavía no hay tutores |
| Empty action | Agregar tutor |
| Inactivate action | Desactivar tutor |

#### Acceptance criteria

- [ ] Historical tutors are not hard-deleted.
- [ ] Materias is derived, not manually duplicated.
- [ ] Create/edit/inactivate/reactivate works across supported widths.
- [ ] Error and empty states are deliberate.
- [ ] Keyboard and focus behavior are verified.
- [ ] Live view preserves Golden Screen quality.

### View: Horas

#### Overview

```text
Route: /admin/hours
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Hour accounting
```

**Purpose:** Explain current hour status and register traceable individual or bulk movements.

**User goal:** Know who owes hours and record a justified change efficiently.

**Success condition:** Every displayed balance can be explained by movement history.

#### Information hierarchy

1. title + `Registrar movimiento`;
2. filters/search;
3. tutor balance list;
4. selected tutor history;
5. movement transaction dialog.

**Primary action:** `Registrar movimiento`.

**Secondary actions:** `Ver movimientos`, filter, search.

**Consequential action:** reverse a confirmed movement.

#### Layout

Wide:

```text
Horas                                  [Registrar movimiento]
Consultar saldos y registrar movimientos trazables

[Buscar tutor] [Estado] [Categoria]

+-----------------------------------------------------------+
| Tutor                        Saldo        Estado            |
+-----------------------------------------------------------+
| Guillermo Husak              -01:30       Debe horas       |
+-----------------------------------------------------------+
```

Compact:

- each row becomes a structured balance item;
- signed balance remains prominent;
- history opens as page/full-height sheet.

#### Data requirements

Balance row:

- tutor identity;
- current cycle;
- derived signed minutes;
- derived state.

Movement history:

- date;
- category;
- direction;
- duration;
- note;
- origin reference when meaningful;
- Admin actor;
- reversal state.

Formatting:

- display durations as signed `HH:MM`;
- preserve source minutes internally;
- newest movement first by default.

#### Dialog: Registrar movimiento

Fields:

| Field | Type | Required | Rule |
|---|---|:---:|---|
| Tipo de registro | Segmented choice | Yes | `Movimiento` or `Reconocer recuperación` |
| Direccion | Segmented choice | Yes | `Crédito` or `Débito` |
| Categoria | Select | Yes | Active category only |
| Duracion | Hours + minutes | Yes | Total positive minutes |
| Fecha | Date | Yes | Valid administrative date |
| Nota | Text | No | Short explanatory note |
| Tutores | Multi-select | Yes | At least one eligible tutor |

Selection behavior:

- `Seleccionar todos` selects all eligible tutors in the current selection context;
- individual exceptions can be deselected;
- selected count remains visible;
- no hidden selection survives an explicit search/filter reset without clear feedback.
- `Reconocer recuperación` selects the active recovery category and records a
  credit through the same atomic transaction; recovery and activity categories
  cannot be submitted as debits.
- Activity and recovery categories expose their source kind in the selection
  summary and persisted movement history.

Confirmation summary:

```text
Registrar movimiento - Crédito - Reunión de equipo - Reunión - 01:30 - 12 tutores - 14/09/2026
```

Submit label:

`Registrar movimientos`

Success:

- one traceable movement per affected tutor is committed in one atomic transaction;
- balances update only after the whole transaction succeeds;
- success message reports the affected tutor count.

Failure:

- bulk movement creation is atomic;
- all selected tutor movements are created inside one database transaction;
- if any movement cannot be created, none of the selected movements are committed;
- the UI explains that nothing was recorded and preserves the valid transaction input for retry.

#### Movement reversal

Confirmed movement values are not edited in place.

Action:

`Revertir movimiento`

Confirmation explains:

- original movement remains visible;
- reversal will be traceable;
- balance will be recalculated.

#### States

| State | Reachable | Treatment |
|---|:---:|---|
| Default | Yes | Balance list |
| Loading | Yes | Stable rows/skeleton |
| Empty | Yes | No eligible tutors or no movement history |
| Search empty | Yes | Clear filters |
| Error | Yes | Load/transaction recovery |
| Success | Yes | Explicit affected count |
| Required action | Yes | No open cycle or no active categories |

#### Accessibility

- signed value is accompanied by `Al día` / `Debe horas`;
- dialog fields have visible labels;
- tutor checkboxes expose full tutor name;
- select-all mixed state is announced;
- error summary moves focus only when needed;
- reversal confirmation is a named modal with focus return.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Horas |
| Description | Consultar saldos y registrar movimientos trazables. |
| CTA | Registrar movimiento |
| Owes label | Debe horas |
| Current label | Al día |
| Reverse action | Revertir movimiento |

#### Acceptance criteria

- [ ] Balance is never directly editable.
- [ ] Every balance is explainable from movement history.
- [ ] Bulk Select all + deselect exceptions is efficient and accessible.
- [ ] Transaction summary is explicit before submit.
- [ ] Confirmed movements are corrected through traceable reversal, never value overwrite.
- [ ] Compact and Wide flows are complete.

### View: Movimientos

#### Overview

```text
Route: /admin/hours/movements
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Hour movement history and correction
```

**Purpose:** Inspect persisted hour movements independently of the balance list
and correct a confirmed movement without editing its original values.

**Information:**

- cycle, tutor, category, text search, direction, origin, and reversal-state filters;
- date, tutor, category/source, direction, signed duration, note, Admin actor,
  cycle, and activity/recovery origin;
- newest movement first;
- original and reversal rows remain visibly linked in every responsive layout.

**Reversal behavior:**

- `Revertir movimiento` is available only for a confirmed movement in an open cycle;
- confirmation is a named modal explaining that the original remains visible and
  the balance is recalculated from the new opposite movement;
- already reversed rows and reversal rows expose their relationship but no second
  reversal or edit/delete control;
- reversal errors keep the selected movement and confirmation context available for retry.

#### States and accessibility

Default, Loading, Empty, Search empty, Error, Success, and Required action are
explicit. The reversal modal supports visible dismissal, Escape, focus entry,
focus containment, and focus return to the triggering action. Origin and
reversal meaning is expressed with text and relationships, not color alone.

### View: Horarios

#### Overview

```text
Route: /admin/schedules
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Schedule planning
```

**Purpose:** Build regular and special schedule plans without spreadsheet-style manual reformatting.

**User goal:** Create and adjust duty assignments while preserving plan history.

**Success condition:** The selected plan remains coherent, conflicts are explicit, and special periods do not destroy the regular plan.

#### Information hierarchy

1. selected plan and validity context;
2. plan switcher;
3. `Agregar asignación`;
4. schedule workspace;
5. selected assignment detail/edit.

**Primary action:** `Agregar asignación`.

**Secondary action:** `Nuevo plan`.

#### Layout

Wide:

```text
Horarios                               [Agregar asignación]
Planificar guardias regulares y períodos especiales

[Regular - 2do cuatrimestre] [Bienal] [+ Nuevo plan]

        LUN        MAR        MIE        JUE        VIE
08:00   [Tutor A]
09:00   [Tutor A]             [Tutor C]
10:00              [Tutor B]  [Tutor C]
...
```

Medium:

- reduced visible day range or narrower grid;
- plan context remains visible.

Compact:

```text
Plan selector
Date/day selector
Assignment list
[Agregar asignación]
```

Complex week-grid editing is replaced by a day/list editor.

#### Data requirements

Plan:

- id;
- name;
- kind/context;
- validity;
- active status.

Assignment:

- tutor;
- date or recurrence rule;
- start;
- end;
- modality/type when relevant;
- subject context only when scheduling rules require it.

Duty occurrence:

- stable occurrence identity;
- effective date/time;
- tutor;
- source assignment/plan.

#### Interaction: Create/Edit assignment

Use a side sheet or dialog depending on form complexity.

Validation:

- end after start;
- tutor eligible/active for cycle;
- plan validity;
- overlap/conflict rules;
- no impossible recurrence.

Success:

- workspace updates without losing selected plan.

Failure:

- preserve valid values;
- conflict message identifies what conflicts.

#### Drag and resize

Optional progressive enhancement.

If implemented:

- visual preview is immediate;
- mutation is server validated;
- invalid operation returns to last valid position;
- equivalent form edit remains available.

#### Plan rules

For the first release, the scheduling scope is the active AdministrativeCycle for the Tutorias area.

Within that cycle:

- the regular plan remains intact;
- a special plan may become effective only during its validity;
- at most one active special plan may be effective for any calendar date;
- overlapping active special plans are prohibited;
- when no special plan applies to a date, the regular plan is effective.

#### States

| State | Reachable | Treatment |
|---|:---:|---|
| Default | Yes | Selected plan + assignments |
| Loading | Yes | Grid/list skeleton |
| Empty plan | Yes | Create assignment guidance |
| No plan | Yes | `Crear plan` required action |
| Error | Yes | Load/save/conflict recovery |
| Success | Yes | Save confirmation |
| Required action | Yes | No open cycle |
| Conflict | Yes | Inline/overlay explanation tied to assignment |

#### Accessibility

- plan tabs/segmented control use correct semantics;
- every assignment is keyboard reachable;
- drag is never the only edit method;
- schedule block accessible name includes tutor and time;
- selected assignment state is not color-only.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Horarios |
| Description | Planificar guardias regulares y períodos especiales. |
| Primary CTA | Agregar asignación |
| Secondary CTA | Nuevo plan |
| Empty plan | Este horario todavía no tiene asignaciones. |

#### Acceptance criteria

- [ ] Regular and special plans remain independently recoverable.
- [ ] Overlapping active special-plan ambiguity is prevented.
- [ ] Form editing is complete without drag-and-drop.
- [ ] Compact day/list mode is usable.
- [ ] Assignment conflicts explain recovery.
- [ ] UI preserves the Golden Screen quality contract.

### View: Asistencia

#### Overview

```text
Route: /admin/schedules/attendance
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Attendance and absence debit
```

**Purpose:** Record what happened for scheduled duty occurrences quickly.

**User goal:** Mark Present/Falta and, when appropriate, confirm the corresponding absence debit.

**Success condition:** Attendance is recorded and hour balance changes only after explicit administrative confirmation.

#### Information hierarchy

1. date and schedule context;
2. occurrence list;
3. Present/Falta controls;
4. pending debit confirmation.

**Primary action:** row-level attendance actions rather than a page-level CTA.

#### Layout

```text
Asistencia
[Fecha] [Plan/turno context]

Tutor                  Horario       Estado
Guillermo Husak        08:00-10:00  [Presente] [Falta]
...
```

Compact:

- one occurrence per structured row;
- Present/Falta targets remain touch-friendly.

#### Data requirements

- duty occurrence;
- tutor identity;
- scheduled interval;
- current attendance state;
- existing linked hour movement when applicable.
- active hour categories eligible for an absence debit;
- active recovery category and origin context for recovery-marked occurrences.

#### Interaction: Present

- records `PRESENT`;
- does not create an hour movement.

#### Interaction: Falta

- records/sets attendance intent;
- calculates proposed minutes from the occurrence duration;
- requires an explicitly selected active non-recovery hour category for a debit;
- allows recognized debit minutes to be adjusted within the occurrence duration;
- Admin confirms or adjusts recognized debit;
- debit movement is created only after confirmation.

If the debit confirmation is cancelled:

- `ABSENT` remains recorded because Attendance represents what occurred;
- no HourMovement is created;
- the UI makes the absence-without-debit state explicit;
- Admin may create the debit later from the same attendance context when the business decision is made.

For a recovery-marked occurrence, attendance does not create credit implicitly.
The row exposes an explicit `Reconocer recuperación` action, which requires an
active recovery category and shows the linked origin after success.

#### Correction

Attendance correction is explicit and auditable.

If a linked hour movement already exists, the correction flow explains how the movement is reversed/adjusted.

#### States

Default, Loading, Empty, Error, Success, Required action, and the explicit
absence-without-debit state are reachable. Recovery-marked occurrences expose
an explicit recognition action until a recovery origin is linked.

Required action examples:

- no effective schedule for selected date;
- no open cycle.

#### Accessibility

- status controls have full accessible names;
- keyboard action order follows row order;
- confirmation dialog explains tutor, date, duration, and effect.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Asistencia |
| Present | Presente |
| Absent | Falta |
| Debit dialog title | Confirmar débito por inasistencia |
| Absence without debit | Falta registrada sin débito |
| Debit category label | Categoría de horas |
| Recovery action | Reconocer recuperación |

#### Acceptance criteria

- [ ] Present never creates hour credit.
- [ ] Falta never changes balance without confirmation.
- [ ] Correcting attendance remains traceable.
- [ ] Compact interaction is practical for repeated marking.

### View: Consultas

#### Overview

```text
Route: /admin/consultations
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Consultation intake and curation
```

**Purpose:** Import, review, classify, and inspect canonical consultations from the external Google Sheet source.

**User goal:** Keep consultation data current and clean without editing the source Sheet.

**Success condition:** New rows are processed idempotently, ambiguous rows are reviewed, and canonical consultations are reportable.

#### Information hierarchy

1. import status + `Actualizar consultas`;
2. pending review count;
3. filters;
4. consultation list;
5. review/detail sheet.

**Primary action:** `Actualizar consultas`.

#### Layout

```text
Consultas                              [Actualizar consultas]
Última actualización: ...
Pendientes de revisión: ...

[Estado] [Carrera] [Tutor] [Fecha] [Clasificación]

+--------------------------------------------------------------------+
| Fecha   Estudiante   Tutor   Tema   Clasificación   Estado           |
+--------------------------------------------------------------------+
```

Compact:

- student/tutor/date remain visible;
- less important columns move into row detail.

#### Data requirements

Canonical list:

- date;
- student identity;
- career;
- tutor;
- academic stage;
- modality;
- raw topic;
- classification;
- review state.

Student contact:

- visible only to Admin and only where useful.

#### Interaction: Actualizar consultas

Loading:

- inline progress/status;
- disable duplicate concurrent import.

Success summary:

- nuevas;
- ya procesadas;
- requieren revision;
- errores.

Failure:

- existing canonical data remains available;
- action changes to retry state.

#### Review sheet

Show:

- relevant raw source value;
- normalized candidate;
- reason for review;
- explicit Admin decision fields.

Admin may resolve:

- tutor;
- career;
- valid date correction when evidence supports it;
- classification;
- duplicate decision.

Ambiguous values are never silently guessed.

#### Classification

Final canonical state:

- `Materia` with subject;
- `General / Varias`.

Temporary:

- `Pendiente de clasificacion`.

Pending rows are excluded from subject-level metrics.

#### States

| State | Reachable | Treatment |
|---|:---:|---|
| Default | Yes | Canonical list + import status |
| Loading | Yes | Import progress or list skeleton |
| Empty | Yes | No consultations yet + update action |
| Search empty | Yes | Clear filters |
| Error | Yes | Local query/save error + retry |
| Unavailable | Yes | Source unavailable; canonical data remains |
| Degraded | Yes | Import unavailable while history remains usable |
| Success | Yes | Import/review summary |

#### Accessibility

- import progress is announced without stealing focus;
- review reason is not communicated by color only;
- student contact fields are labeled;
- filter controls are keyboard reachable;
- sheet has focus containment and return.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Consultas |
| CTA | Actualizar consultas |
| Pending label | Pendientes de revisión |
| Source unavailable | No se pudo acceder a la fuente de consultas. |
| Retry | Reintentar |

#### Acceptance criteria

- [ ] SGTA never writes to Google Sheets.
- [ ] Reimport is idempotent.
- [ ] Existing canonical data survives source outage.
- [ ] Ambiguity is reviewed, not guessed.
- [ ] Pending classification is excluded from subject metrics.
- [ ] Student contact remains Admin-only.

### View: Reportes

#### Overview

```text
Route: /admin/reports
Access: Admin
Priority: P0
Primary user: Admin
Related workflow: Operational reporting
```

**Purpose:** Answer administrative questions from canonical SGTA data.

**User goal:** Filter a period and understand demand, coverage, attendance, and hour status.

**Success condition:** Reports are derived, explainable, accessible, and do not require manual spreadsheet reconstruction.

#### Information hierarchy

1. global filters;
2. concise useful summary;
3. demand breakdown;
4. coverage and attendance;
5. hour and activity breakdown.

**Primary action:** None by default.

#### Layout

```text
Reportes
[Periodo] [Carrera] [Materia] [Tutor] [Modalidad]

Resumen util

Demanda
[visualization if useful]
[detailed/ranked table]

Cobertura y asistencia

Horas y actividades
```

#### Data requirements

Consultation:

- totals;
- career;
- subject;
- general;
- tutor;
- modality;
- academic stage;
- temporal series.

Operational:

- active tutors;
- subject coverage;
- planned schedule coverage;
- attendance;
- current balance state;
- movements;
- activities.

#### Period and metric definitions

The period is an inclusive range of date-only values. `fromDate` and `toDate`
are serialized as `YYYY-MM-DD` query parameters and must be supplied together.
The maximum range is 366 calendar days, including both endpoints. A reversed,
partial, or overlong range is invalid; the page keeps the submitted values and
explains the error rather than silently widening the query.

The default period is the open AdministrativeCycle from its start date through
the earlier of today and its end date, using the Argentina local date. If today
precedes the cycle start, the default is the cycle start date only. If
cycle-to-date is longer than 366 days, use its most recent 366 days. If there is
no open cycle, the default is the current calendar year from January 1 through
today. Clearing filters removes the query state and restores this default.
Custom periods may cross cycle boundaries. Date-based report sections filter by
their own event date, not by `cycleId`; current-state sections continue to use
the open cycle independently of the selected period.

Date boundaries use `America/Argentina/Buenos_Aires`; stored date-only values
are compared as dates and are not converted through the viewer's browser
timezone. Temporal demand is grouped by calendar month, including partial first
and last months in the selected range.

Consultation demand uses canonical `Consultation` rows whose consultation date
falls in the selected period. Every canonical consultation is classified as
`SUBJECT` or `GENERAL`; `PENDING_CLASSIFICATION` remains in staging/review and
is excluded from every report total and breakdown until consolidation. Subject
totals and rankings include only `SUBJECT` rows; `GENERAL` consultations are
shown separately and are never assigned to a Subject. Career, Tutor, Modality,
academic-stage, and temporal breakdowns include canonical consultations of
either classification. Missing Modality and academic stage are grouped as
`Sin especificar`. Report queries do not call the external source, so a source
outage does not change counts for already consolidated consultations. No
student identity, contact, or raw topic is shown in report data. Selecting a
Subject limits consultation demand to matching `SUBJECT` rows.

Operational measures use these definitions:

- **Tutores activos:** count of Tutor records with active status at query time.
  This is a current-state count and is not constrained by the selected period.
  Career filtering uses each Tutor's current primary Career.
- **Cobertura de materias:** for the open cycle, count active Subjects under
  active Careers that have at least one active Tutor with a current TutorSubject
  relationship and membership in that cycle. The denominator is all active
  Subjects under active Careers. Show covered and total counts; show a
  percentage only when the denominator is nonzero. This is a current-cycle
  snapshot, not a historical coverage reconstruction. When no cycle is open,
  show that coverage is unavailable rather than deriving it from an older
  cycle.
- **Guardias programadas:** count effective planned occurrences and sum their
  scheduled minutes in the selected period, using the effective plan and
  regular/special precedence defined by Horarios for each date. Separate
  ordinary and recovery-marked occurrences by kind. This describes scheduled
  supply; the data model has no required-capacity denominator, so do not label
  it as a percentage of unmet or fulfilled demand.
- **Registro de asistencia:** count `PRESENT`, `ABSENT`, and pending due
  occurrences for the selected period. Attendance status counts and the
  registration rate include due occurrences only; future and not-yet-ended
  occurrences appear only in Guardias programadas. The rate numerator is due
  occurrences marked `PRESENT` or `ABSENT`; the denominator is all due
  occurrences (`PRESENT`, `ABSENT`, and `PENDING`, including an occurrence with
  no attendance row). An occurrence is due at or after its scheduled end time
  in Argentina local time. When the denominator is zero, show counts and omit
  the rate. This is a recording-completion rate, not a presence or performance
  rate.
- **Estado de saldos actual:** count active Tutors with membership in the open
  cycle by the existing derived states: `owes` for a signed balance below zero
  and `current` for zero or a positive balance. Balances are derived from all
  cycle movements, including reversal entries with their recorded direction.
  This snapshot is independent of the selected period and is unavailable when
  there is no open cycle.
- **Movimientos:** group ledger rows by `movementDate`, direction, and category
  for the selected period, showing row counts and minutes by direction. Net
  minutes are credits minus debits across all rows. Keep original and reversal
  rows in the ledger; a reversal offsets the original through its own signed
  movement and is never silently removed.
- **Actividades:** count distinct Activity records and sum their recorded
  duration by `activityDate` and kind in the selected period. Activity duration
  is not multiplied by the number of linked tutor movements.

#### Filter scope

The URL-backed filters are `fromDate`, `toDate`, `careerId`, `subjectId`,
`tutorId`, and `modality`. Academic stage is a consultation breakdown in this
release, not a filter control. The reserved `modality=UNSPECIFIED` value
selects records without a recorded Modality; other Modality values match the
stored value.

Each section identifies when it is a current snapshot and which filters affect
it; unrelated sections are not silently reinterpreted by a filter.

| Report section | Period | Career | Subject | Tutor | Modality | Academic stage |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Consultation demand | Yes | Yes | Yes, `SUBJECT` only | Yes | Yes | Breakdown only |
| Active tutor count | No | Yes | No | Yes | No | No |
| Subject coverage snapshot | No | Yes | Yes | Yes | No | No |
| Planned schedule and attendance | Yes | No | No | Yes | Yes | No |
| Current balance snapshot | No | Yes | No | Yes | No | No |
| Movements and activities | Yes | No | No | Yes | No | No |

Career and Subject are not applied retroactively to schedule, attendance,
movement, or activity history: those records do not preserve historical
Career/Subject assignments. For the active-tutor and balance snapshots, Career
uses the Tutor's current primary Career; subject coverage uses the Career linked
to each Subject. A Tutor filter on Activities selects distinct Activity
records linked to that Tutor's movement; it does not multiply the activity
count or duration. Current balance and coverage sections always name the open
cycle they describe and do not imply that the selected date range changes the
snapshot. A Modality filter includes only matching recorded modalities;
records without a modality are grouped under `Sin especificar` and are included
only when that option is selected.

#### Interaction

Filters:

- apply to the sections listed in Filter scope;
- reset is available and restores the documented default period;
- valid state is URL-backed and survives reload or sharing;
- invalid or incomplete date ranges retain the submitted values and explain
  the correction needed.

Charts:

- added only when they materially improve comprehension;
- accessible value/table equivalent required;
- use restrained SGTA palette;
- no rainbow categories.
- temporal demand uses calendar-month buckets for the selected period.

#### States

Default, Loading, Empty, Error, Degraded.

Degraded:

- if one data source/section fails, unaffected sections remain usable when possible.

#### Accessibility

- charts have accessible title/description and value equivalent;
- filter order is logical;
- data tables remain navigable by keyboard;
- no meaning depends on color.

#### Microcopy

| Element | Copy |
|---|---|
| Page title | Reportes |
| Empty | No hay datos para los filtros seleccionados. |
| Reset filters | Restablecer filtros |

#### Acceptance criteria

- [ ] Every metric derives from canonical data.
- [ ] Period defaults, inclusive date boundaries, supported range, and URL
  parameters are deterministic.
- [ ] Pending attendance is due only after the occurrence end time and never
  includes future or in-progress duties.
- [ ] Coverage, attendance, balance, movement, and activity values follow the
  definitions above; no unsupported coverage or presence rate is implied.
- [ ] Each filter affects only the sections listed in Filter scope.
- [ ] No persisted manual report result becomes a source of truth.
- [ ] No causal academic claim is implied.
- [ ] Charts are justified and accessible.
- [ ] Degraded section behavior is deliberate.

### View: Configuración

#### Overview

```text
Route: /admin/settings
Access: Admin
Priority: P1
Primary user: Admin
Related workflow: Low-frequency administration
```

**Purpose:** Keep low-frequency administrative configuration outside the main operational navigation.

Contains:

- current cycle controls;
- hour categories;
- scholarship reference types;
- validated low-frequency catalogs.

#### Reference data

The low-frequency catalog area is secondary to the current-cycle controls and
does not add a primary navigation destination. It contains separate sections
for:

- Careers, with normalized names, edit, and active/inactive state;
- Subjects, with a required active Career selection, edit, and active/inactive
  state;
- hour categories, with a normalized name, optional activity origin (`Meeting`,
  `Workshop`, `Extraordinary`, or `Recovery`), edit, and active/inactive state;
- scholarship reference types, with optional known required hours and notes.

Each section supports an accessible add/edit form and a responsive list or
table. Inactive values remain visible for historical context, but inactive
Careers cannot be selected for new Subjects and inactive catalog values are not
offered as new Tutor form options. No section offers a hard-delete action.

Scholarship hours and notes are informational reference data only. The UI must
not present a compliance result, certification, or automatic decision from
those fields.

Duplicate normalized names or types and invalid Career/Subject combinations
are reported in the Settings feedback region while the form context remains
preserved, so the Admin can correct the input without losing work. Server
validation remains authoritative.

#### Cycle close

The close action shows:

- current cycle identity;
- consequence that history remains preserved;
- consequence that the next cycle begins with zero hour balance;
- explicit confirmation.

No automatic balance transfer is offered.

#### States

Default, Loading, Error, Required action, Success.

#### Acceptance criteria

- [ ] Low-frequency settings do not clutter primary navigation.
- [ ] Cycle close is explicit and audited.
- [ ] No automatic balance transfer is implied.

### View: Tutor - Mi resumen

#### Overview

```text
Route: /tutor
Access: Tutor
Priority: P0
Primary user: Tutor
Related workflow: Self-service
```

**Purpose:** Answer the tutor's most common questions immediately.

**User goal:** Know current hour status, next duty, and subjects.

**Success condition:** The tutor does not need to ask Admin for routine status.

#### Information hierarchy

1. current signed balance + state;
2. next duty;
3. subjects;
4. current cycle/scholarship reference.

#### Layout

Compact-first:

```text
Mi resumen

Horas
-01:15
Debe horas

Próxima guardia
Martes 16:00 - 18:00

Materias
Algebra
Fisica
...
```

Wide:

- may use a two-column composition while preserving the same hierarchy.

#### States

Default, Loading, Empty, Error, Required action.

#### Accessibility

- signed balance has readable text state;
- schedule time uses clear date/time wording;
- no Admin control is present.

#### Acceptance criteria

- [ ] Only own information is visible.
- [ ] Compact experience is first-class.
- [ ] No student identity/contact appears.

### View: Tutor - Mi horario

#### Overview

```text
Route: /tutor/schedule
Access: Tutor
Priority: P0
Primary user: Tutor
Related workflow: Self-service schedule
```

**Purpose:** Show the tutor's effective current schedule and upcoming assignments.

Compact:

- chronological day/list grouping.

Wide:

- simple week view plus upcoming list.

States:

Default, Loading, Empty, Error, Required action.

Empty copy:

`No hay guardias asignadas en el período actual.`

Acceptance criteria:

- [ ] Effective special-plan context is reflected correctly.
- [ ] No edit action exists.
- [ ] Compact reading is excellent.

### View: Tutor - Mis horas

#### Overview

```text
Route: /tutor/hours
Access: Tutor
Priority: P0
Primary user: Tutor
Related workflow: Self-service hour history
```

**Purpose:** Explain current balance with personal movement history.

Information:

- current cycle;
- signed balance;
- `Al día` / `Debe horas`;
- movement history.

States:

Default, Loading, Empty, Error, Required action.

Empty copy:

`Todavía no hay movimientos registrados en este ciclo.`

Acceptance criteria:

- [ ] Tutor sees only own history.
- [ ] No mutation control exists.
- [ ] Current balance is explainable from displayed history.

## 6. Global state matrix

| View | Reachable states | Recovery behavior |
|---|---|---|
| Login | Default, Loading, Error, Permission denied | Retry technical failure or contact Admin for access |
| Admin overview | Default, Loading, Empty, Error, Degraded, Required action | Internal sections remain usable when one source fails |
| Tutores | Default, Loading, Empty, Search empty, Error, Success, Required action | Add tutor, retry, clear filters, resolve prerequisite |
| Horarios | Default, Loading, Empty, Error, Success, Required action, Conflict | Create/open plan, correct conflict |
| Asistencia | Default, Loading, Empty, Error, Success, Required action | Preserve selected date/context on retry |
| Horas | Default, Loading, Empty, Search empty, Error, Success, Required action | Preserve valid transaction input when safe |
| Consultas | Default, Loading, Empty, Search empty, Error, Unavailable, Degraded, Success | Existing canonical data remains available |
| Reportes | Default, Loading, Empty, Error, Degraded | Prefer section-level degradation |
| Configuración | Default, Loading, Error, Required action, Success | Consequential actions require confirmation |
| Tutor views | Default, Loading, Empty, Error, Required action | Clear read-only guidance |

## 7. Responsive matrix

| View | Compact | Medium | Wide | Intent |
|---|---|---|---|---|
| Login | Single column | Split or centered | Branded split composition | Reflow |
| Admin overview | Stacked | 2-column selected regions | Full operational composition | Reflow |
| Tutores | Structured rows/cards | Reduced table | Full table | Replace + Reflow |
| Materias | Disclosure list | Compact table | Expandable table | Replace + Reflow |
| Horarios | Day/list editor | Reduced multi-day | Full week grid | Replace |
| Asistencia | Touch-first list | Hybrid | Compact table/list | Reflow |
| Horas | Balance list + full-height transaction | Table + sheet/dialog | Full table + dialog | Reflow |
| Consultas | Stacked filters/rows | Reduced table | Full table + review sheet | Reflow + Collapse |
| Reportes | Stacked sections | Mixed columns | Wide composition | Reflow |
| Tutor | Mobile-first | Compact | Wider read-only workspace | Preserve + Reflow |

## 8. Accessibility checklist

- [ ] Semantic headings and landmarks.
- [ ] Skip-to-content support where persistent navigation exists.
- [ ] Full keyboard operation.
- [ ] Visible, unobscured focus.
- [ ] Touch-friendly Compact targets.
- [ ] Status meaning is not color-only.
- [ ] Form fields have visible labels and associated errors.
- [ ] Dialogs have names, focus containment, Escape or visible dismiss behavior, and focus return.
- [ ] Schedule drag-and-drop has a non-drag alternative.
- [ ] Reduced-motion path exists for non-essential motion.
- [ ] Charts expose accessible values or table.
- [ ] Student identity/contact never appears in Tutor routes.

## 9. Implementation notes

- Server Components are the default.
- Client Components are introduced only for real browser interaction.
- Server Actions and Route Handlers are thin authorized entry adapters.
- Zod validates boundary input.
- shadcn/ui is a primitive source, not the product visual identity.
- Do not introduce global client state for server-owned data without demonstrated need.
- Do not select a heavy table, grid, or chart library before the responsible phase proves the requirement.
- Use realistic synthetic fixtures during Golden Screen work.
- Golden Screen fixture data is not a second domain model.
- When live data replaces a fixture, preserve the established visual contract unless a real product constraint requires a documented change.
