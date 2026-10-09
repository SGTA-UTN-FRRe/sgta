---
status: draft
---

# UI Specification

This document owns view structure and behavior. Inherit visual decisions, tokens, and Voice from [PROJECT-DESIGN.md](PROJECT-DESIGN.md); specify only states the product can actually reach. Compact, Medium, and Wide are the layout modes defined in PROJECT-DESIGN › Breakpoints and layout modes.

Implement against real SGTA domain contracts and do not invent business capabilities. When a real domain constraint forces a UI change, update this document in the same delivery so code and specification do not diverge.

## Global interface rules

| Concern | Rule |
| --- | --- |
| Application shell | Admin: a light sidebar with the brand at the top linking to `/admin`, primary navigation, a spacer, secondary navigation, and account. Wide shows the expanded sidebar (`w-sidebar`); Medium shows the icon rail (`w-sidebar-rail`) with a tooltip and accessible name on every item; Compact shows a top bar with the brand and a menu trigger that opens the same navigation in a left `Sheet`. Admin has no second persistent top navigation bar. Tutor: a top bar with the brand left, the navigation pills `Mi resumen`, `Mi horario`, and `Mis horas` in the center, and an account `DropdownMenu` right; in Compact the pills move to a full-width second row of three equal segments. A skip link to the main content is the first focusable element in both shells. The page header belongs to the content region, not the shell. |
| Navigation | Admin primary destinations, in order: `Inicio`, `Tutores`, `Horarios`, `Horas`, `Consultas`, `Reportes`; `Configuración` and account controls are secondary. `Inicio` targets `/admin` with exact path matching; child routes select their own destination. The active item is an ink pill with strong label and no layout shift; in the Admin sidebar it also carries the Faro Beam. The selected destination exposes `aria-current="page"`; the brand returns home without taking `aria-current`. `/` redirects to the signed-in role's home. The Compact navigation sheet returns focus to its trigger when closed, and after a route change focus moves to the new page heading once loading finishes. |
| Account | The Admin sidebar shows the display name and role, followed by an always-visible `Cerrar sesión` button with a 44px minimum target: icon and label in Wide and in the Compact sheet (as its last focusable element), the `LogOut` icon with `aria-label="Cerrar sesión"` and a matching tooltip in the Medium rail. The Tutor account menu shows the display name and role and ends with `Cerrar sesión`. While the request is pending the action is disabled and reads `Cerrando sesión…`. Failure announces `No se pudo cerrar la sesión. Intentar nuevamente.` in an inline alert next to the action, keeps the user on the page, and allows retry; the Medium rail places the alert beside the action so the full message stays readable. Success ends the session and returns to `/login`. |
| Page container | Content is left-aligned inside `max-w-page` with `px-4` in Compact, `px-6` in Medium, and `px-8` in Wide. Login and the system pages center a narrower column. |
| Spacing | Page header, then sections in reading order separated by `gap-6` (`gap-4` in Compact). Data regions use `p-4` (`p-3` in Compact); related controls use `gap-2`. |
| Surfaces | White panels sit at one level on the canvas and never nest. Group content inside a panel with headings and dividers. Empty content gets no panel. |
| Page header | Every primary view starts with a page header: the title as the page `h1`, one line of supporting context or the current cycle, at most one primary-styled action, and optional quiet secondary actions. A breadcrumb appears only below a primary destination. No repeated eyebrow text above titles. |
| Data presentation | Planar tables and lists for operational comparison: quiet header with semantic `scope`, a strong identity column, `tabular-nums` for dates, durations, and balances, subtle row separators, and rows of `h-row` (44px). Row hover appears only when the row is actionable; the header is sticky where volume justifies it. Row actions are inline; important Admin actions are never hidden in overflow menus. Compact may group secondary row actions in a named menu whose accessible name includes the row identity. Row detail opens a sheet or a page. Destructive actions stay secondary. Compact replaces a wide table with a priority list instead of shrinking it until it becomes unreadable. Add sorting, search, filters, and pagination only when the view needs them, without a heavy table framework. |
| Filters | Filters sit directly above the dataset they affect, inline in Wide and wrapping in Medium while preserving order. In Compact the essential control stays visible and the rest move to a `Filtros` sheet. Filter state is URL-backed when shareability or browser history materially benefits. A search or filter with no results offers a way to clear it. |
| Forms | Every field has a visible, programmatically associated label; placeholders never replace labels; helper text appears only when it resolves ambiguity. Validate on submit and on blur where it helps recovery. Server errors appear at form level and, when attributable, on the field. Valid input is preserved after a safe retry. Meaningful unsaved edits require confirmation before dismissal or navigation. The submit action stays explicit. Forms are one column in Compact. |
| Overlays | `Sheet` (right side) to edit or inspect an item while the list context matters; `Dialog` for compact transactions; `AlertDialog` (the shared confirmation dialog) for consequential confirmations; a page when the workflow has several major sections; `Popover` only for short contextual choices. In Compact, sheets and dialogs become full height. Every overlay has a name, focus entry and containment, Escape and visible dismissal, and returns focus to its trigger. |
| Career color | A career-colored element uses the career's palette fill and shows the career abbreviation; the full career name appears in its accessible name, the legend, and tooltips. Career colors identify careers only and never express status. Two careers may share a color; the abbreviation distinguishes them. |
| Feedback | Success: a concise toast or inline confirmation, and the resulting state updates immediately. Errors explain what failed, identify the affected operation, and provide a recovery action; field errors stay on the form. Persistent conditions use an inline notice at the top of the affected region. An external integration failure never erases consolidated data and degrades only the part that depends on the external source. Status uses the shared status badge: visible text, a dot and icon, never color alone. Durations use the shared duration format from PROJECT-DESIGN › Visual rules. |
| Accessibility | WCAG 2.2 AA. Semantic headings and landmarks; full keyboard operation; visible, unobscured focus; 44px touch targets in Compact; status and selection never depend on color alone; form errors associated with their fields; reduced-motion paths for non-essential motion; charts expose an accessible value or table equivalent; any drag interaction has a non-drag alternative. Student identity and contact never appear in Tutor routes. |
| Data and state | Server Components by default; Client Components only for real browser interaction. Server Actions and Route Handlers are thin authorized adapters that validate input. No global client state for server-owned data without demonstrated need. Do not adopt a heavy table, grid, or chart library before a view proves the requirement. Offline-first behavior is not part of the first release. |

