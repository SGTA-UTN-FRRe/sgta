# Brand Assets & Institutional Identity

## Overview & Authorization

The visual identity of SGTA is anchored in the official brand symbols of **Tutorías UTN FRRe** (Secretaría de Asuntos Universitarios - Universidad Tecnológica Nacional, Facultad Regional Resistencia).

On **October 12, 2026**, the Coordinación de Tutorías UTN FRRe authorized the canonical digital master assets for application integration, replacing the provisional placeholder lighthouse icon (`FaroIcon`) with the authentic institutional lighthouse-and-shield brandmark and logotype across all application surfaces, browser metadata, and documentation.

## Master Assets

The authoritative source graphics are stored in `public/brand/`:

| File | Type | Resolution | Color Space | Description |
| --- | --- | --- | --- | --- |
| `public/brand/tutorias-mark-source.png` | Master Raster Mark | 328 × 505 px | RGBA (transparent) | Authentic lighthouse and shield emblem in institutional amber (`#F49100`). |
| `public/brand/tutorias-logo-source.png` | Master Raster Logotype | 801 × 800 px | RGBA (transparent) | Complete horizontal/stacked lockup: authentic mark + UTN cogwheel symbol + "FRRe" + "TUTORÍAS". |

Both source files are master reference assets and are preserved under version control to serve as the single source of truth for all derived vector and raster deliverables.

## Derived Deliverables & Target Specifications

The application uses deterministic derived assets generated from the master sources:

### 1. Vector Brand Assets

- **`public/brand/tutorias-mark.svg`**:
  - Format: Pure SVG 1.1 vector geometry (`viewBox="0 0 328 505"`), transparent background.
  - Geometry: Single compound `<path>` with `fill-rule="evenodd"` tracing all 10 authentic contour loops (dome, upper cornice, 3 vertical lantern panes, horizontal light beams, outer shield silhouette, and the 3 tower body tiers separated by diagonal white bands).
  - Fill color: Institutional amber (`#F49100`).
  - Restrictions: No embedded raster images, no external fonts, no JavaScript.

- **`public/brand/tutorias-logo.svg`**:
  - Format: Pure SVG 1.1 vector geometry (`viewBox="0 0 801 800"`), transparent background.
  - Geometry: Amber mark path (`#F49100`) combined with black typographic path (`#0A0A0A`) capturing the UTN gear emblem, separator bar, and "FRRe TUTORÍAS" letterforms.
  - Restrictions: Clean vector outlines, self-contained and scalable.

### 2. Next.js App Router Metadata Icons

In accordance with Next.js App Router file-based metadata conventions, icons are placed under `src/app/` to prevent conflicting manual `<link rel="icon">` tags in `layout.tsx`:

- **`src/app/icon.svg`**:
  - Purpose: Primary scalable browser tab icon (`sizes="any"`).
  - Canvas: Square `viewBox="0 0 32 32"`, transparent background.
  - Optimization: Mark centered with optical margins (scaled height: 28 px), ensuring sharp silhouette recognition at small resolutions (16 × 16, 32 × 32 px) without illegible text microcopy.

- **`src/app/favicon.ico`**:
  - Purpose: Standard legacy and multi-resolution Windows / browser favicon.
  - Format: Binary ICO container enclosing three distinct 32-bit RGBA PNG images:
    - 16 × 16 px (supersampled with 1 px padding)
    - 32 × 32 px (supersampled with 2 px padding)
    - 48 × 48 px (supersampled with 3 px padding)
  - Transparency: Transparent background with antialiased borders.

- **`src/app/apple-icon.png`**:
  - Purpose: iOS Home Screen touch icon (`apple-touch-icon`).
  - Dimensions: 180 × 180 px.
  - Background: Opaque brand navy (`#0B172E` / `rgb(11, 23, 46)`), conforming to Apple Human Interface Guidelines which mandate opaque backgrounds to prevent default black fill on translucent pixels.
  - Content: Authentic amber mark centered with 24 px safe-area padding.

### 3. Shared Identity Component (`TutoriasMark`)

Implemented in `src/shared/components/tutorias-mark.tsx` and exported via `src/shared/components/index.ts` and `src/shared/index.ts`:

- **Component Name**: `TutoriasMark`
- **Props**: Extends standard `SVGProps<SVGSVGElement>` (`className`, `aria-label`, `aria-hidden`, etc.).
- **Default Sizing**: `h-6 w-6`.
- **Fill**: `currentColor`, enabling dynamic styling with design tokens (e.g. `text-faro`, `text-white`, `text-primary`).
- **Accessibility**: Defaults to `aria-hidden="true"` when purely decorative; exposes `aria-label` when an accessible label is provided.
- **Placements**:
  - `AppShell` (`src/shared/components/app-shell.tsx`): BrandLink in Admin desktop sidebar, tablet rail, mobile top bar, mobile drawer sheet, and Tutor top navigation bar.
  - `LoginScreen` (`src/app/login/login-screen.tsx`): Institutional brand lockup header.
  - `ForbiddenPage` (`src/app/forbidden/page.tsx`): Card header icon.
  - `NotFound` (`src/app/not-found.tsx`): Card header icon.

## Regeneration Workflow

All derived assets are reproducible via a zero-dependency Node.js script:

```bash
# Regenerate all brand assets (SVGs, ICO, and PNG)
node scripts/generate-brand-assets.mjs
```

### Script Architecture

- `scripts/generate-brand-assets.mjs`: Orchestrator that decodes master PNGs, extracts vector contours, computes Douglas-Peucker polygon simplifications, and writes output files.
- `scripts/vector-tracer.mjs`: Moore-neighbor contour tracing and line simplification utilities using Node.js standard libraries (`node:fs`, `node:zlib`).
- `scripts/image-utils.mjs`: Pure binary PNG and ICO format encoders using Node.js built-in `zlib` deflate and CRC-32 checksum calculations.

No third-party imaging dependencies (such as `sharp` or `canvas`) are required in `package.json`.

## Quality & Accessibility Checklist

- [x] Vector assets contain clean XML markup without embedded bitmaps or scripts.
- [x] Metadata icons adhere to Next.js App Router conventions with no competing tags in `src/app/layout.tsx`.
- [x] Apple touch icon has an opaque `#0B172E` background with adequate touch padding.
- [x] Favicon ICO provides 16x16, 32x32, and 48x48 px resolutions.
- [x] Interactive links containing the mark preserve existing `aria-label="Tutorías UTN FRRe - inicio"`.
- [x] Unit test coverage in `src/shared/components/tutorias-mark.test.tsx`.

