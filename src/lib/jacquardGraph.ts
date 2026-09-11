/**
 * Jacquard weave graph: turns a jacquard design's artwork into a discrete
 * warp-end x weft-pick grid in which every cell is one of the design's
 * declared yarn colors. Shared by the customer studio's Graph view (nominal
 * densities) and the internal loom/CAD export (approved densities). Kept free
 * of the export's heavy dependencies (JSZip, admin panels) so the customer
 * studio can import it cheaply.
 */
import { hexToRgb } from './color';
import { colorLabel } from '../studio/color/naming';
import type { JacquardSpec } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode an artwork image.'));
    img.src = src;
  });
}

/** Draws `img` centered in a w×h box, preserving aspect ratio (letterboxed) — matches the on-screen SVG preview's `preserveAspectRatio="xMidYMid meet"`. */
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
}

/**
 * Renders exactly one repeat cell of the jacquard artwork, independent of
 * whatever mode/zoom is currently on screen — self-contained from the spec,
 * so the export is correct no matter what the studio is showing when the
 * admin clicks export. Coordinate system matches the on-screen strip: x runs
 * along the repeat length, y runs across the fabric width.
 */
async function renderJacquardCellCanvas(spec: JacquardSpec, pxPerMm: number): Promise<HTMLCanvasElement> {
  const lengthPx = Math.max(1, Math.round(spec.repeat.lengthMm * pxPerMm));
  const widthPx = Math.max(1, Math.round(spec.widthMm * pxPerMm));
  const canvas = document.createElement('canvas');
  canvas.width = lengthPx;
  canvas.height = widthPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  ctx.fillStyle = spec.baseColor;
  ctx.fillRect(0, 0, lengthPx, widthPx);

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts API not fully supported — proceed with whatever is loaded */
    }
  }

  const cellCenterX = (spec.repeat.lengthMm / 2) * pxPerMm;
  const cellCenterY = (spec.widthMm / 2) * pxPerMm;

  for (const item of spec.artwork) {
    const cx = cellCenterX + item.transform.xMm * pxPerMm;
    const cy = cellCenterY + item.transform.yMm * pxPerMm;
    const w = item.transform.widthMm * pxPerMm;
    const h = item.transform.heightMm * pxPerMm;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((item.transform.rotationDeg * Math.PI) / 180);
    ctx.scale(item.transform.mirrored ? -1 : 1, 1);

    if (item.kind === 'image' && item.dataUrl) {
      try {
        const img = await loadImage(item.dataUrl);
        drawContain(ctx, img, w, h);
      } catch {
        /* skip an artwork item that fails to decode rather than aborting the export */
      }
    } else if (item.kind === 'text' && item.text) {
      const fontPx = h * 0.82;
      ctx.font = `${item.fontWeight ?? 700} ${fontPx}px ${item.fontFamily ?? 'Inter, sans-serif'}`;
      ctx.fillStyle = item.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Match the SVG preview's textLength fix: scale horizontally so the
      // rendered text exactly fills its declared width box.
      const measured = ctx.measureText(item.text).width || 1;
      const scaleX = w / measured;
      ctx.scale(scaleX, 1);
      ctx.fillText(item.text, 0, 0);
    }

    ctx.restore();
  }

  return canvas;
}

export interface PaletteEntry {
  hex: string;
  /** Which part of the design this color plays — e.g. "Base / Ground", "Motif". */
  role: string;
  /** Yarn shade / Pantone name, e.g. "Navy (IC-003)". */
  label: string;
}

/**
 * The design's actual declared yarn colors, deduplicated — this IS the loom's
 * available color set. A jacquard loom cannot weave an arbitrary blended
 * shade; every warp end and weft pick is one of these colors or none at all.
 */
export function buildJacquardPalette(spec: JacquardSpec): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  const seen = new Set<string>();
  const add = (hex: string | undefined, role: string) => {
    if (!hex) return;
    const norm = hex.trim().toLowerCase();
    if (seen.has(norm)) return;
    seen.add(norm);
    entries.push({ hex, role, label: colorLabel(hex) });
  };
  add(spec.baseColor, 'Base / Ground');
  add(spec.fg, 'Motif');
  add(spec.secondaryColor, 'Secondary');
  add(spec.accentColor, 'Accent');
  add(spec.edgeColor, 'Edge');
  (spec.additionalColors ?? []).forEach((c, i) => add(c, `Additional ${i + 1}`));
  return entries;
}

/**
 * Snaps every pixel of `canvas` to the nearest color in `palette` (by RGB
 * distance). Without this, a smooth image resize leaves blended/anti-aliased
 * shades at every edge — colors that don't correspond to any actual yarn and
 * can't physically be woven. The quantized result is a true discrete design
 * graph: every cell is exactly one real color, or none (transparent).
 */
function quantizeToPalette(canvas: HTMLCanvasElement, palette: PaletteEntry[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || palette.length === 0) return;
  const rgbPalette = palette
    .map((p) => ({ ...hexToRgb(p.hex), hex: p.hex }))
    .filter((p): p is { r: number; g: number; b: number; hex: string } => p.r !== undefined);
  if (rgbPalette.length === 0) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue; // leave fully transparent pixels alone
    let best = rgbPalette[0];
    let bestDist = Infinity;
    for (const c of rgbPalette) {
      const d = (px[i] - c.r) ** 2 + (px[i + 1] - c.g) ** 2 + (px[i + 2] - c.b) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    px[i] = best.r;
    px[i + 1] = best.g;
    px[i + 2] = best.b;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Nominal densities for customer-facing graphs (studio Graph view, spec sheet
 * PDF) — mid-range for narrow jacquard elastics. The approved production
 * densities are set later by the technical team.
 */
export const NOMINAL_ENDS_PER_CM = 40;
export const NOMINAL_PICKS_PER_CM = 30;

/** Cells in one repeat: columns are weft picks along the repeat length, rows are warp ends across the width. */
export function patternGridSize(spec: JacquardSpec, endsPerCm: number, picksPerCm: number): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.round((spec.repeat.lengthMm / 10) * picksPerCm)),
    rows: Math.max(1, Math.round((spec.widthMm / 10) * endsPerCm)),
  };
}

