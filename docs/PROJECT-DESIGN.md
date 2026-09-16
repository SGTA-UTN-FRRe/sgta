---
document: PROJECT-DESIGN
mode: decision
type: project-design-direction
status: approved
project: SGTA
authority: product-visual-direction
inherits_from: DESIGN-STANDARD.md
---

# SGTA - Design Direction

> Product-specific visual, UX, and interaction direction for the Sistema de Gestion de Tutorias at UTN FRRe.

# AI reading contract

Mode: **decision**.

This document is the shared source of truth for SGTA visual identity and design tokens.

Rules:

1. The target is a high-quality product interface, not a generic admin template.
2. Section 13 is the only canonical registry of exact visual token values.
3. `UI-SPEC.md` inherits visual decisions from this document.
4. Existing code is a baseline to transform, not a reason to preserve weaker visual decisions.
5. Update this document in place when the product direction intentionally changes.
6. If UTN FRRe later provides official brand specifications or production-ready assets, reconcile them here without creating a competing visual source.
7. Do not leave candidate choices or unresolved design options in this document.

## 1. Product context

### 1.1 Product summary

SGTA is the internal operational workspace for Tutorias at UTN FRRe.

It centralizes tutor administration, schedules, attendance, hour accounting, consultation intake, and operational reporting while preserving human administrative judgment and traceability.

The interface must make repeated administrative work feel clear, humane, fast, and contemporary without losing institutional seriousness.

### 1.2 Target users and environment

Primary users:

- **Admin:** works frequently with lists, schedule grids, attendance, hour movements, consultation review, and reports.
- **Tutor:** checks personal schedule, subjects, and hour status occasionally and expects immediate, readable answers.

Environment:

- Admin work is desktop-first.
- Tablet is a meaningful secondary workspace.
- Tutor self-service must be excellent on mobile.
- Admin mobile use supports review and simple actions, not complex schedule editing.
- During migration, the product may coexist with spreadsheets, but it must feel clearly superior to spreadsheet-based operation.

### 1.3 Core workflows

1. Manage tutors, careers, subjects, and cycle context.
2. Build regular and special schedules and register attendance.
3. Understand and modify hour status through traceable movements.
4. Import, review, classify, and report student consultations.
5. Let tutors inspect their own schedule and hour history.

### 1.4 Primary product value and trust

The UI must make three things obvious:

1. what is happening now;
2. what action is available;
3. why a status or balance has the value it has.

Trust is established through:

- explicit data provenance;
- visible current cycle and selected schedule context;
- readable history;
- clear confirmation for consequential actions;
- non-destructive administrative behavior;
- polished loading, empty, error, and degraded states;
- stable navigation and predictable layouts;
- accessible status communication beyond color.

## 2. Visual direction and expression

### 2.1 Aesthetic statement

> **Friendly institutional premium: a bright, confident operational workspace with strong typography, soft geometry, disciplined data presentation, and a distinctive Faro identity.**

The product is predominantly light.

The working surface should feel closer to a modern service product than to legacy university software. Brand expression is visible but controlled. The interface should feel designed for real people doing repeated administrative work, not like a component library preview or a developer dashboard.

### 2.2 Visual expression and density

- **Expression level:** **E1 - Branded Product**
- **Density level:** **D3 - Operational**
- **Rationale:** SGTA contains tables, scheduling, history, filters, and repeated transactions. It needs efficient scanning and comparison, but its users are not expert operators who benefit from extreme density. Brand warmth, readable grouping, and generous page-level rhythm remain important.

### 2.3 Visual tension and spectrum positioning

Anchors:

- clean over expressive;
- moderately soft, never bubbly;
- friendly over technical;
- operational over editorial;
- medium-high density inside data regions;
- spacious hierarchy around data regions.

Positioning statement:

> Strongly friendly and operational, moderately soft, visually restrained, high-confidence, and clearly branded.

Design consequence:

- Use bold hierarchy and generous structural spacing.
- Use compact rows only where comparison benefits from it.
- Let typography, alignment, and whitespace do more work than decorative chrome.
- Use brand color to establish temperature and orientation, not to color every component.
- Avoid heavy dark enterprise shells, tiny gray text, and card grids that reduce usable data area.

### 2.4 Brand personality

- Approachable
- Competent
- Calm
- Warm
- Trustworthy

### 2.5 Tone, voice, and terminology

The SGTA product-copy contract is:

