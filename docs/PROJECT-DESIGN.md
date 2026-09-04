---
document: PROJECT-DESIGN
mode: decision
type: project-design-direction
status: approved-baseline
project: SGTA
authority: product-visual-direction
inherits_from: DESIGN-STANDARD.md
---

# SGTA — Design Direction

> Product-specific visual, UX, and interaction direction for the Sistema de Gestión de Tutorías de UTN FRRe.

# AI READING CONTRACT

Mode: **decision**. This document is the authoritative source of truth for SGTA visual identity and design tokens.

Rules:
1. Establish concrete visual identity and design tokens tailored to SGTA.
2. Section 13 is the single canonical token registry; never duplicate exact token values elsewhere.
3. `UI-SPEC.md` inherits all visual decisions from this document.
4. The supplied Tutorías FRRe artwork is the working visual reference. Its sampled colors are treated as a product palette, not as an official institutional brand manual.
5. If the institution later provides official vector assets or brand specifications, update this document in place rather than creating competing design sources.

---

## 1. Product Context

### 1.1 Product Summary

SGTA is an internal administrative application for managing tutors, schedules, attendance, hour balances, consultation intake, and operational reporting for the Área de Tutorías de UTN FRRe.

The product must reduce spreadsheet-driven work while preserving human administrative judgment, traceability, and a clear institutional character.

### 1.2 Target Users & Environment

**Primary users**
- **Admin:** staff responsible for tutors, schedules, attendance, hour movements, consultation review, and reports.
- **Tutor:** authenticated user with read-only access to their own schedule, subjects, hour status, and history.

**Usage environment**
- Desktop/laptop is the primary administrative workspace.
- Tablet is a supported secondary workspace.
- Mobile is supported for consultation and quick checks, not as the preferred surface for complex schedule editing.
- The application may be used repeatedly during a workday, often alongside institutional tools and spreadsheets during migration.

**Mental model**
- Admin users think in people, schedules, attendance, hours, and consultations—not in technical entities.
- Tutor users need direct answers: what is my schedule, what subjects are associated with me, and what is my current hour status?

### 1.3 Core Workflows

1. **Manage daily operation:** maintain tutors and subjects, create schedule plans, assign duty blocks, and register attendance.
2. **Maintain hour accountability:** inspect balances, register individual or bulk credit/debit movements, and record recoveries or activities.
3. **Consolidate consultation data:** import new Google Sheets rows, review anomalies, classify consultations, and use the canonical data in reports.
4. **Tutor self-service:** allow a tutor to inspect their own current schedule, hour balance, and movement history without administrative intervention.

### 1.4 Primary Product Value & Trust

The interface must make it obvious that **every important administrative result can be explained from recorded facts**.

Trust is established through:
- visible context and current cycle;
- explicit status labels rather than color-only meaning;
- clear confirmation for consequential actions;
- non-destructive history;
- readable tables and predictable navigation;
- restrained use of institutional color;
- no fake metrics or decorative dashboards.

---

## 2. Visual Direction & Expression

### 2.1 Aesthetic Statement

> **A calm, friendly institutional workspace: modern and approachable without becoming playful, branded without becoming promotional, and operational without feeling like legacy administration software.**

The visual base is light and clean. Deep midnight navy (`#0B172E` - `#101F3D`) provides institutional gravity, vibrant beacon blue (`#0284C7`) drives primary interaction, and warm faro amber (`#F59E0B`) acts as an orienting beacon accent inspired by the Tutorías “faro” identity.

### 2.2 Visual Expression & Density

- **Expression level:** **E1 — Branded Product**
- **Density level:** **D3 — Operational**
- **Rationale:** SGTA contains tables, schedules, filters, status values, and repetitive administrative actions. It needs operational density, but the modest scale and non-expert user base require generous grouping, readable hierarchy, and friendly controls rather than an expert-dense interface.

### 2.3 Visual Tension & Spectrum Positioning

- **Positioning statement:** Clean, moderately soft, clearly friendly, strongly operational, and medium-high density.
- **Design consequence:** Use strong hierarchy, rounded but controlled geometry, planar tables, clear spacing, and a restrained brand palette. Avoid both sterile developer-tool aesthetics and oversized consumer-style cards that reduce information efficiency.

