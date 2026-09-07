/**
 * Production CAD / Loom Export — internal-only. Packages the APPROVED
 * production specification plus the customer design's structural data into a
 * downloadable ZIP for the technical/production team:
 *
 *   loom-data.csv          — full construction & technical data sheet
 *   pattern-grid.png       — Jacquard only: one pixel per warp-end × weft-pick
 *                            intersection, sized from the approved ends/cm and
 *                            picks/cm density. This is the raw raster most
 *                            jacquard CAD/loom-preparation tools ingest.
 *   pattern-grid-preview.png — the same grid, nearest-neighbor magnified so a
 *                            human can sanity-check it without CAD software.
 *
 * This does not talk to any loom controller or vendor CAD system — there is
 * no such integration configured for this deployment. It turns data the
 * technical team already entered and approved into a portable, loom-agnostic
 * package. Verify against your specific loom/CAD software's exact format
 * requirements before use on the floor.
 */
import JSZip from 'jszip';
import { TECHNICAL_FIELD_DEFS } from '../pages/admin/components/ProductionSpecPanel';
import { FAMILY_BY_CODE } from './constants';
import { revisionLabel } from './ids';
import { colorLabel } from '../studio/color/naming';
import type { DesignSpec, JacquardSpec, KnittedSpec, ProductionSpec, WovenSpec } from './types';

export class LoomExportError extends Error {}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function csvRow(label: string, value: string): string {
  return `${csvEscape(label)},${csvEscape(value)}\n`;
}

function csvSection(title: string): string {
  return `\n${csvEscape(title)}\n`;
}

/**
 * Parses a density field that may be a plain number ("42") or a range the AI
 * draft proposes as a typical default ("30-50 ends/cm (typical)") — takes
 * the midpoint of every number found in the string. Returns null only when
 * no usable number is present at all.
 */
function parsePositive(s: string | undefined): number | null {
  if (!s) return null;
  const matches = s.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function yesNo(b: boolean): string {
  return b ? 'Yes' : 'No';
}

// ---------------------------------------------------------------------------
// CSV — construction & technical data sheet
// ---------------------------------------------------------------------------

export function buildLoomDataCsv(
  spec: DesignSpec,
  productionSpec: ProductionSpec,
  meta: { designCode: string; revisionNo: number; preparedBy: string }
): string {
  let csv = '';

  csv += csvSection('DESIGN REFERENCE');
  csv += csvRow('Design ID', meta.designCode);
  csv += csvRow('Revision', revisionLabel(meta.revisionNo));
  csv += csvRow('Product Type', FAMILY_BY_CODE[spec.family]?.label ?? spec.family);
  csv += csvRow('Application', spec.application);
  csv += csvRow('Production Spec Status', productionSpec.status === 'approved' ? 'Approved' : 'Draft');
  csv += csvRow('Generated', new Date().toLocaleString());
  csv += csvRow('Prepared By', meta.preparedBy);

  csv += csvSection('STRUCTURAL SPECIFICATION');
  csv += csvRow('Width (mm)', spec.widthMm.toFixed(1));
  csv += csvRow('Roll Length (m)', String(spec.rollLengthM));
  csv += csvRow('Elastic', spec.elastic ? `Yes — ${spec.elasticityClass ?? 'medium'}` : 'No');
  if (spec.firmness) csv += csvRow('Firmness', spec.firmness);
  csv += csvRow('Thickness Class', spec.thicknessClass);
  csv += csvRow('Edge Style', spec.edgeStyle);
  if (spec.construction) csv += csvRow('Construction Note', spec.construction);

  if (spec.family === 'J') {
    const j = spec as JacquardSpec;
    csv += csvRow('Repeat Length (mm)', j.repeat.lengthMm.toFixed(1));
    csv += csvRow('Repeat Spacing (mm)', j.repeat.spacingMm.toFixed(1));
    csv += csvRow('Mirror Repeat', yesNo(j.repeat.mirror));
    csv += csvRow('Reverse Repeat', yesNo(j.repeat.reverse));
    csv += csvRow('Artwork Items', String(j.artwork.length));
  } else if (spec.family === 'W') {
    const w = spec as WovenSpec;
    csv += csvRow('Rubber', w.rubber);
    if (w.ribAppearance) csv += csvRow('Rib Appearance', w.ribAppearance);
  } else {
    const k = spec as KnittedSpec;
    csv += csvRow('Rubber', yesNo(k.rubber));
    if (k.ribAppearance) csv += csvRow('Rib Appearance', k.ribAppearance);
  }

  csv += csvSection('COLORS');
  csv += csvRow('Base', `${spec.baseColor} — ${colorLabel(spec.baseColor)}`);
  if (spec.family === 'J') csv += csvRow('Motif', `${(spec as JacquardSpec).fg} — ${colorLabel((spec as JacquardSpec).fg)}`);
  if (spec.secondaryColor) csv += csvRow('Secondary', `${spec.secondaryColor} — ${colorLabel(spec.secondaryColor)}`);
  if (spec.accentColor) csv += csvRow('Accent', `${spec.accentColor} — ${colorLabel(spec.accentColor)}`);
  if (spec.edgeColor) csv += csvRow('Edge', `${spec.edgeColor} — ${colorLabel(spec.edgeColor)}`);
  (spec.additionalColors ?? []).forEach((c, i) => {
    csv += csvRow(`Additional ${i + 1}`, `${c} — ${colorLabel(c)}`);
  });
  if (spec.family === 'W') {
    (spec as WovenSpec).stripes.forEach((s, i) => {
      csv += csvRow(
        `Warp Stripe ${i + 1}`,
        `${s.color} — ${colorLabel(s.color)} · width ${s.widthMm.toFixed(1)} mm · offset ${s.offsetMm.toFixed(1)} mm`
      );
    });
  }

  const filled = TECHNICAL_FIELD_DEFS.filter((f) => (productionSpec.details[f.key] ?? '').trim() !== '');
  csv += csvSection('APPROVED PRODUCTION / TECHNICAL DATA (Internal)');
  if (filled.length === 0) {
    csv += csvRow('—', 'No technical fields recorded yet.');
  } else {
    for (const f of filled) csv += csvRow(f.label, (productionSpec.details[f.key] ?? '').trim());
  }
  if (productionSpec.details.notes?.trim()) csv += csvRow('Notes', productionSpec.details.notes.trim());

  const endsPerCm = parsePositive(productionSpec.details.endsPerCm);
  const picksPerCm = parsePositive(productionSpec.details.picksPerCm);
  if (endsPerCm || picksPerCm) {
    csv += csvSection('COMPUTED LOOM DATA');
    if (endsPerCm) csv += csvRow('Ends across width', String(Math.round((spec.widthMm / 10) * endsPerCm)));
    if (picksPerCm) csv += csvRow('Picks per meter', String(Math.round(picksPerCm * 100)));
    if (spec.family === 'J' && picksPerCm) {
      csv += csvRow(
        'Picks per repeat',
        String(Math.round(((spec as JacquardSpec).repeat.lengthMm / 10) * picksPerCm))
      );
    }
  }

  csv +=
    '\n"Reference data generated from the approved production specification. Verify against your loom/CAD system\'s exact format requirements before use."\n';

  return csv;
}

// ---------------------------------------------------------------------------
// Pattern grid — Jacquard only, requires ends/cm + picks/cm + a rendered PNG
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new LoomExportError('Could not decode an artwork image.'));
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
  if (!ctx) throw new LoomExportError('Canvas is not available in this browser.');

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