- **Product language:** Spanish.
- **Locale:** `es-AR`.
- **Writing register:** neutral institutional Spanish.
- **Regional voice:** neutral; avoid voseo and colloquial regionalisms.
- **Terminology conventions:** use concrete, established Tutorias terms and direct interface commands; do not expose implementation terminology to users.

The `es-AR` locale is retained for Argentina-specific locale behavior, including appropriate date, number, currency, and similar regional formatting. It does not mean that the interface should imitate everyday Argentine speech.

SGTA is an institutional operational product for Tutorias UTN FRRe. Its copy should be:

- concise;
- clear;
- professional;
- institutional without sounding bureaucratic;
- natural Spanish;
- direct when naming actions;
- calm and actionable in errors and recovery messages.

Avoid:

- voseo;
- Argentine slang;
- deliberately Rioplatense expressions;
- unnecessary second-person pronouns;
- conversational filler;
- exaggerated friendliness;
- literal technical terminology exposed to users.

Prefer action labels that work naturally as neutral interface commands, especially infinitive forms where appropriate:

- `Agregar tutor`
- `Guardar cambios`
- `Registrar movimiento`
- `Marcar asistencia`
- `Actualizar consultas`
- `Crear horario especial`
- `Cerrar ciclo`
- `Reintentar`
- `Cancelar`
- `Confirmar`

For explanatory and recovery copy, prefer neutral constructions such as:

- `No se pudo guardar el registro.`
- `El correo es obligatorio.`
- `Los cambios se guardaron correctamente.`
- `Contactar a la administración de Tutorías para solicitar acceso.`

Avoid variants such as:

- `Guardá los cambios.`
- `Ingresá tu correo.`
- `Podés volver a intentarlo.`
- `Contactá a la administración.`
- `Si necesitás acceso...`
- `¿Querés continuar?`

Do not mechanically rewrite every sentence into an impersonal form if that makes Spanish unnatural. The objective is neutral institutional Spanish, not robotic Spanish.

Avoid user-facing implementation terms:

- ledger;
- staging;
- entity;
- adapter;
- mutation;
- sync job.

Use `Horas` or `Credito de horas` in the product.

Use `Consultas`, not `QR`, as the owned product capability. The QR/Form is an external capture mechanism.

Use `Desactivar tutor`, not `Eliminar tutor`, when history exists.

## 3. Must and must not

### 3.1 Must feel

- Visibly better than a generic admin starter.
- Friendly on first contact and serious during consequential operations.
- Fast to scan.
- Calm even when the page contains a lot of data.
- Consistent across Tutor, Schedule, Hours, Consultation, and Report surfaces.
- Distinctly connected to Tutorias FRRe.
- Premium through typography, spacing, alignment, states, and detail rather than decoration.

### 3.2 Must not feel

- Like Excel with rounded corners.
- Like a dark enterprise control panel.
- Like a generic shadcn demo.
- Like a marketing landing page inside an operations product.
- Like every metric needs a card.
- Like Faro orange is a warning color.
- Like a developer tool.
- Like visual polish was postponed until the end.

## 4. Relationship to the global standard

### 4.1 Adopted directly

- Hierarchy before decoration.
- Accessibility before subtle aesthetics.
- Border-first, shadow-second.
- Neutral-first, not colorless.
- Strong typography and disciplined spacing.
- Semantic colors retain semantic meaning.
- Repeated components remain visually consistent.
- Product screens have one clear dominant action.

### 4.2 Adapted principles

| Global principle | SGTA adaptation | Rationale |
|---|---|---|
| Soft, not bubbly | Friendly radii and roomy controls, while tables and grids remain planar and precise | SGTA needs warmth without losing administrative clarity |
| Neutral-first | White and quiet cool-neutral surfaces dominate, with institutional blue and Faro orange used intentionally | Preserves seriousness while avoiding sterile gray software |
| Brand temperature | Orange acts as a warm beacon and visual signature, not as the primary action or warning color | Keeps the Faro identity recognizable without harming status semantics |
| Operational density | Dense data zones are balanced by generous page headers, section separation, and focused sheets | Makes repeated work efficient without visual fatigue |
| Premium restraint | Visual distinction comes from composition, typography, states, and signature brand moments | Avoids novelty UI that would age quickly |

### 4.3 Intentional deviations

| Global principle | Deviation | Rationale |
|---|---|---|
| None | None | SGTA can reach its desired identity inside the current global standard |

## 5. Selected references and principles