### 2.4 Brand Personality Traits

- **Approachable**
- **Trustworthy**
- **Calm**
- **Organized**
- **Contemporary**

### 2.5 Tone, Voice & Terminology

Interface copy is written in clear Spanish and uses the vocabulary of Tutorías.

Rules:
- Prefer direct labels: **Agregar tutor**, **Registrar movimiento**, **Marcar asistencia**, **Actualizar consultas**, **Cerrar ciclo**.
- Avoid technical implementation terms such as “ledger”, “staging”, “entity”, or “sync job” in user-facing copy.
- Use **Horas** or **Crédito de horas** in the UI; internal code may retain `hour-ledger`.
- Use **Consultas**, not **QR**, as the product module name. The QR/Form is an external capture mechanism; SGTA manages the resulting consultations.
- Use **Desactivar tutor**, not **Eliminar tutor**, when history exists.
- Error messages explain what happened and the next recovery action.
- Empty states should be short and useful, never celebratory or cute.

---

## 3. Must / Must-Not

### 3.1 Must Feel

- Friendly without looking childish.
- Modern without resembling a startup marketing dashboard.
- Institutional without looking bureaucratic or dated.
- Structured and predictable during repetitive work.
- Visually connected to Tutorías FRRe without reproducing the flyer aesthetic inside every screen.
- Fast to scan, with clear primary actions and restrained secondary actions.

### 3.2 Must Not Feel

- Like an “Excel with a web skin”.
- Like a generic admin template with random blue cards.
- Like a cold developer tool or dark enterprise control panel.
- Overdecorated with gradients, glass, huge metrics, excessive shadows, or illustrations.
- Dependent on orange/green/red alone to communicate state.
- Dense to the point that labels, actions, or row relationships become ambiguous.

---

## 4. Relationship to Global Standard

### 4.1 Adopted Directly

- Hierarchy before decoration.
- Border-first, shadow-second.
- Reserve emphasis for important actions and states.
- Accessibility takes precedence over visual subtlety.
- Neutral-first surfaces with purposeful brand color.
- Reuse a small number of strong patterns rather than producing unique card layouts per screen.

### 4.2 Adapted Principles

| Global Principle | Product Adaptation | Rationale |
|---|---|---|
| Soft, not bubbly | Rounded controls and panels remain restrained; tabular content stays planar | SGTA needs friendliness without losing administrative precision |
| Neutral-first, not colorless | Navy anchors navigation, blue drives action, orange acts as a rare orientation marker | Maintains the Tutorías identity while protecting information hierarchy |
| Spacious hierarchy | Generous page-level spacing but compact rows and controls inside operational surfaces | Admin users need both calm composition and efficient scanning |
| Strong typography | Page titles are bold; data tables use quieter hierarchy and tabular numerals | Prevents heavy typography from overwhelming dense operational data |

### 4.3 Intentional Deviations

| Global Principle | Deviation | Rationale |
|---|---|---|
| None | None | SGTA can express its product identity within the standard without requiring a structural exception |

---

## 5. Selected References & Principles

These are principle references, not targets for visual imitation.

| Reference Product | Like (What to adopt) | Avoid (What to reject) | Product Application Rationale |
|---|---|---|---|
| Wise | Clear hierarchy, generous grouping, friendly confidence | Consumer-finance promotional treatments | Useful model for making operational screens feel calm and approachable |
| Airbnb / Tripadvisor | Strong typography, readable cards/lists, approachable geometry | Image-led marketplace density and promotional content | Useful for friendliness and scannability, not for content model |
| Notion | Quiet surfaces, simple navigation, low visual noise | Excessively neutral identity and document-editor conventions | Useful for disciplined operational calm |
| Apple | Restraint, hierarchy, confidence in whitespace | Oversized marketing spacing and product-showcase behavior | Useful as a restraint reference for headers and empty space |

---

## 6. Brand & Media Direction

### 6.1 Product Identity & Wordmark