/**
 * One repeat of the design as a canvas with exactly one pixel per
 * warp-end x weft-pick intersection, quantized to `palette` (by default the
 * design's declared yarns, as the loom export requires).
 */
export async function buildPatternGridCanvas(
  spec: JacquardSpec,
  endsPerCm: number,
  picksPerCm: number,
  palette: PaletteEntry[] = buildJacquardPalette(spec)
): Promise<HTMLCanvasElement> {
  const { cols, rows } = patternGridSize(spec, endsPerCm, picksPerCm);
  if (cols > 4000 || rows > 4000) {
    throw new Error('The computed pattern grid is unreasonably large — check the density values.');
  }

  const cell = await renderJacquardCellCanvas(spec, 8);
  const raw = document.createElement('canvas');
  raw.width = cols;
  raw.height = rows;
  const rctx = raw.getContext('2d');
  if (!rctx) throw new Error('Canvas is not available in this browser.');
  rctx.imageSmoothingEnabled = true;
  rctx.drawImage(cell, 0, 0, raw.width, raw.height);
  quantizeToPalette(raw, palette);
  return raw;
}

type Rgb = { r: number; g: number; b: number };

function rgbOf(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function hexOf({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Colors closer than this are treated as the same yarn (shading of one ink, JPEG noise). */
const SAME_COLOR_DIST2 = 48 * 48;

function colorDist2(a: Rgb, b: Rgb): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/**
 * The main colors of the uploaded image artwork, most-used first. Opaque
 * pixels are bucketed (16 levels per channel); buckets under 2% of the
 * artwork are noise or anti-aliasing and are dropped, and near-duplicates
 * merge, so a multi-color logo yields one entry per ink it actually uses.
 */
export async function extractArtworkColors(spec: JacquardSpec, maxColors = 6): Promise<string[]> {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (const item of spec.artwork) {
    if (item.kind !== 'image' || !item.dataUrl) continue;
    let img: HTMLImageElement;
    try {
      img = await loadImage(item.dataUrl);
    } catch {
      continue;
    }
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const scale = Math.min(1, 96 / Math.max(iw, ih));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(iw * scale));
    canvas.height = Math.max(1, Math.round(ih * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 200) continue; // transparent background / soft edges
      const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
      const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bucket.n += 1;
      bucket.r += px[i];
      bucket.g += px[i + 1];
      bucket.b += px[i + 2];
      buckets.set(key, bucket);
      total += 1;
    }
  }

  const picked: Rgb[] = [];
  for (const bucket of [...buckets.values()].sort((a, b) => b.n - a.n)) {
    if (picked.length >= maxColors || bucket.n < total * 0.02) break;
    const color = { r: Math.round(bucket.r / bucket.n), g: Math.round(bucket.g / bucket.n), b: Math.round(bucket.b / bucket.n) };
    if (picked.some((c) => colorDist2(c, color) < SAME_COLOR_DIST2)) continue;
    picked.push(color);
  }
  return picked.map(hexOf);
}

/**
 * Palette for the customer-facing graph: the declared yarns plus the main
 * colors of any uploaded logo, so an uploaded image keeps its own colors
 * instead of being forced into the two design colors. (The loom export still
 * quantizes to declared yarns only.)
 */
export async function buildGraphPalette(spec: JacquardSpec): Promise<PaletteEntry[]> {
  const palette = buildJacquardPalette(spec);
  const known = palette.map((p) => rgbOf(p.hex)).filter((c): c is Rgb => c !== null);
  let n = 0;
  for (const hex of await extractArtworkColors(spec)) {
    const color = rgbOf(hex);
    if (!color || known.some((c) => colorDist2(c, color) < SAME_COLOR_DIST2)) continue;
    known.push(color);
    n += 1;
    palette.push({ hex, role: `Logo colour ${n}`, label: colorLabel(hex) });
  }
  return palette;
}

/**
 * Printable, enlarged copy of a one-pixel-per-cell grid, drawn like jacquard
 * point paper: nearest-neighbor scaled, a thin line per thread when cells are
 * big enough, and a bold line every 10 threads. Returns a PNG data URL.
 */
export function renderGraphPng(raw: HTMLCanvasElement, maxPx = 1800): string {
  const cols = raw.width;
  const rows = raw.height;
  const cell = Math.max(1, Math.min(10, Math.floor(maxPx / Math.max(cols, rows))));
  const out = document.createElement('canvas');
  out.width = cols * cell + 1;
  out.height = rows * cell + 1;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(raw, 0, 0, cols * cell, rows * cell);
  if (cell >= 4) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
    for (let x = 0; x <= cols; x++) ctx.fillRect(x * cell, 0, 1, out.height);
    for (let y = 0; y <= rows; y++) ctx.fillRect(0, y * cell, out.width, 1);
  }
  ctx.fillStyle = 'rgba(71, 85, 105, 0.85)';
  for (let x = 0; x <= cols; x += 10) ctx.fillRect(x * cell, 0, 1, out.height);
  for (let y = 0; y <= rows; y += 10) ctx.fillRect(0, y * cell, out.width, 1);
  ctx.fillRect(cols * cell, 0, 1, out.height);
  ctx.fillRect(0, rows * cell, out.width, 1);
  return out.toDataURL('image/png');
}