| Reference | Adopt | Reject | SGTA application |
|---|---|---|---|
| Apple | Premium restraint, alignment, confident negative space, careful motion | Marketing-scale whitespace and cinematic product presentation inside the workspace | Page hierarchy, login composition, polished details |
| Wise | Friendly confidence, readable hierarchy, strong brand temperature | Consumer-finance promotional treatments | Warmth, approachable controls, page rhythm |
| Tripadvisor | Strong list scanning, bold hierarchy, approachable geometry | Media-heavy marketplace presentation | Tutor and Consultation list clarity |
| NexHealth | Contemporary operational software that feels humane and trustworthy | Healthcare-specific metaphors and workflow assumptions | Dense admin workflows, forms, state feedback |
| Airbnb | Clear filtering and friendly interaction patterns | Image-first card layouts | Filter rhythm and approachable form behavior |

## 6. Brand and media direction

### 6.1 Product identity

Visible identity:

- `Tutorias UTN FRRe` provides institutional context.
- `SGTA` is the product/system name.

Admin shell:

- use the Faro mark at navigation origin;
- show the full Tutorias label at expanded widths;
- keep SGTA secondary;
- do not force the complete university lockup into every application screen.

Login:

- may use fuller institutional context;
- should feel like a designed entry surface, not a raw OAuth button floating in the center.

Logo rules:

- use an official or production-ready Faro vector asset when available;
- do not distort or recolor official university marks;
- do not recreate the full poster inside the application;
- the colors in this document are the SGTA working palette unless an official brand manual supersedes them.

### 6.2 Imagery role

**Imagery role:** minimal.

Workspace pages do not use decorative photography.

Appropriate visual media:

- official brand marks;
- simple Faro-derived vector geometry;
- product screenshots in documentation;
- charts that answer real questions.

Forbidden:

- stock student photography inside operations;
- faux 3D illustrations;
- generic education clipart;
- glass blobs;
- decorative isometric dashboards;
- unrelated gradient art.

### 6.3 Signature move - Faro Beam

SGTA uses a restrained geometric Faro Beam motif.

It may appear in:

- login;
- empty states;
- active navigation;
- selected schedule plan;
- occasional section orientation.

The motif uses simple bars, lines, or geometric beam shapes.

It must never compete with data.

It is not a semantic status indicator.

## 7. Visual system

### 7.1 Color strategy

- Light-first canvas.
- White operational surfaces.
- Institutional navy for primary text and structural confidence.
- Institutional blue for primary actions, links, selected controls, and focus.
- Faro orange for brand warmth and orientation.
- Quiet blue and warm-tint surfaces provide soft emphasis without relying on shadow.
- Semantic success, warning, danger, and information colors remain independent from brand orange.

The final application shell is light.

A full-height dark sidebar is not the target.

Dark navy may appear in compact brand moments, login composition, or high-contrast identity areas.

### 7.2 Typography strategy

Use one modern rounded-geometric family with enough seriousness for operations.

The target family is Manrope.

Rules:

- page titles are confident and compact;
- section headings remain clearly subordinate;
- table/body typography is quieter;
- operational numbers use tabular figures;
- uppercase is reserved for small metadata, never primary navigation;
- avoid tiny muted text as a default information style.

### 7.3 Geometry

Shape character: balanced-soft.

- compact controls remain precise;
- cards and panels have more generosity than controls;
- sheets and dialogs have the softest containment;
- pill geometry is reserved for statuses, filters, and compact segmented controls.

### 7.4 Iconography

Use Lucide as the default icon family.

Rules:

- consistent outline style;
- consistent optical size;
- icons normally accompany labels;
- icon-only actions require accessible names and tooltip support when meaning is not universal;
- do not mix icon families unless an official brand mark requires it.

### 7.5 Accessibility baseline

Baseline: **WCAG 2.2 AA**.

Product requirements:

- normal text color pairs meet 4.5:1;
- large text meets 3:1;
- meaningful UI graphics/components meet 3:1;
- primary button text meets AA;
- focus remains visible and is not hidden by sticky UI;
- all workflows are keyboard operable;
- status meaning never depends on color alone;
- form errors are associated with controls and explain recovery;
- dialogs receive an accessible name, focus entry, containment, Escape or visible dismiss behavior, and focus return;
- schedule drag-and-drop always has a non-drag alternative;
- non-essential motion respects reduced-motion preferences;
- compact touch interfaces use comfortable touch targets.

Verified canonical contrast examples:

| Pair | Approx. ratio | Result |
|---|---:|---|
| `foreground` on `surface` | 12.75:1 | Pass |
| `foreground-muted` on `surface` | 4.76:1 | Pass |
| `foreground-muted` on `canvas` | 4.51:1 | Pass |
| `primary-foreground` on `primary` | 5.36:1 | Pass |
| `primary-foreground` on `primary-hover` | 6.81:1 | Pass |

## 8. Layout and density

### 8.1 Information density

Density is operational but not expert-dense.

Page level:

- spacious;
- strong title/context;
- one dominant action;
- clear section boundaries.

Data level:

- compact enough for comparison;
- no unnecessary wrapper cards;
- visible row rhythm;
- sticky table headers where useful;
- filters stay physically close to their dataset.

### 8.2 Workspace principles

Admin desktop:

- persistent light sidebar;
- main content surface;
- no redundant persistent top bar consuming vertical space;
- account/help controls remain quiet and accessible;
- page header belongs to page content;
- wide data and schedule views can use nearly the full workspace.

Tutor:

- lighter navigation;
- simpler information architecture;
- mobile-first readability.

## 9. Surfaces and key components

### 9.1 Surfaces and cards

Cards are used when content is a meaningful unit.

Do not card-wrap:

- every table;
- every filter;
- every section;
- every metric.

Summary cards are allowed when they communicate a current operational condition or direct next action.

### 9.2 Tables and lists

Tables are a primary SGTA pattern.

Rules:

- strong first column;
- quiet header;
- subtle row separators;
- consistent numeric alignment;
- explicit hover only when the row is actionable;
- sticky header for long operational lists where useful;
- row actions remain secondary;
- mobile does not simply shrink a desktop table until unreadable.

### 9.3 Controls

Primary actions:

- one clear primary action per view;
- strong blue treatment;
- readable label;
- predictable position.

Secondary actions:

- neutral surface or text treatment.

Destructive actions:

- semantic danger only;
- never use Faro orange.

Inputs:

- visible border;
- strong focus;
- labels always present for forms;
- placeholder never replaces a label.

### 9.4 Overlays

Use:

- side sheets for contextual editing while list context matters;
- dialogs for compact transactions and confirmation;
- full pages for complex multi-section workflows;
- popovers for small option sets only.

Bulk hour registration uses a dedicated dialog or sheet with a confirmation summary.

## 10. Responsive architecture

### 10.1 Compact workspace

- Admin navigation becomes a drawer.
- Tutor navigation becomes a compact header/navigation pattern.
- Data tables reflow to structured rows when comparison remains clear.
- Horizontal scrolling is reserved for relationships that must remain tabular.
- Schedule uses day/list mode for editing.
- Sheets become full-height or full-screen when necessary.
- Primary actions remain reachable without excessive scrolling.

### 10.2 Medium workspace

- Sidebar becomes a compact rail or collapsible navigation.
- Tables preserve the most valuable columns and move secondary details to expansion.
- Schedule can show reduced multi-day context.
- Detail sheets remain contextual.

### 10.3 Wide workspace

- Expanded persistent sidebar.
- Full operational tables.
- Wide schedule grid.
- Side-by-side list and detail where it improves throughput.
- Reports may use multi-column compositions when hierarchy remains obvious.

## 11. Motion and transitions

### 11.1 Motion character

Motion is fast, tactile, and orienting.

It confirms spatial relationships and state.

It is never the main visual attraction.

### 11.2 Allowed

- quick hover/focus transitions;
- short sheet/dialog transitions;
- restrained disclosure expansion;
- tab or segmented-control state transitions;
- schedule drag preview when supported.

### 11.3 Forbidden

- bouncy springs;
- parallax;
- animated gradients;
- decorative counter animation;
- slow card lift;
- layout-shifting tab transitions;
- perpetual loading animation when a simpler progress state is clearer.

## 12. Explicit anti-patterns

- Full-height dark enterprise sidebar as the final visual identity.
- Generic shadcn demo styling left uncustomized.
- Glassmorphism.
- Neon/glow effects.
- Decorative gradients.
- Huge KPI cards with little decision value.
- Rainbow charts.
- Low-contrast muted text.
- Orange used as warning or danger.
- Color-only balance or attendance state.
- Tiny icon-only row actions without names or tooltips.
- Separate manually maintained subject coverage data.
- A standalone QR module duplicating Consultation Intake.
- Hiding important Admin actions inside overflow menus.
- Creating a late polish phase to repair visually weak implemented screens.

## 13. Canonical token registry

This section is the only canonical registry of exact visual values for SGTA.

### 13.1 CSS custom properties