- **Application identity:** `SGTA` is the technical/product name; `Tutorías UTN FRRe` is the visible institutional context.
- **Sidebar lockup:** use a compact official Tutorías mark plus **Tutorías** and a secondary **SGTA** label when enough width is available.
- **Login lockup:** may use the fuller official Tutorías identity with UTN FRRe context.
- **Logo usage:** use the original transparent/vector asset when available. Do not ship a screenshot crop of the supplied flyer as the production logo.
- **UTN identity:** preserve official university marks exactly; do not redraw, recolor, stretch, or merge them into custom icons.

### 6.2 Imagery & Media Strategy

- **Imagery role:** minimal.
- Product workspace screens should not contain decorative photography.
- Real institutional imagery may appear only on public/introductory surfaces if a future requirement justifies it.
- UI screenshots in documentation should be shown cleanly, without fake device frames or decorative 3D mockups.
- Forbidden: stock students, generic “education” illustrations, faux-3D lighthouse art, isometric dashboards, decorative gradients.

### 6.3 Signature Move — Faro Marker

The product signature is a **small orange beacon marker** used with restraint:
- active primary navigation;
- selected schedule plan/tab;
- occasional section orientation or key contextual marker.

It never replaces semantic status colors and never appears on every card. The purpose is recognition and orientation, not decoration.

---

## 7. Visual System

### 7.1 Color Strategy

- **Mood & canvas:** light workspace with Porcelain Canvas (`#F8FAFC`) and white operational surfaces (`#FFFFFF`).
- **Structural anchor:** Midnight Navy (`#0B172E` - `#101F3D`) in the persistent desktop navigation, primary headings, and selected institutional elements.
- **Primary action:** Beacon Blue (`#0284C7`), paired with `#0369A1` for interactive states, providing luminous clarity and high contrast.
- **Accent:** Faro Amber (`#F59E0B`), used with restraint for the Faro Marker, duty orientation tags, and selected brand presence.
- **Semantic colors:** success (`#16A34A`), warning (`#D97706`), danger (`#DC2626`), and info (`#0284C7`) remain semantically distinct and always pair with text/icon meaning.
- **Forbidden:** orange as a destructive/warning substitute; multiple competing saturated colors in one view; blue text on navy; muted text below accessible contrast.

### 7.2 Typography Strategy

- Use one highly legible UI family (Inter) across the product.
- Page and section titles use stronger weight rather than a separate decorative typeface.
- Operational numbers, duty hours, dates, and balance calculations strictly require tabular figures (`font-variant-numeric: tabular-nums`, `font-feature-settings: 'tnum'`) to guarantee perfect vertical column alignment in administrative tables.
- Hierarchy: page title > section title > control/row label > supporting metadata.
- Avoid all-caps navigation and oversized display typography in the application shell.

### 7.3 Geometry & Radius Hierarchy

- **Shape character:** balanced-soft.
- Controls use `radius-sm`.
- Cards/panels use `radius-md`.
- Dialogs/sheets use `radius-lg`.
- Pills are reserved for status and compact filters.

### 7.4 Iconography

- **Icon family:** Lucide.
- **Style:** outline icons with consistent stroke weight.
- Icons support labels; icon-only controls require accessible names and tooltips when meaning is not universally obvious.
- Do not mix multiple icon families.

---

## 8. Layout and Density

### 8.1 Information Density

- **Density level:** compact-balanced operational density.
- Tables and schedule surfaces are compact enough for comparison.
- Page chrome, section grouping, and forms retain generous breathing room.

### 8.2 Workspace Layout Principles

- Desktop Admin uses a persistent left sidebar and a main content workspace.
- The logo/brand returns to the Admin overview; the five primary operational destinations remain stable.
- Page headers contain title/context on the left and one dominant action on the right.
- Filters sit directly above the content they affect.
- Tables remain planar and full-width inside their section; avoid wrapping each table in multiple nested cards.
- Schedule and reporting views may use the full available workspace width.
- Forms for focused edits prefer a side sheet when preserving list context is valuable; multi-step or consequential tasks use dialogs/pages as appropriate.

---

## 9. Surfaces and Key Components

### 9.1 Surfaces & Cards