/**
 * Builds a self-contained (spec-only, no live preview dependency) pattern
 * grid with one pixel per warp-end × weft-pick intersection — the raw raster
 * format most jacquard CAD/loom-prep tools ingest — plus a nearest-neighbor
 * magnified copy for human review.
 */
export async function buildPatternGridPngs(
  spec: JacquardSpec,
  endsPerCm: number,
  picksPerCm: number
): Promise<{ dataGridPng: string; previewPng: string; cols: number; rows: number }> {
  const cols = Math.max(1, Math.round((spec.repeat.lengthMm / 10) * picksPerCm));
  const rows = Math.max(1, Math.round((spec.widthMm / 10) * endsPerCm));
  if (cols > 4000 || rows > 4000) {
    throw new LoomExportError('The computed pattern grid is unreasonably large — check the density values.');
  }

  const cell = await renderJacquardCellCanvas(spec, 8);

  const raw = document.createElement('canvas');
  raw.width = cols;
  raw.height = rows;
  const rctx = raw.getContext('2d');
  if (!rctx) throw new LoomExportError('Canvas is not available in this browser.');
  rctx.imageSmoothingEnabled = true;
  rctx.drawImage(cell, 0, 0, raw.width, raw.height);
  const dataGridPng = raw.toDataURL('image/png');

  const CELL_PX = 6;
  const preview = document.createElement('canvas');
  preview.width = raw.width * CELL_PX;
  preview.height = raw.height * CELL_PX;
  const pctx = preview.getContext('2d');
  if (!pctx) throw new LoomExportError('Canvas is not available in this browser.');
  pctx.imageSmoothingEnabled = false;
  pctx.drawImage(raw, 0, 0, preview.width, preview.height);
  const previewPng = preview.toDataURL('image/png');

  return { dataGridPng, previewPng, cols, rows };
}

// ---------------------------------------------------------------------------
// Package + download
// ---------------------------------------------------------------------------

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export interface BuildLoomExportOptions {
  spec: DesignSpec;
  productionSpec: ProductionSpec | null;
  meta: { designCode: string; revisionNo: number; preparedBy: string };
}

export interface PatternGridStatus {
  included: boolean;
  /** Set only when included is false. */
  reason?: 'not-jacquard' | 'no-artwork' | 'no-density';
}

export async function buildLoomExportZip(
  opts: BuildLoomExportOptions
): Promise<{ blob: Blob; filename: string; patternGrid: PatternGridStatus }> {
  const { spec, productionSpec, meta } = opts;
  if (!productionSpec || !productionSpec.details.constructionType?.trim()) {
    throw new LoomExportError(
      'Save a production specification with at least a construction type before exporting loom/CAD data.'
    );
  }

  const zip = new JSZip();
  zip.file('loom-data.csv', buildLoomDataCsv(spec, productionSpec, meta));

  let patternGrid: PatternGridStatus = { included: false, reason: 'not-jacquard' };
  if (spec.family === 'J') {
    const j = spec as JacquardSpec;
    if (j.artwork.length === 0) {
      patternGrid = { included: false, reason: 'no-artwork' };
    } else {
      const endsPerCm = parsePositive(productionSpec.details.endsPerCm);
      const picksPerCm = parsePositive(productionSpec.details.picksPerCm);
      if (endsPerCm && picksPerCm) {
        const { dataGridPng, previewPng } = await buildPatternGridPngs(j, endsPerCm, picksPerCm);
        zip.file('pattern-grid.png', dataUrlToBase64(dataGridPng), { base64: true });
        zip.file('pattern-grid-preview.png', dataUrlToBase64(previewPng), { base64: true });
        patternGrid = { included: true };
      } else {
        patternGrid = { included: false, reason: 'no-density' };
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${meta.designCode}-${revisionLabel(meta.revisionNo)}_loom-cad-export.zip`;
  return { blob, filename, patternGrid };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
