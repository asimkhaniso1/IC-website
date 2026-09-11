/**
 * Production CAD / Loom Export — internal-only. Packages the APPROVED
 * production specification plus the customer design's structural data into a
 * downloadable ZIP for the technical/production team:
 *
 *   loom-data.csv          — full construction & technical data sheet
 *   pattern-grid.png       — Jacquard only: one pixel per warp-end × weft-pick
 *                            intersection, sized from the approved ends/cm and
 *                            picks/cm density. Every pixel is quantized to the
 *                            design's own declared yarn colors (never a
 *                            smoothed/blended shade — a loom can't weave a
 *                            color that isn't one of its loaded yarns), so
 *                            this is a true discrete design graph, not a
 *                            photo. This is the raster most jacquard
 *                            CAD/loom-preparation tools ingest.
 *   pattern-grid.bmp        — the same grid as an uncompressed 24-bit BMP —
 *                            for basic embedded jacquard controllers that
 *                            read a design straight off a USB stick with no
 *                            PC software, which usually can't decode PNG.
 *   pattern-grid-preview.png — the same grid, nearest-neighbor magnified so a
 *                            human can sanity-check it without CAD software.
 *   color-key.csv           — which color plays which role (Base/Ground,
 *                            Motif, Secondary, ...) with its yarn shade name
 *                            — answers "which warp/weft, what colour" for
 *                            every cell in the grid above.
 *
 * This does not talk to any loom controller or vendor CAD system — there is
 * no such integration configured for this deployment (that would need to
 * know which specific control software/protocol your looms actually take
 * input from). It turns data the technical team already entered and
 * approved into a portable, loom-agnostic package. Verify against your
 * specific loom/CAD software's exact format requirements before use on the
 * floor.
 */
import JSZip from 'jszip';
import { TECHNICAL_FIELD_DEFS } from '../pages/admin/components/ProductionSpecPanel';
import { FAMILY_BY_CODE } from './constants';
import { revisionLabel } from './ids';
import { colorLabel } from '../studio/color/naming';
import type { DesignSpec, JacquardSpec, KnittedSpec, ProductionSpec, WovenSpec } from './types';
import { buildJacquardPalette, buildPatternGridCanvas, type PaletteEntry } from './jacquardGraph';

export { buildJacquardPalette } from './jacquardGraph';
export type { PaletteEntry } from './jacquardGraph';

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
export function parsePositiveDensity(s: string | undefined): number | null {
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

  const endsPerCm = parsePositiveDensity(productionSpec.details.endsPerCm);
  const picksPerCm = parsePositiveDensity(productionSpec.details.picksPerCm);
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

/**
 * Encodes `canvas` as an uncompressed 24-bit BMP — no PNG-style compression,
 * which makes it the format most basic embedded jacquard controllers can
 * decode (some only take a design via a bitmap dropped on a USB stick, no PC
 * software at all). Canvas has no native BMP export, so this writes the
 * file byte-for-byte per the standard BITMAPFILEHEADER/BITMAPINFOHEADER
 * layout: bottom-up row order, BGR pixel order, rows padded to 4 bytes.
 * Transparent pixels are composited onto white — BMP-24 has no alpha channel.
 */
export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new LoomExportError('Canvas is not available in this browser.');
  const { data } = ctx.getImageData(0, 0, w, h);

  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const pixelArraySize = rowSize * h;
  const fileSize = 54 + pixelArraySize;

  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);

  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true); // pixel data offset

  view.setUint32(14, 40, true); // DIB header size (BITMAPINFOHEADER)
  view.setInt32(18, w, true);
  view.setInt32(22, h, true); // positive height = bottom-up row order
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // compression: none
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 0, true);
  view.setInt32(42, 0, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  let offset = 54;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const alpha = data[i + 3] / 255;
      const r = Math.round(data[i] * alpha + 255 * (1 - alpha));
      const g = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
      const b = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
      view.setUint8(offset++, b);
      view.setUint8(offset++, g);
      view.setUint8(offset++, r);
    }
    for (let p = 0; p < rowSize - w * 3; p++) view.setUint8(offset++, 0);
  }

  return new Blob([buf], { type: 'image/bmp' });
}

/**
 * Builds a self-contained (spec-only, no live preview dependency) pattern
 * grid with one pixel per warp-end × weft-pick intersection — the raw raster
 * format most jacquard CAD/loom-prep tools ingest — plus a nearest-neighbor
 * magnified copy for human review, and an uncompressed BMP of the same grid
 * for basic hardware that can't decode PNG. Every pixel is quantized to the
 * design's actual declared colors (see buildJacquardPalette) so the graph
 * only ever contains colors that exist as real yarn, never a smoothed blend.
 */
export async function buildPatternGridPngs(
  spec: JacquardSpec,
  endsPerCm: number,
  picksPerCm: number
): Promise<{ dataGridPng: string; previewPng: string; gridBmp: Blob; cols: number; rows: number }> {
  let raw: HTMLCanvasElement;
  try {
    raw = await buildPatternGridCanvas(spec, endsPerCm, picksPerCm);
  } catch (err) {
    throw err instanceof LoomExportError
      ? err
      : new LoomExportError(err instanceof Error ? err.message : 'Could not build the pattern grid.');
  }
  const { width: cols, height: rows } = raw;
  const dataGridPng = raw.toDataURL('image/png');
  const gridBmp = canvasToBmpBlob(raw);

  const CELL_PX = 6;
  const preview = document.createElement('canvas');
  preview.width = raw.width * CELL_PX;
  preview.height = raw.height * CELL_PX;
  const pctx = preview.getContext('2d');
  if (!pctx) throw new LoomExportError('Canvas is not available in this browser.');
  pctx.imageSmoothingEnabled = false;
  pctx.drawImage(raw, 0, 0, preview.width, preview.height);
  const previewPng = preview.toDataURL('image/png');

  return { dataGridPng, previewPng, gridBmp, cols, rows };
}