- Main workspace uses the canvas color.
- Primary content surfaces are white with structural borders.
- Cards are used for grouping, not as the default wrapper for every element.
- Shadows are subtle and primarily reserved for interactive controls, popovers, drawers, and dialogs.
- Summary cards should contain genuinely useful information; no empty “KPI wallpaper”.

### 9.2 Tables & Data Lists

- Header row is visually quiet but clearly separated.
- Row dividers use subtle borders.
- Hover indicates clickability only when the row is actionable.
- Numeric values align consistently and use tabular numerals.
- Status is communicated by label + icon/shape, never color alone.
- Row-level destructive actions remain secondary and require explicit confirmation where history may be affected.

### 9.3 Interactive Controls

- Primary button uses the primary brand action.
- Secondary actions use neutral surfaces.
- Destructive actions use danger semantics only when genuinely destructive.
- Inputs use visible borders and a high-contrast focus treatment.
- Buttons retain subtle tactile depth but do not “float” like large marketing cards.

### 9.4 Overlays & Popovers

- Use side sheets for editing an item while retaining list context.
- Use dialogs for confirmation or compact focused transactions.
- Use popovers/dropdowns for short contextual choices, not long forms.
- Bulk hour registration uses a dedicated dialog or sheet with explicit scope, category, direction, duration, and selected tutors.

---

## 10. Responsive Architecture

### 10.1 Mobile Workspace

- Sidebar becomes a navigation drawer.
- Tables that cannot remain readable reflow into structured rows/cards or horizontal scroll only when the table relationship must be preserved.
- Complex schedule editing becomes a simplified day/list experience; desktop remains the preferred editor.
- Primary actions stay easy to reach and all touch targets meet the project accessibility minimum.

### 10.2 Tablet Workspace

- Sidebar collapses to a compact rail/drawer.
- Tables preserve columns where practical; secondary metadata may collapse into detail rows.
- Forms can appear as sheets; schedule retains a reduced grid or day-focused mode.

### 10.3 Desktop Workspace

- Persistent sidebar.
- Full operational tables and schedule grid.
- Side-by-side list/detail or list/sheet compositions where they reduce navigation.
- Wide content areas remain bounded by the canonical workspace max width except dedicated schedule canvases that may use the full available main region.

---

## 11. Motion and Transitions

### 11.1 Motion Character

Functional, quick, and orienting. Motion confirms state changes and spatial relationships; it does not create personality by itself. Reduced-motion preferences are respected.

### 11.2 Allowed Transitions

- Short dialog/sheet entry and backdrop fade.
- Fast dropdown/popover reveal.
- Subtle hover/focus transitions.
- Simple tab/selected-state transitions that do not shift layout.

### 11.3 Forbidden Motion

- Bouncy springs.
- Parallax.
- Animated gradients.
- Slow card lifts.
- Gratuitous loading loops.
- Layout-shifting tab transitions.
- Animated counters used only for effect.

---

## 12. Explicit Anti-Patterns

- Glassmorphism, neon glow, or “AI dashboard” chrome.
- Decorative gradients as a default surface treatment.
- Huge KPI cards that displace operational content.
- Full-page dark mode as the initial visual identity.
- Multiple saturated brand colors competing in the same component.
- Primary actions hidden in overflow menus.
- Color-only positive/negative hour states.
- A separate “QR module” that duplicates the actual Consultation Intake domain.
- Direct tutor deletion where historical inactivation is required.
- A manually maintained subject-offer table that duplicates tutor/subject/schedule data.
- A dedicated hour-audit screen as the only place where history can be explained; movement history must be intrinsic to the hour workflow.

---

## 13. Canonical Token Registry

This section is the **single canonical registry** of visual values for SGTA.

The three working brand anchors were derived from the supplied raster artwork. If an official institutional palette is later supplied, replace the values here and nowhere else.

### 13.1 CSS Custom Properties (Runtime Tokens)

