---
status: approved
---

# Project Design

## Brief

- Product: SGTA manages Tutorías at UTN FRRe. Its surfaces are the public login, server-authorized Admin workspace, and read-only Tutor self-service.
- Audience and context: Tutorías Admins work on desktop daily; Tutors consult their own information on phones weekly.
- Expression: E1 Branded Product, with institutional identity expressed through typography, ink actions, and the Faro Beam.
- Density: D3 Operational, with 14px body text, compact rows, and 12–16px data-region padding for daily scanning.
- Must feel: Clean and modern with an academic seriousness; Comfortable and accessible for daily work; Fast to scan, with color that carries meaning.
- Must not feel: Pastel or decorative; Like a generic admin template; Gamified or playful.
- Signature move: page titles use `font-display text-title`; the Faro Beam is a `w-1 h-5 rounded-full bg-sidebar-marker` bar at the leading edge of the active Admin navigation pill and on the login brand mark. It appears nowhere else.
- Color schemes: light only, with no user scheme switch.

## References

The four user-supplied visual references reviewed on 2026-10-08 are described here; their images are not repository assets.

| Reference | Take | Avoid |
| --- | --- | --- |
| EONIX dashboard | Saturated fills and hatch as a second data cue | Decorative KPI panels |
| Calendar week view | Day chips and filled time blocks | Pastels and a dark glass frame |
| FORTHEYE | Key figures row and pill controls | Gamification and tiny gray text |
| hope dashboard | Gray canvas, white rounded panels, solid active pill | Sub-12px text and promotional blocks |

## Voice

Language selects copy; locale formats dates and numbers; register sets tone, pronouns, and regionalisms.

- Language: Spanish. BCP 47 locale: `es-AR` for Argentina date and number formatting.
- Register: neutral institutional Spanish, concise, clear, professional, direct, and calm. Avoid unnecessary second-person pronouns and bureaucratic wording.
- Regional voice: neutral; no voseo, slang, deliberately Rioplatense expressions, conversational filler, or exaggerated friendliness. Locale does not set voice.
- Terminology: use established Tutorías terms. Technical names, staging, ledger, and transaction implementation details remain internal.
- Microcopy: prefer infinitive action labels such as `Agregar tutor`, `Guardar cambios`, `Registrar movimiento`, `Actualizar consultas`, `Crear horario especial`, `Cerrar ciclo`, `Reintentar`, `Cancelar`, and `Confirmar`.
- Errors and recovery: `No se pudo guardar el registro.`, `El correo es obligatorio.`, and `Contactar a la administración de Tutorías para solicitar acceso.` Success: `Los cambios se guardaron correctamente.` Empty states state what is absent and the available next action without invented data.
- Avoid `Guardá los cambios.`, `Ingresá tu correo.`, `Podés volver a intentarlo.`, and `¿Querés continuar?`. Do not force unnatural impersonal wording.

| Internal concept | Product label |
| --- | --- |
| `Tutor` | Tutor |
| `HourLedger` | Horas / Crédito de horas |
| `HourMovement` | Movimiento |
| `Consultation` | Consulta |
| `SchedulePlan` | Horario / Plan de horario |
| `AdministrativeCycle` | Ciclo |
| `SUBJECT` consultation | Materia |
| `GENERAL` consultation | General / Varias |

## Visual rules

- Surfaces: cool gray canvas and white panels at one level. Use layout, typography, and dividers to group content; never nest panels or add a panel around empty content. Muted and accent surfaces are neutral gray, never pastel or tinted.
- Typography: page and section headings use Source Serif 4 at weight 600; all other text uses Manrope. Body text is 14px, with no text below 12px. Roles and classes are listed below. Comparable numbers use `tabular-nums`.
- Color as data: saturated career colors identify careers, with an abbreviation on each colored element and the full name in legends and tooltips. Career colors never express status. Recovery adds `bg-hatch` and `Recuperación`; conflicts add a destructive icon and `Conflicto`. Color is never the only cue.
- Actions: navy ink is the primary action and selected state for buttons, navigation, days, and segments. Institutional blue is for links, focus, and information. Faro orange is brand-only, limited to the signature mark.
- Status: neutral pills with a saturated dot and icon; success, warning, danger, info, and neutral semantics. Do not use orange for warnings or career colors for status.
- Shape: buttons, chips, navigation items, and segmented controls use `rounded-full`; inputs `rounded-md`; panels `rounded-xl`. Geometry comes from the radius multipliers below.
- Depth: `shadow-xs` for panels, `shadow-lg` for floating overlays. Use the registered sticky, navigation, overlay, toast, and skip-link layers.
- Motion: quick color and focus feedback at 120–180ms and short disclosure, sheet, or dialog transitions at 180–240ms; easing `cubic-bezier(0.2, 0, 0, 1)`. No bounce, parallax, animated gradients, decorative counters, slow card lifts, or layout-shifting tabs. Respect reduced motion and preserve immediate state feedback.
- Icons: Lucide outline icons with stroke width 2, normally `size-4` for controls or `size-5` for supporting context. Icons normally accompany labels; icon-only actions require accessible names and tooltips when meaning is not universal. Do not mix icon families except official brand marks.
- Imagery: institutional brand marks only; no decorative dashboard imagery or invented promotional content.
- Accessibility: WCAG 2.2 AA; text contrast at least 4.5:1, meaningful boundaries and focus at least 3:1; visible keyboard focus, logical order, named controls, 44px touch targets in Compact, and usable content at 200% zoom. Focus uses `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`; the global fallback is a 2px ring-colored outline with 2px offset.
- Number formatting: durations are `1 h 30 min`, zero is `0 min`, and signs appear only for movements. Zero never uses a status color. Existing views adopt the duration formatter during their interface migration.