/** "which warp/weft, what colour" reference — every distinct color used in the graph, by role and yarn name. */
export function buildColorKeyCsv(palette: PaletteEntry[]): string {
  let csv = csvSection('WARP / WEFT COLOR KEY (for the pattern grid image)');
  csv += csvRow('Role', 'Color (Hex — Yarn / Pantone reference)');
  for (const p of palette) {
    csv += csvRow(p.role, `${p.hex} — ${p.label}`);
  }
  csv +=
    '\n"Every cell in pattern-grid.png is exactly one of the colors above — no blended shades. Base / Ground is the warp/ground color; Motif and any other listed colors are the pattern colors placed by weft/color-change according to the artwork."\n';
  return csv;
}

// ---------------------------------------------------------------------------
// Package + download
// ---------------------------------------------------------------------------

function dataUrlToBlob(dataUrl: string): Blob {
  const headerEnd = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, headerEnd);
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(dataUrl.slice(headerEnd + 1)), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function sha256(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) return 'unavailable';
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildValidationChecklistCsv(meta: { designCode: string; revisionNo: number; preparedBy: string }): string {
  let csv = csvSection('JACQUARD OPERATOR / CAD VALIDATION');
  csv += csvRow('Design', meta.designCode);
  csv += csvRow('Revision', revisionLabel(meta.revisionNo));
  csv += csvRow('Prepared By', meta.preparedBy);
  csv += csvRow('Validation Status', 'PENDING');
  csv += '\nCheck,Result (Pass/Fail),Notes\n';
  for (const check of [
    'Pattern-grid PNG opens and dimensions match manifest',
    'Pattern-grid BMP imports into the actual CAD/controller',
    'Warp-end and weft-pick orientation confirmed',
    'Yarn/color sequence matches color-key.csv',
    'Repeat joins correctly without unintended gap or overlap',
    'Test weave matches approved artwork and finished width',
    'Operator/CAD approval recorded',
  ]) csv += `${csvEscape(check)},,\n`;
  csv += '\nOperator Name,,\nCAD / Controller,,\nMachine / Loom,,\nValidation Date,,\nFinal Decision,,\nSignature / Reference,,\n';
  return csv;
}

export interface BuildLoomExportOptions {
  spec: DesignSpec;
  productionSpec: ProductionSpec | null;
  meta: { designCode: string; revisionNo: number; preparedBy: string };
  patternGridOverride?: { dataGridPng: string; previewPng: string; gridBmp: Blob };
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
      const endsPerCm = parsePositiveDensity(productionSpec.details.endsPerCm);
      const picksPerCm = parsePositiveDensity(productionSpec.details.picksPerCm);
      if (endsPerCm && picksPerCm) {
        const { dataGridPng, previewPng, gridBmp } = opts.patternGridOverride
          ?? await buildPatternGridPngs(j, endsPerCm, picksPerCm);
        const gridPng = dataUrlToBlob(dataGridPng);
        const preview = dataUrlToBlob(previewPng);
        zip.file('pattern-grid.png', gridPng);
        zip.file('pattern-grid.bmp', gridBmp);
        zip.file('pattern-grid-preview.png', preview);
        zip.file('color-key.csv', buildColorKeyCsv(buildJacquardPalette(j)));
        zip.file('operator-cad-validation.csv', buildValidationChecklistCsv(meta));

        const cols = Math.max(1, Math.round((j.repeat.lengthMm / 10) * picksPerCm));
        const rows = Math.max(1, Math.round((j.widthMm / 10) * endsPerCm));
        zip.file('technical-graph-manifest.json', JSON.stringify({
          schemaVersion: 1,
          status: 'PENDING_OPERATOR_CAD_VALIDATION',
          designCode: meta.designCode,
          revision: revisionLabel(meta.revisionNo),
          generatedAt: new Date().toISOString(),
          preparedBy: meta.preparedBy,
          productionSpecification: {
            id: productionSpec.id,
            status: productionSpec.status,
            updatedAt: productionSpec.updatedAt,
            constructionType: productionSpec.details.constructionType,
          },
          graph: {
            columns: cols,
            columnAxis: 'weft-picks',
            rows,
            rowAxis: 'warp-ends',
            endsPerCm,
            picksPerCm,
            finishedWidthMm: j.widthMm,
            repeatLengthMm: j.repeat.lengthMm,
            repeatSpacingMm: j.repeat.spacingMm,
          },
          palette: buildJacquardPalette(j),
          files: {
            'pattern-grid.png': { bytes: gridPng.size, sha256: await sha256(gridPng) },
            'pattern-grid.bmp': { bytes: gridBmp.size, sha256: await sha256(gridBmp) },
            'pattern-grid-preview.png': { bytes: preview.size, sha256: await sha256(preview) },
          },
        }, null, 2));
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