```css
:root {
  /* Brand */
  --brand-navy: #233251;
  --brand-blue: #0E6EB5;
  --brand-orange: #F09110;

  /* Canvas and surfaces */
  --canvas: #F7F9FB;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --surface-subtle: #F1F5F8;
  --surface-blue: #EAF4FB;
  --surface-warm: #FFF4E3;

  /* Foreground */
  --foreground: #233251;
  --foreground-secondary: #526176;
  --foreground-muted: #64748B;
  --foreground-on-dark: #FFFFFF;

  /* Borders */
  --border-subtle: #E8EEF3;
  --border: #D7E1E9;
  --border-strong: #A9BAC8;

  /* Actions */
  --primary: #0E6EB5;
  --primary-hover: #0B5E9A;
  --primary-foreground: #FFFFFF;
  --secondary: #EEF3F7;
  --secondary-hover: #E3EBF1;
  --secondary-foreground: #233251;
  --accent: #F09110;
  --accent-hover: #D97E08;
  --accent-foreground: #4F3200;
  --accent-surface: #FFF4E3;

  /* Navigation */
  --nav-background: #FFFFFF;
  --nav-foreground: #233251;
  --nav-muted: #64748B;
  --nav-hover: #F1F6FA;
  --nav-active: #EAF4FB;
  --nav-active-foreground: #0B5E9A;
  --nav-active-marker: #F09110;

  /* Semantic */
  --success: #18794E;
  --success-surface: #ECF8F2;
  --warning: #946200;
  --warning-surface: #FFF7E6;
  --danger: #B42318;
  --danger-surface: #FFF0EE;
  --info: #0E6EB5;
  --info-surface: #EAF4FB;

  /* Typography */
  --font-sans: "Manrope", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-display: var(--font-sans);
  --font-numeric: var(--font-sans);

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-display: 2.5rem;

  --leading-tight: 1.18;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;
  --spacing-2xl: 2rem;
  --spacing-3xl: 3rem;

  /* Geometry */
  --radius-sm: 0.625rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.125rem;
  --radius-xl: 1.5rem;
  --radius-pill: 9999px;

  /* Controls */
  --control-height-sm: 2.25rem;
  --control-height-md: 2.5rem;
  --control-height-lg: 2.75rem;
  --touch-target: 2.75rem;

  /* Layout */
  --max-width: 96rem;
  --sidebar-width: 15.25rem;
  --sidebar-width-collapsed: 4.5rem;
  --gutter-desktop: 2rem;
  --gutter-tablet: 1.5rem;
  --gutter-mobile: 1rem;

  /* Focus */
  --focus-ring-color: rgb(14 110 181 / 0.32);
  --focus-ring: 0 0 0 3px var(--focus-ring-color);

  /* Motion */
  --motion-fast: 120ms cubic-bezier(0.2, 0, 0, 1);
  --motion-normal: 180ms cubic-bezier(0.2, 0, 0, 1);
  --motion-slow: 240ms cubic-bezier(0.2, 0, 0, 1);

  /* Elevation */
  --shadow-xs: 0 1px 2px rgb(35 50 81 / 0.05);
  --shadow-sm: 0 3px 10px rgb(35 50 81 / 0.07);
  --shadow-hover: 0 6px 18px rgb(35 50 81 / 0.09);
  --shadow-raised: 0 16px 38px rgb(35 50 81 / 0.13);
  --shadow-dialog: 0 24px 60px rgb(35 50 81 / 0.18);
}
```

### 13.2 Breakpoints

| Token | Min width | Workspace | Primary adaptation |
|---|---:|---|---|
| `sm` | `640px` | Large compact | Improved compact spacing and form width |
| `md` | `768px` | Medium | Navigation rail/collapse and partial table preservation |
| `lg` | `1024px` | Wide | Persistent expanded workspace navigation and full tables |
| `xl` | `1440px` | Wide large | Expanded gutters and full schedule/report canvas |

## 14. Design audit checklist

- [x] The target does not resemble a generic admin starter.
- [x] E1 and D3 are the selected expression and density targets.
- [x] Section 13 is the only exact token registry.
- [x] Canonical core text and primary action contrast meet WCAG 2.2 AA.
- [x] Controls, cards, and dialogs have a defined radius hierarchy.
- [x] Data regions remain operationally efficient.
- [x] The final application shell is light and institutionally friendly.
- [x] Faro Beam is a restrained product signature.
- [x] Responsive behavior is defined for Compact, Medium, and Wide.
- [x] No unresolved visual alternatives remain.