## Product anti-patterns

- Pastel or tinted surfaces; nested panels; panels around empty content.
- Career colors in status contexts; orange as warning; color-only meaning.
- Text below 12px or tiny unnamed icon actions.
- Important Admin actions hidden in overflow menus.
- Gamification, promotional blocks, invented metrics, or decorative KPI panels.
- Separate manually maintained subject coverage or a standalone QR module duplicating consultation intake.

## Token registry

Implemented in: `src/app/globals.css`.

Change this registry and that file in the same commit. When they disagree, this registry wins and the code is corrected. Colors use full `oklch()` values rounded to three decimals. The static `@theme` exposes layout, spacing, and typography; `@theme inline` exposes semantic colors, fonts, radii, and shadows to Tailwind. Layer utilities are `z-sticky`, `z-nav`, `z-overlay`, `z-toast`, and `z-skip-link`. `bg-hatch` uses repeating 45° stripes, 2px colored and 4px transparent, with `color-mix(in oklch, currentColor 22%, transparent)`.

The input boundary was darkened from the target `#8C97A8` to `#8994A5` before conversion to meet 3:1 against white. Every ratio below is calculated from the final rounded OKLCH values, converted to linear sRGB with out-of-gamut channels clipped. Brand orange is not a text foreground.

```css
:root {
  --background: oklch(0.954 0.005 258.325);
  --foreground: oklch(0.320 0.059 263.759);
  --card: oklch(1.000 0.000 0.000);
  --card-foreground: oklch(0.320 0.059 263.759);
  --popover: oklch(1.000 0.000 0.000);
  --popover-foreground: oklch(0.320 0.059 263.759);
  --primary: oklch(0.320 0.059 263.759);
  --primary-foreground: oklch(1.000 0.000 0.000);
  --primary-hover: oklch(0.272 0.051 264.441);
  --secondary: oklch(0.933 0.007 260.732);
  --secondary-foreground: oklch(0.320 0.059 263.759);
  --muted: oklch(0.970 0.003 264.542);
  --muted-foreground: oklch(0.488 0.039 256.824);
  --accent: oklch(0.933 0.007 260.732);
  --accent-foreground: oklch(0.320 0.059 263.759);
  --link: oklch(0.526 0.137 248.289);
  --destructive: oklch(0.500 0.182 29.513);
  --destructive-foreground: oklch(1.000 0.000 0.000);
  --ring: oklch(0.526 0.137 248.289);
  --success: oklch(0.511 0.110 158.444);
  --success-foreground: oklch(1.000 0.000 0.000);
  --warning: oklch(0.537 0.114 74.298);
  --warning-foreground: oklch(1.000 0.000 0.000);
  --info: oklch(0.526 0.137 248.289);
  --info-foreground: oklch(1.000 0.000 0.000);
  --border: oklch(0.924 0.008 260.732);
  --input: oklch(0.663 0.028 259.044);
  --brand-navy: oklch(0.320 0.059 263.759);
  --faro: oklch(0.740 0.164 64.503);
  --sidebar: oklch(1.000 0.000 0.000);
  --sidebar-foreground: oklch(0.320 0.059 263.759);
  --sidebar-muted-foreground: oklch(0.488 0.039 256.824);
  --sidebar-accent: oklch(0.970 0.003 264.542);
  --sidebar-accent-foreground: oklch(0.320 0.059 263.759);
  --sidebar-primary: oklch(0.320 0.059 263.759);
  --sidebar-primary-foreground: oklch(1.000 0.000 0.000);
  --sidebar-border: oklch(0.924 0.008 260.732);
  --sidebar-ring: oklch(0.526 0.137 248.289);
  --sidebar-marker: oklch(0.740 0.164 64.503);
  --career-blue: oklch(0.546 0.215 262.881);
  --career-blue-foreground: oklch(1.000 0.000 0.000);
  --career-emerald: oklch(0.696 0.149 162.480);
  --career-emerald-foreground: oklch(0.320 0.059 263.759);
  --career-violet: oklch(0.541 0.247 293.009);
  --career-violet-foreground: oklch(1.000 0.000 0.000);
  --career-yellow: oklch(0.861 0.173 91.936);
  --career-yellow-foreground: oklch(0.320 0.059 263.759);
  --career-cyan: oklch(0.715 0.126 215.221);
  --career-cyan-foreground: oklch(0.320 0.059 263.759);
  --career-magenta: oklch(0.525 0.199 3.958);
  --career-magenta-foreground: oklch(1.000 0.000 0.000);
  --career-lime: oklch(0.768 0.204 130.850);
  --career-lime-foreground: oklch(0.320 0.059 263.759);
  --career-graphite: oklch(0.446 0.037 257.281);
  --career-graphite-foreground: oklch(1.000 0.000 0.000);
  --radius: 1rem;
  --shadow-xs: 0 1px 2px oklch(0.320 0.059 263.759 / 0.06);
  --shadow-lg: 0 24px 60px oklch(0.320 0.059 263.759 / 0.18);
  --layer-sticky: 20;
  --layer-nav: 40;
  --layer-overlay: 50;
  --layer-toast: 60;
  --layer-skip-link: 70;
}

@theme {
  --spacing-sidebar: 15.25rem;
  --spacing-sidebar-rail: 4.5rem;
  --spacing-row: 2.75rem;
  --container-page: 96rem;
  --container-dialog: 40rem;
  --container-dialog-wide: 52rem;
  --tracking-eyebrow: 0.12em;
  --text-display: 2.5rem;
  --text-display--line-height: 1.15;
  --text-title: 2rem;
  --text-title--line-height: 1.2;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-link: var(--link);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-brand-navy: var(--brand-navy);
  --color-faro: var(--faro);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-muted-foreground: var(--sidebar-muted-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-marker: var(--sidebar-marker);
  --color-career-blue: var(--career-blue);
  --color-career-blue-foreground: var(--career-blue-foreground);
  --color-career-emerald: var(--career-emerald);
  --color-career-emerald-foreground: var(--career-emerald-foreground);
  --color-career-violet: var(--career-violet);
  --color-career-violet-foreground: var(--career-violet-foreground);
  --color-career-yellow: var(--career-yellow);
  --color-career-yellow-foreground: var(--career-yellow-foreground);
  --color-career-cyan: var(--career-cyan);
  --color-career-cyan-foreground: var(--career-cyan-foreground);
  --color-career-magenta: var(--career-magenta);
  --color-career-magenta-foreground: var(--career-magenta-foreground);
  --color-career-lime: var(--career-lime);
  --color-career-lime-foreground: var(--career-lime-foreground);
  --color-career-graphite: var(--career-graphite);
  --color-career-graphite-foreground: var(--career-graphite-foreground);
  --font-sans: var(--font-ui);
  --font-display: var(--font-heading);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --shadow-xs: var(--shadow-xs);
  --shadow-lg: var(--shadow-lg);
}
```

