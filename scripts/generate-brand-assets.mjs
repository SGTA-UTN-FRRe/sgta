import fs from "node:fs";
import path from "node:path";
import { decodePNG, traceContours, douglasPeucker } from "./vector-tracer.mjs";
import { createPNG, createICO } from "./image-utils.mjs";

const ROOT_DIR = process.cwd();
const MARK_SOURCE_PATH = path.join(ROOT_DIR, "public", "brand", "tutorias-mark-source.png");
const LOGO_SOURCE_PATH = path.join(ROOT_DIR, "public", "brand", "tutorias-logo-source.png");

const BRAND_AMBER = "#F49100";
const BRAND_NAVY = { r: 11, g: 23, b: 46 }; // #0B172E

function pointsToPathData(loops) {
  return loops
    .map((loop) => `M ${loop.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ")} Z`)
    .join(" ");
}

function generateSVGs() {
  console.log("Reading source assets...");
  const markData = decodePNG(MARK_SOURCE_PATH);
  const logoData = decodePNG(LOGO_SOURCE_PATH);

  // 1. Process tutorias-mark.svg
  console.log("Vectorizing tutorias-mark.svg...");
  const markGrid = new Uint8Array(markData.width * markData.height);
  for (let i = 0; i < markGrid.length; i++) {
    markGrid[i] = markData.rgba[i * 4 + 3] > 120 ? 1 : 0;
  }
  const markLoops = traceContours(markData.width, markData.height, markGrid);
  const simplifiedMarkLoops = markLoops.map((l) => douglasPeucker(l.concat([l[0]]), 0.9));
  const markPathData = pointsToPathData(simplifiedMarkLoops);

  const markSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${markData.width} ${markData.height}" fill="none">
  <path fill="${BRAND_AMBER}" fill-rule="evenodd" d="${markPathData}" />
</svg>
`;
  const markSvgPath = path.join(ROOT_DIR, "public", "brand", "tutorias-mark.svg");
  fs.writeFileSync(markSvgPath, markSvgContent, "utf8");
  console.log(`Saved ${markSvgPath}`);

  // Write React component src/shared/components/tutorias-mark.tsx
  const componentContent = `import type { SVGProps } from "react";

export type TutoriasMarkProps = SVGProps<SVGSVGElement>;

/**
 * Authentic brandmark of Tutorías UTN FRRe.
 * Scalable vector geometry matching public/brand/tutorias-mark.svg.
 */
export function TutoriasMark({
  className = "h-6 w-6",
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
  ...props
}: TutoriasMarkProps) {
  return (
    <svg
      viewBox="0 0 ${markData.width} ${markData.height}"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
      data-slot="tutorias-mark"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="${markPathData}"
      />
    </svg>
  );
}
`;
  const componentPath = path.join(ROOT_DIR, "src", "shared", "components", "tutorias-mark.tsx");
  fs.writeFileSync(componentPath, componentContent, "utf8");
  console.log(`Saved ${componentPath}`);

  // 2. Process tutorias-logo.svg
  console.log("Vectorizing tutorias-logo.svg...");
  // Separate into amber mark components vs black text components
  const logoAmberGrid = new Uint8Array(logoData.width * logoData.height);
  const logoBlackGrid = new Uint8Array(logoData.width * logoData.height);

  for (let i = 0; i < logoAmberGrid.length; i++) {
    const a = logoData.rgba[i * 4 + 3];
    const r = logoData.rgba[i * 4];
    const g = logoData.rgba[i * 4 + 1];
    const b = logoData.rgba[i * 4 + 2];
    if (a > 100) {
      if (r > 160 && g > 90 && b < 80) {
        // Amber mark
        logoAmberGrid[i] = 1;
      } else if (r < 80 && g < 80 && b < 80) {
        // Black text / cogwheel
        logoBlackGrid[i] = 1;
      }
    }
  }

  const logoAmberLoops = traceContours(logoData.width, logoData.height, logoAmberGrid).map((l) =>
    douglasPeucker(l.concat([l[0]]), 0.9)
  );
  const logoBlackLoops = traceContours(logoData.width, logoData.height, logoBlackGrid).map((l) =>
    douglasPeucker(l.concat([l[0]]), 0.8)
  );

  const logoAmberPathData = pointsToPathData(logoAmberLoops);
  const logoBlackPathData = pointsToPathData(logoBlackLoops);

  const logoSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${logoData.width} ${logoData.height}" fill="none">
  <!-- UTN FRRe Tutorías Authentic Mark -->
  <path fill="${BRAND_AMBER}" fill-rule="evenodd" d="${logoAmberPathData}" />
  <!-- UTN FRRe TUTORÍAS Typography and Cogwheel -->
  <path fill="#0A0A0A" fill-rule="evenodd" d="${logoBlackPathData}" />
</svg>
`;
  const logoSvgPath = path.join(ROOT_DIR, "public", "brand", "tutorias-logo.svg");
  fs.writeFileSync(logoSvgPath, logoSvgContent, "utf8");
  console.log(`Saved ${logoSvgPath}`);

  // 3. Process src/app/icon.svg (App Router square metadata icon)
  console.log("Generating src/app/icon.svg...");
  // Mark bounds in 328x505: minX: 21, maxX: 294, minY: 24, maxY: 493 (w=273, h=469, cx=157.5, cy=258.5)
  // Scale to 32x32 canvas, height = 28, cy = 16, cx = 16
  const targetH = 28;
  const scale = targetH / 469;
  const scaledLoops = simplifiedMarkLoops.map((loop) =>
    loop.map(([x, y]) => {
      const sx = 16 + (x - 157.5) * scale;
      const sy = 16 + (y - 258.5) * scale;
      return [sx, sy];
    })
  );
  const appIconPathData = pointsToPathData(scaledLoops);
  const appIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path fill="${BRAND_AMBER}" fill-rule="evenodd" d="${appIconPathData}" />
</svg>
`;
  const appIconSvgPath = path.join(ROOT_DIR, "src", "app", "icon.svg");
  fs.writeFileSync(appIconSvgPath, appIconSvgContent, "utf8");
  console.log(`Saved ${appIconSvgPath}`);

  return { markData };
}

function resampleMarkToCanvas(source, targetW, targetH, padding, bgColor = null) {
  const { width: sw, height: sh, rgba: sRgba } = source;
  // Bounding box of mark in source
  const minX = 21, maxX = 294, minY = 24, maxY = 493;
  const markW = maxX - minX + 1;
  const markH = maxY - minY + 1;

  const availW = targetW - padding * 2;
  const availH = targetH - padding * 2;
  const scale = Math.min(availW / markW, availH / markH);

  const destW = markW * scale;
  const destH = markH * scale;
  const destX0 = Math.round((targetW - destW) / 2);
  const destY0 = Math.round((targetH - destH) / 2);

  const out = Buffer.alloc(targetW * targetH * 4);

  // Initialize background
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      if (bgColor) {
        out[idx] = bgColor.r;
        out[idx + 1] = bgColor.g;
        out[idx + 2] = bgColor.b;
        out[idx + 3] = 255;
      } else {
        out[idx] = 0;
        out[idx + 1] = 0;
        out[idx + 2] = 0;
        out[idx + 3] = 0;
      }
    }
  }

  // Supersampled rendering: sample 4x4 subpixels
  const SAMPLES = 4;
  for (let dy = 0; dy < targetH; dy++) {
    for (let dx = 0; dx < targetW; dx++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        const subY = dy + (sy + 0.5) / SAMPLES;
        const srcY = minY + (subY - destY0) / scale;

        for (let sx = 0; sx < SAMPLES; sx++) {
          const subX = dx + (sx + 0.5) / SAMPLES;
          const srcX = minX + (subX - destX0) / scale;

          if (srcX >= 0 && srcX < sw && srcY >= 0 && srcY < sh) {
            const ix = Math.floor(srcX);
            const iy = Math.floor(srcY);
            const sIdx = (iy * sw + ix) * 4;
            const sa = sRgba[sIdx + 3] / 255;
            rSum += sRgba[sIdx] * sa;
            gSum += sRgba[sIdx + 1] * sa;
            bSum += sRgba[sIdx + 2] * sa;
            aSum += sa;
          }
        }
      }

      const totalSamples = SAMPLES * SAMPLES;
      const alpha = aSum / totalSamples;
      if (alpha > 0) {
        const dIdx = (dy * targetW + dx) * 4;
        const rFg = rSum / aSum;
        const gFg = gSum / aSum;
        const bFg = bSum / aSum;

        if (bgColor) {
          out[dIdx] = Math.round(rFg * alpha + bgColor.r * (1 - alpha));
          out[dIdx + 1] = Math.round(gFg * alpha + bgColor.g * (1 - alpha));
          out[dIdx + 2] = Math.round(bFg * alpha + bgColor.b * (1 - alpha));
          out[dIdx + 3] = 255;
        } else {
          out[dIdx] = Math.round(rFg);
          out[dIdx + 1] = Math.round(gFg);
          out[dIdx + 2] = Math.round(bFg);
          out[dIdx + 3] = Math.round(alpha * 255);
        }
      }
    }
  }

  return out;
}

function generateRasterAssets(markData) {
  console.log("Generating src/app/apple-icon.png (180x180)...");
  const appleRgba = resampleMarkToCanvas(markData, 180, 180, 24, BRAND_NAVY);
  const applePng = createPNG(180, 180, appleRgba);
  const appleIconPath = path.join(ROOT_DIR, "src", "app", "apple-icon.png");
  fs.writeFileSync(appleIconPath, applePng);
  console.log(`Saved ${appleIconPath}`);

  console.log("Generating src/app/favicon.ico (16x16, 32x32, 48x48)...");
  const sizes = [16, 32, 48];
  const icoEntries = sizes.map((size) => {
    const padding = size === 16 ? 1 : size === 32 ? 2 : 3;
    const rgba = resampleMarkToCanvas(markData, size, size, padding, null);
    const pngBuf = createPNG(size, size, rgba);
    return { width: size, height: size, buffer: pngBuf };
  });

  const icoBuffer = createICO(icoEntries);
  const faviconPath = path.join(ROOT_DIR, "src", "app", "favicon.ico");
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log(`Saved ${faviconPath}`);
}

function main() {
  console.log("=== Generating Tutorías UTN FRRe Brand Assets ===");
  const { markData } = generateSVGs();
  generateRasterAssets(markData);
  console.log("=== All brand assets generated successfully! ===");
}

main();