```css
:root {
  /* Colors - Brand Anchors */
  --brand-navy: #0B172E;
  --brand-blue: #0284C7;
  --brand-orange: #F59E0B;

  /* Colors - Base Canvas & Surfaces */
  --canvas: #F8FAFC;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --surface-subtle: #F1F5F9;

  /* Colors - Typography & Foreground */
  --foreground: #0F1D38;
  --foreground-secondary: #475569;
  --foreground-muted: #64748B;

  /* Colors - Borders */
  --border-subtle: #F1F5F9;
  --border: #E2E8F0;
  --border-strong: #CBD5E1;

  /* Colors - Brand Actions */
  --primary: #0284C7;
  --primary-hover: #0369A1;
  --primary-foreground: #FFFFFF;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F1D38;
  --accent: #F59E0B;
  --accent-hover: #D97706;
  --accent-foreground: #92400E;
  --accent-surface: #FFFBEB;

  /* Colors - Navigation */
  --nav-background: #0B172E;
  --nav-foreground: #F8FAFC;
  --nav-muted: #94A3B8;
  --nav-active: #16274E;
  --nav-active-marker: #F59E0B;

  /* Colors - Feedback & Semantics */
  --success: #16A34A;
  --success-surface: #F0FDF4;
  --warning: #D97706;
  --warning-surface: #FFFBEB;
  --danger: #DC2626;
  --danger-surface: #FEF2F2;
  --info: #0284C7;
  --info-surface: #F0F9FF;

  /* Typography - Families */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-display: var(--font-sans);
  --font-numeric: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Typography - Type Scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;

  /* Typography - Line Heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;

  /* Typography - Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing Scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;
  --spacing-2xl: 2rem;

  /* Geometry & Radii */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-pill: 9999px;

  /* Control Heights */
  --control-height-sm: 2rem;
  --control-height-md: 2.5rem;
  --control-height-lg: 2.75rem;

  /* Layout Widths & Gutters */
  --max-width: 100rem;
  --sidebar-width: 15.5rem;
  --sidebar-width-collapsed: 4.5rem;
  --topbar-height: 4rem;
  --gutter-desktop: 2rem;
  --gutter-tablet: 1.5rem;
  --gutter-mobile: 1rem;

  /* Focus */
  --focus-ring: 0 0 0 3px rgb(2 132 199 / 0.28);

  /* Motion Durations & Easing */
  --motion-fast: 140ms cubic-bezier(0.2, 0, 0, 1);
  --motion-normal: 200ms cubic-bezier(0.2, 0, 0, 1);
  --motion-slow: 280ms cubic-bezier(0.2, 0, 0, 1);

  /* Elevation & Shadows (Midnight Navy Tinted) */
  --shadow-xs: 0 1px 2px rgb(11 23 46 / 0.05);
  --shadow-sm: 0 2px 5px rgb(11 23 46 / 0.07);
  --shadow-hover: 0 4px 12px rgb(11 23 46 / 0.09);
  --shadow-raised: 0 10px 25px rgb(11 23 46 / 0.12);
  --shadow-dialog: 0 18px 45px rgb(11 23 46 / 0.16);
}
```

### 13.2 Breakpoint Constants (Build / Media Query Constants)

| Token | Min-Width Boundary | Target Workspace | Primary Layout Adaptation |
|---|---:|---|---|
| `sm` | `640px` | Mobile Workspace | Single-column reflow, drawer navigation |
| `md` | `768px` | Tablet Workspace | Collapsible navigation and reduced multi-column layouts |
| `lg` | `1024px` | Desktop Workspace | Persistent sidebar, planar tables, schedule workspace |
| `xl` | `1440px` | Wide Workspace | Expanded gutters and full operational canvas |

---

## 14. Design Audit Checklist

- [x] Product personality and brand intent are explicit.
- [x] Expression tier is E1 and density tier is D3.
- [x] Section 13 is the only registry of exact token values.
- [x] Controls use restrained tactile depth; content remains border-first.
- [x] Core foreground and action combinations meet WCAG AA targets.
- [x] Radius hierarchy follows element role.
- [x] Typography scale is deliberate and operationally scannable.
- [x] Responsive behavior is defined for mobile, tablet, and desktop.
- [x] Faro Marker provides a restrained signature move.
- [x] No unresolved design alternatives or placeholder decisions remain.