| Foreground / boundary | Background | Measured contrast | Minimum |
| --- | --- | ---: | ---: |
| `--foreground` | `--background` | 11.15:1 | 4.5:1 |
| `--card-foreground` | `--card` | 12.75:1 | 4.5:1 |
| `--popover-foreground` | `--popover` | 12.75:1 | 4.5:1 |
| `--secondary-foreground` | `--secondary` | 10.47:1 | 4.5:1 |
| `--muted-foreground` | `--muted` | 5.78:1 | 4.5:1 |
| `--accent-foreground` | `--accent` | 10.47:1 | 4.5:1 |
| `--sidebar-foreground` | `--sidebar` | 12.75:1 | 4.5:1 |
| `--sidebar-accent-foreground` | `--sidebar-accent` | 11.69:1 | 4.5:1 |
| `--muted-foreground` | `--card` | 6.31:1 | 4.5:1 |
| `--muted-foreground` | `--muted` | 5.78:1 | 4.5:1 |
| `--sidebar-muted-foreground` | `--sidebar` | 6.31:1 | 4.5:1 |
| `--primary-foreground` | `--primary` | 12.75:1 | 4.5:1 |
| `--destructive-foreground` | `--destructive` | 6.58:1 | 4.5:1 |
| `--success-foreground` | `--success` | 5.42:1 | 4.5:1 |
| `--warning-foreground` | `--warning` | 5.23:1 | 4.5:1 |
| `--info-foreground` | `--info` | 5.35:1 | 4.5:1 |
| `--sidebar-primary-foreground` | `--sidebar-primary` | 12.75:1 | 4.5:1 |
| `--career-blue-foreground` | `--career-blue` | 5.17:1 | 4.5:1 |
| `--career-emerald-foreground` | `--career-emerald` | 5.03:1 | 4.5:1 |
| `--career-violet-foreground` | `--career-violet` | 5.71:1 | 4.5:1 |
| `--career-yellow-foreground` | `--career-yellow` | 8.34:1 | 4.5:1 |
| `--career-cyan-foreground` | `--career-cyan` | 5.25:1 | 4.5:1 |
| `--career-magenta-foreground` | `--career-magenta` | 6.03:1 | 4.5:1 |
| `--career-lime-foreground` | `--career-lime` | 6.45:1 | 4.5:1 |
| `--career-graphite-foreground` | `--career-graphite` | 7.56:1 | 4.5:1 |
| `--primary-foreground` | `--primary-hover` | 15.03:1 | 4.5:1 |
| `--link` | `--card` | 5.35:1 | 4.5:1 |
| `--link` | `--muted` | 4.91:1 | 4.5:1 |
| `--success` | `--card` | 5.42:1 | 4.5:1 |
| `--success` | `--muted` | 4.97:1 | 4.5:1 |
| `--warning` | `--card` | 5.23:1 | 4.5:1 |
| `--warning` | `--muted` | 4.80:1 | 4.5:1 |
| `--destructive` | `--card` | 6.58:1 | 4.5:1 |
| `--destructive` | `--muted` | 6.04:1 | 4.5:1 |
| `--info` | `--card` | 5.35:1 | 4.5:1 |
| `--info` | `--muted` | 4.91:1 | 4.5:1 |
| `--input` | `--card` | 3.07:1 | 3:1 |
| `--ring` | `--card` | 5.35:1 | 3:1 |
| `--sidebar-ring` | `--sidebar` | 5.35:1 | 3:1 |