## System states

| State | Presentation and behavior |
| --- | --- |
| Default / populated | The view's content in its specified order with its available actions. |
| Loading | Route navigation in Admin and Tutor shows a structural skeleton with a page-header placeholder and content blocks, announced as `Cargando sección` with `role="status"` and `aria-busy="true"`; every route segment has a loading boundary so nested navigation also shows feedback. A view may replace it with a view-specific skeleton that preserves its regions. In-place operations disable repeated activation and show progress without layout shift. |
| Empty | A compact empty state inside the affected region: a direct title, one sentence on what is absent, and one next action when the user can resolve it. No panel around it and no illustration; the only illustration in the product is on Login. Search and filter empties offer a way to clear the search or filters. |
| Error | Unexpected segment failures keep the role navigation visible and show `No se pudo cargar esta sección` with `Intentar nuevamente. Si el problema continúa, avisar a la administración.`; `Reintentar` re-fetches and re-renders the segment, and the secondary `Volver al inicio` link returns to the role's home. Error messages and diagnostic identifiers are never rendered. View-level load and save errors follow Feedback and preserve valid input. |
| Not found | Unmatched URLs show `No encontramos esa página` with `Verificar la dirección o volver al inicio.` and a `Volver al inicio` link to `/`, which keeps role-aware home routing. |
| Permission denied | `/forbidden` shows `Acceso restringido`, the title `Esta cuenta no tiene permisos para esta sección`, the text `La cuenta está habilitada en SGTA, pero necesita otro nivel de acceso para continuar.`, a `Volver al inicio` action, and an outline `Cerrar sesión` beside it. |
| Required action / blocked | When a prerequisite is missing (for example no open cycle), the view explains the prerequisite in an inline notice and links to where it is resolved, usually Configuración. |
| Success / confirmation | Follows Feedback; consequential operations confirm first in the shared confirmation dialog. |
| Unavailable / degraded | When an external source fails, already consolidated data stays usable and only the dependent section shows the failure with a retry. |

## Route inventory

| Route | View | Access | Primary purpose | README screenshot |
| --- | --- | --- | --- | --- |
| `/login` | [Login](ui-spec/login.md) | Public | Authenticate an enabled SGTA user | `docs/screenshots/login.png` |
| `/admin` | [Admin overview](ui-spec/admin-overview.md) | Admin | Understand current operational attention | `docs/screenshots/admin-overview.png` |
| `/admin/tutors` | [Tutores](ui-spec/tutors.md) | Admin | Manage tutors and academic assignments | None |
| `/admin/tutors/subjects` | [Materias](ui-spec/subjects.md) | Admin | Inspect derived subject coverage | None |
| `/admin/schedules` | [Horarios](ui-spec/schedules.md) | Admin | Manage regular and special schedule plans | `docs/screenshots/schedules.png` |
| `/admin/hours` | [Horas](ui-spec/hours.md) | Admin | Understand balances and register movements | `docs/screenshots/hours.png` |
| `/admin/hours/movements` | [Movimientos](ui-spec/movements.md) | Admin | Inspect and reverse hour history | None |
| `/admin/consultations` | [Consultas](ui-spec/consultations.md) | Admin | Import, review, classify, and inspect consultations | None |
| `/admin/reports` | [Reportes](ui-spec/reports.md) | Admin | Explore demand and operational indicators | None |
| `/admin/settings` | [Configuración](ui-spec/settings.md) | Admin | Low-frequency cycle and reference settings | None |
| `/tutor` | [Mi resumen](ui-spec/tutor-summary.md) | Tutor | Understand own current status | `docs/screenshots/tutor-summary.png` |
| `/tutor/schedule` | [Mi horario](ui-spec/tutor-schedule.md) | Tutor | Read own current schedule | None |
| `/tutor/hours` | [Mis horas](ui-spec/tutor-hours.md) | Tutor | Read own balance and movement history | None |
| `/forbidden` | Permission denied ([System states](#system-states)) | Signed in | Explain a missing access level | None |

The README screenshot column lists only views shown in README. When a listed view changes, regenerate its screenshot with the project's Screenshots command in the same change.

`/design-preview` is a development-only page that renders the PROJECT-DESIGN registry; it is not a product view and is unavailable in production.

## Views

View details live in `design/ui-spec/`:

- [Login](ui-spec/login.md)
- [Admin overview](ui-spec/admin-overview.md)
- [Tutores](ui-spec/tutors.md)
- [Materias](ui-spec/subjects.md)
- [Horarios](ui-spec/schedules.md) — the reference screen for the design system
- [Horas](ui-spec/hours.md)
- [Movimientos](ui-spec/movements.md)
- [Consultas](ui-spec/consultations.md)
- [Reportes](ui-spec/reports.md)
- [Configuración](ui-spec/settings.md)
- [Mi resumen](ui-spec/tutor-summary.md)
- [Mi horario](ui-spec/tutor-schedule.md)
- [Mis horas](ui-spec/tutor-hours.md)