Career slots are blue (Azul), emerald (Esmeralda), violet (Violeta), yellow (Amarillo), cyan (Cian), magenta (Magenta), lime (Lima), and graphite (Grafito). Each has a foreground pair at 4.5:1 or higher. Chroma is at least 0.12 except graphite; hues stay at least 25° from Faro orange and destructive red. Abbreviations derive from uppercase initials excluding `de`, `del`, `la`, `las`, `el`, `los`, `en`, `y`, and `e`, with a maximum of four characters (`Ingeniería en Sistemas de Información` → `ISI`).

| Role | Size / line height | Weight | Tracking | Class |
| --- | --- | --- | --- | --- |
| Display | 40px / 1.15 | 600 | Normal | `font-display text-display font-semibold` |
| Page title | 32px / 1.2; 24px / 1.33 Compact | 600 | Normal | `font-display text-2xl md:text-title font-semibold` |
| Section heading | 20px / 1.4 | 600 | Normal | `font-display text-xl font-semibold` |
| Body | 14px / 1.43 | 400 | Normal | `text-sm` |
| Body large | 16px / 1.5 | 400 | Normal | `text-base` |
| Label | 14px / 1.43 | 600 | Normal | `text-sm font-semibold` |
| Caption | 12px / 1.33 | 400 | Normal | `text-xs` |
| Metadata | 12px / 1.33 | 600 | 0.12em | `text-xs font-semibold uppercase tracking-eyebrow` |

| Font role | Family and fallback | Weights | Token / class |
| --- | --- | --- | --- |
| UI | Manrope, ui-sans-serif, system-ui, sans-serif | 400–800 | `--font-ui` / `font-sans` |
| Heading | Source Serif 4, ui-serif, Georgia, serif | 600 | `--font-heading` / `font-display` |

Fonts are self-hosted by `next/font/google` and their variable classes are attached to the root layout. Native system fallbacks are provided by Next.js font optimization.

## Breakpoints and layout modes

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, and `2xl` 1536px. Mode changes use `md` and `lg`.

| Mode | Width | Admin layout | Tutor layout |
| --- | --- | --- | --- |
| Compact | < 768px | Top bar and left Sheet; single-column content with `px-4` | Brand and account bar; three equal full-width segments on a second row; `px-4` |
| Medium | 768px to < 1024px | `w-sidebar-rail` navigation with tooltips; priority data columns; `px-6` | Top bar with navigation pills and account menu; `px-6` |
| Wide | >= 1024px | Expanded `w-sidebar` light navigation and full tables; `px-8` | Brand left, navigation pills, account menu right; `px-8` |

Content uses `max-w-page`. Tutor destinations are `Mi resumen`, `Mi horario`, and `Mis horas`, with an ink active pill. Dialogs use `max-w-dialog` or `max-w-dialog-wide`. Shared shell and view adoption follow the interface specification; this registry does not claim every existing view already meets the target rules.
