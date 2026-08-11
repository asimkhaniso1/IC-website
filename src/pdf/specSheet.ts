/**
 * Technical Design Specification / Development Sheet — A4 portrait PDF.
 * Pure client-side generation (jsPDF); no server round-trip required.
 */
import { jsPDF } from 'jspdf';
import type {
  ArtworkItem,
  DesignRecord,
  DesignSpec,
  Feasibility,
  JacquardSpec,
  KnittedSpec,
  TechnicalDetails,
  WeavabilityResult,
  WovenSpec,
  WovenStripe,
} from '../lib/types';
import {
  COMPANY,
  ELASTICITY_CLASSES,
  FAMILY_BY_CODE,
  PDF_PREVIEW_DISCLAIMER,
  TECHNICAL_REVIEW_DISCLAIMER,
} from '../lib/constants';
import { revisionLabel } from '../lib/ids';
import { mmToIn } from '../lib/units';
import { hexToRgb } from '../lib/color';
import { YARN_PALETTE } from '../studio/color/palette';
import { qrDataUrl } from './qr';

/** "standard" → "Standard" for cleaner presentation of enum-ish values. */
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Nearest yarn shade name for a hex color, e.g. "#1E293B" → "Navy". */
function nearestYarnName(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let best: { name: string; d: number } | null = null;
  for (const shade of YARN_PALETTE) {
    const s = hexToRgb(shade.hex);
    if (!s) continue;
    const d = (rgb.r - s.r) ** 2 + (rgb.g - s.g) ** 2 + (rgb.b - s.b) ** 2;
    if (!best || d < best.d) best = { name: shade.name, d };
  }
  // Only claim a name when reasonably close (distance threshold ~80 per channel).
  return best && best.d < 3 * 80 ** 2 ? best.name : null;
}

// ---------------------------------------------------------------------------
// Layout constants (mm, A4 portrait = 210 x 297)
// ---------------------------------------------------------------------------

const PAGE_W = 210;
const MARGIN = 15;
const CONTENT_X = MARGIN;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LABEL_W = 52;
const VALUE_X = CONTENT_X + LABEL_W + 3;
const VALUE_W = CONTENT_W - LABEL_W - 3;
const BREAK_Y = 270;
const FOOTER_Y = 291;

const BRAND: [number, number, number] = [0, 74, 153];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_400: [number, number, number] = [148, 163, 184];
const SLATE_300: [number, number, number] = [203, 213, 225];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_50: [number, number, number] = [248, 250, 252];
const GREEN: [number, number, number] = [22, 163, 74];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------

function pageBreakIfNeeded(doc: jsPDF, y: number, needed = 8): number {
  if (y + needed > BREAK_Y) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function safeRgb(hex: string | undefined): [number, number, number] {
  const rgb = hex ? hexToRgb(hex) : null;
  return rgb ? [rgb.r, rgb.g, rgb.b] : [203, 213, 225];
}

function sectionHeader(doc: jsPDF, y: number, title: string): number {
  y = pageBreakIfNeeded(doc, y, 14);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND);
  doc.text(title.toUpperCase(), CONTENT_X, y);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(CONTENT_X, y + 1.6, CONTENT_X + CONTENT_W, y + 1.6);
  return y + 7;
}

function rowDivider(doc: jsPDF, y: number): void {
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.15);
  doc.line(CONTENT_X, y, CONTENT_X + CONTENT_W, y);
}

function kvRow(doc: jsPDF, y: number, label: string, value: string): number {
  y = pageBreakIfNeeded(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...SLATE_500);
  doc.text(label.toUpperCase(), CONTENT_X, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_900);
  const lines = doc.splitTextToSize(value && value.trim() ? value : '—', VALUE_W) as string[];
  doc.text(lines, VALUE_X, y);
  const rowH = Math.max(6, lines.length * 4.2) + 2.4;
  rowDivider(doc, y + rowH - 1.6);
  return y + rowH;
}

function colorRow(doc: jsPDF, y: number, label: string, hex?: string): number {
  if (!hex) return y;
  y = pageBreakIfNeeded(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...SLATE_500);
  doc.text(label.toUpperCase(), CONTENT_X, y);
  const [r, g, b] = safeRgb(hex);
  doc.setFillColor(r, g, b);
  doc.setDrawColor(...SLATE_300);
  doc.setLineWidth(0.2);
  doc.rect(VALUE_X, y - 3.4, 4.4, 4.4, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_900);
  const yarn = nearestYarnName(hex);
  doc.text(yarn ? `${yarn}  ·  ${hex.toUpperCase()}` : hex.toUpperCase(), VALUE_X + 7, y);
  const rowH = 7.6;
  rowDivider(doc, y + rowH - 1.6);
  return y + rowH;
}

function additionalColorsRow(doc: jsPDF, y: number, colors: string[] | undefined): number {
  if (!colors || colors.length === 0) return y;
  y = pageBreakIfNeeded(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...SLATE_500);
  doc.text('ADDITIONAL COLORS', CONTENT_X, y);
  let cx = VALUE_X;
  const top = y - 3.4;
  colors.forEach((hex) => {
    const [r, g, b] = safeRgb(hex);
    doc.setFillColor(r, g, b);
    doc.setDrawColor(...SLATE_300);
    doc.rect(cx, top, 4.4, 4.4, 'FD');
    cx += 6.6;
  });
  const rowH = 7.6;
  rowDivider(doc, y + rowH - 1.6);
  return y + rowH;
}

function listHeader(doc: jsPDF, y: number, label: string): number {
  y = pageBreakIfNeeded(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...SLATE_500);
  doc.text(label.toUpperCase(), CONTENT_X, y);
  return y; // first list item shares the label's baseline, like kvRow values
}

function closeList(doc: jsPDF, y: number): number {
  rowDivider(doc, y - 1.4);
  return y + 1.6;
}

function artworkRows(doc: jsPDF, y: number, items: ArtworkItem[]): number {
  if (!items.length) return kvRow(doc, y, 'Artwork', 'None');
  y = listHeader(doc, y, 'Artwork Items');
  items.forEach((item, idx) => {
    y = pageBreakIfNeeded(doc, y, 6);
    const size = `${item.transform.widthMm.toFixed(1)} × ${item.transform.heightMm.toFixed(1)} mm`;
    const desc = item.kind === 'text' ? `Text "${item.text ?? ''}"` : 'Image';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    doc.text(`${idx + 1}. ${desc} — ${size}${item.transform.mirrored ? ' (mirrored)' : ''}`, VALUE_X, y);
    y += 5;
  });
  return closeList(doc, y);
}

function stripeRows(doc: jsPDF, y: number, stripes: WovenStripe[]): number {
  if (!stripes.length) return kvRow(doc, y, 'Stripes', 'None');
  y = listHeader(doc, y, 'Stripe Sequence');
  stripes.forEach((s, idx) => {
    y = pageBreakIfNeeded(doc, y, 6);
    const [r, g, b] = safeRgb(s.color);
    doc.setFillColor(r, g, b);
    doc.setDrawColor(...SLATE_300);
    doc.rect(VALUE_X, y - 3.4, 4.2, 4.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    doc.text(
      `${idx + 1}. ${s.color.toUpperCase()} — width ${s.widthMm.toFixed(1)} mm, offset ${s.offsetMm.toFixed(1)} mm`,
      VALUE_X + 6.5,
      y
    );
    y += 5.4;
  });
  return closeList(doc, y);
}

async function loadImageDims(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('logo load failed'));
      el.src = COMPANY.logo;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0 || canvas.height === 0) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function imageFormatFor(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
}

/**
 * Re-encode an image data URL as a bounded-size JPEG on a white background.
 * Keeps the PDF small — full-resolution PNG previews were inflating files
 * to many megabytes.
 */
async function toCompactJpeg(dataUrl: string, maxDim = 1400, quality = 0.82): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image load failed'));
    el.src = dataUrl;
  });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return dataUrl;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// ---------------------------------------------------------------------------
// Header / meta / customer / preview blocks
// ---------------------------------------------------------------------------

async function drawHeader(doc: jsPDF): Promise<number> {
  const logo = await loadLogoDataUrl();
  let y = MARGIN;

  if (logo) {
    try {
      const dims = await loadImageDims(logo);
      const boxH = 20;
      const boxW = Math.min(28, (dims.width / dims.height) * boxH);
      doc.addImage(logo, imageFormatFor(logo), CONTENT_X, y, boxW, boxH);
    } catch {
      /* ignore broken logo */
    }
  }

  const textX = CONTENT_X + 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE_900);
  doc.text(COMPANY.name, textX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...SLATE_500);
  const addrLines = doc.splitTextToSize(COMPANY.address, 95) as string[];
  doc.text(addrLines, textX, y + 10);
  doc.text(`${COMPANY.email}  |  ${COMPANY.phone}`, textX, y + 10 + addrLines.length * 3.6 + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text('DESIGN SPECIFICATION', CONTENT_X + CONTENT_W, y + 5, { align: 'right' });
  doc.setFontSize(10.5);
  doc.setTextColor(...SLATE_600);
  doc.text('/ DEVELOPMENT SHEET', CONTENT_X + CONTENT_W, y + 10.5, { align: 'right' });

  y += 24;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(CONTENT_X, y, CONTENT_X + CONTENT_W, y);
  return y + 8;
}

function drawMetaGrid(doc: jsPDF, y: number, rec: DesignRecord): number {
  const family = FAMILY_BY_CODE[rec.family];
  const items = [
    { label: 'Design ID', value: rec.designCode },
    { label: 'Revision', value: revisionLabel(rec.revisionNo) },
    { label: 'Date', value: new Date().toLocaleDateString() },
    { label: 'Status', value: rec.status },
    { label: 'Product Family', value: family?.label ?? rec.family },
    { label: 'Project Name', value: rec.spec.name || 'Untitled design' },
  ];
  const cols = 3;
  const colW = CONTENT_W / cols;
  const rowH = 14;
  const boxH = rowH * Math.ceil(items.length / cols);
  y = pageBreakIfNeeded(doc, y, boxH + 4);
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.roundedRect(CONTENT_X, y, CONTENT_W, boxH, 2, 2, 'FD');
  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = CONTENT_X + col * colW + 4;
    const ty = y + row * rowH + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...SLATE_500);
    doc.text(it.label.toUpperCase(), x, ty);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_900);
    const lines = doc.splitTextToSize(it.value, colW - 8) as string[];
    doc.text(lines[0] ?? '—', x, ty + 5.4);
  });
  return y + boxH + 7;
}

function drawCustomerBlock(doc: jsPDF, y: number): number {
  y = sectionHeader(doc, y, 'Customer');
  const colW = CONTENT_W / 2 - 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...SLATE_500);
  doc.text('CUSTOMER / CONTACT', CONTENT_X, y);
  doc.text('COMPANY', CONTENT_X + colW + 8, y);
  doc.setDrawColor(...SLATE_300);
  doc.setLineWidth(0.2);
  doc.line(CONTENT_X, y + 6, CONTENT_X + colW, y + 6);
  doc.line(CONTENT_X + colW + 8, y + 6, CONTENT_X + CONTENT_W, y + 6);
  y += 11;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_400);
  doc.text('To be completed from the related sample/quotation request.', CONTENT_X, y);
  return y + 6;
}

async function drawPreview(doc: jsPDF, y: number, previewPng: string): Promise<number> {
  y = sectionHeader(doc, y, 'Fabric Preview');
  const maxW = 170;
  const maxH = 75;
  const minH = 26;
  const pad = 4; // inner padding between border and image
  const boxX = CONTENT_X + (CONTENT_W - maxW) / 2;

  // Size the frame to the image so the preview isn't lost inside an empty box.
  let jpeg: string | null = null;
  let imgW = 0;
  let imgH = 0;
  if (previewPng) {
    try {
      jpeg = await toCompactJpeg(previewPng);
      const dims = await loadImageDims(jpeg);
      const fitScale = Math.min((maxW - pad * 2) / dims.width, (maxH - pad * 2) / dims.height);
      imgW = dims.width * fitScale;
      imgH = dims.height * fitScale;
    } catch {
      jpeg = null;
    }
  }
  const boxH = jpeg ? Math.max(minH, imgH + pad * 2) : minH;
  y = pageBreakIfNeeded(doc, y, boxH + 14);

  doc.setDrawColor(...SLATE_300);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.rect(boxX, y, maxW, boxH, 'FD');

  if (jpeg) {
    doc.addImage(jpeg, 'JPEG', boxX + (maxW - imgW) / 2, y + (boxH - imgH) / 2, imgW, imgH);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_400);
    doc.text('Preview not available', boxX + maxW / 2, y + boxH / 2, { align: 'center' });
  }

  y += boxH + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.6);
  doc.setTextColor(...SLATE_400);
  const capLines = doc.splitTextToSize(PDF_PREVIEW_DISCLAIMER, maxW) as string[];
  doc.text(capLines, CONTENT_X + CONTENT_W / 2, y, { align: 'center' });
  return y + capLines.length * 3.1 + 5;
}

// ---------------------------------------------------------------------------
// Family-specific specification table
// ---------------------------------------------------------------------------

function drawSpecTable(doc: jsPDF, y: number, spec: DesignSpec): number {
  y = sectionHeader(doc, y, 'Specification');

  const widthIn = mmToIn(spec.widthMm).toFixed(2);
  y = kvRow(doc, y, 'Width', `${spec.widthMm.toFixed(1)} mm  (${widthIn} in)`);
  y = kvRow(doc, y, 'Roll Length', `${spec.rollLengthM} m`);

  if (spec.family === 'W' || spec.family === 'K') {
    const style = spec.family === 'W' ? (spec as WovenSpec).style : (spec as KnittedSpec).style;
    y = kvRow(doc, y, 'Style', spec.elastic === false ? 'Non-elastic webbing / tape' : style ? capitalize(style) : '—');
  }

  const elasticityLabel = ELASTICITY_CLASSES.find((e) => e.value === spec.elasticityClass)?.label;
  y = kvRow(
    doc,
    y,
    'Elasticity',
    spec.elastic
      ? `Elastic${elasticityLabel ? ` — ${elasticityLabel}` : ''}`
      : 'Non-elastic (rigid tape / webbing)'
  );

  if (spec.elastic) {
    const stretchValue =
      spec.elasticityClass === 'custom'
        ? `Custom — target ${spec.customElongationPct != null ? `${spec.customElongationPct}%` : '—'}`
        : (elasticityLabel ?? '—');
    y = kvRow(doc, y, 'Stretch', stretchValue);
  }

  if (spec.firmness) y = kvRow(doc, y, 'Firmness', capitalize(spec.firmness));

  y = kvRow(doc, y, 'Thickness Class', capitalize(spec.thicknessClass));
  if (spec.construction) y = kvRow(doc, y, 'Construction', spec.construction);
  y = kvRow(doc, y, 'Edge Style', capitalize(spec.edgeStyle));
  y = kvRow(doc, y, 'Application', spec.application);

  y = sectionHeader(doc, y, 'Colors');
  y = colorRow(doc, y, 'Base Color', spec.baseColor);
  y = colorRow(doc, y, 'Secondary Color', spec.secondaryColor);
  y = colorRow(doc, y, 'Accent Color', spec.accentColor);
  y = colorRow(doc, y, 'Edge Color', spec.edgeColor);
  y = additionalColorsRow(doc, y, spec.additionalColors);

  if (spec.family === 'J') {
    const j = spec as JacquardSpec;
    y = sectionHeader(doc, y, 'Jacquard Detail');
    y = colorRow(doc, y, 'Motif / Foreground', j.fg);
    y = kvRow(doc, y, 'Repeat Length', `${j.repeat.lengthMm.toFixed(1)} mm`);
    y = kvRow(doc, y, 'Repeat Spacing', `${j.repeat.spacingMm.toFixed(1)} mm`);
    y = kvRow(
      doc,
      y,
      'Repeat Options',
      [j.repeat.mirror ? 'Mirrored' : null, j.repeat.reverse ? 'Reversed' : null]
        .filter(Boolean)
        .join(', ') || 'Standard repeat'
    );
    y = artworkRows(doc, y, j.artwork);
  } else if (spec.family === 'W') {
    const w = spec as WovenSpec;
    y = sectionHeader(doc, y, 'Woven Detail');
    y = kvRow(doc, y, 'Rubber / Core', capitalize(w.rubber));
    y = stripeRows(doc, y, w.stripes);
  } else {
    const k = spec as KnittedSpec;
    y = sectionHeader(doc, y, 'Knitted Detail');
    y = kvRow(doc, y, 'Rubber / Core', k.rubber ? 'Yes' : 'No');
  }

  if (spec.notes) {
    y = sectionHeader(doc, y, 'Customer Notes');
    y = pageBreakIfNeeded(doc, y, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_900);
    const lines = doc.splitTextToSize(spec.notes, CONTENT_W) as string[];
    doc.text(lines, CONTENT_X, y);
    y += lines.length * 4.4 + 4;
  }

  return y;
}

// ---------------------------------------------------------------------------
// Customer-provided technical input (optional, reference only)
// ---------------------------------------------------------------------------

const TECHNICAL_LABELS: Record<keyof TechnicalDetails, string> = {
  constructionType: 'Construction Type',
  yarnType: 'Yarn Type',
  yarnCount: 'Yarn Count',
  warpConfig: 'Warp Configuration',
  weftConfig: 'Weft Configuration',
  rubberType: 'Rubber Type',
  rubberConfig: 'Rubber Configuration',
  elasticEnds: 'Elastic Ends',
  picksDensity: 'Picks / Density',
  finishedWidthMm: 'Finished Width (mm)',
  elongationPct: 'Target Elongation (%)',
  recoveryPct: 'Recovery (%)',
  weightPerMeter: 'Weight / Meter',
  gsm: 'GSM',
  thicknessMm: 'Thickness (mm)',
  tolerance: 'Tolerance',
  machineRef: 'Machine Reference',
  finishing: 'Finishing',
  notes: 'Notes',
};

function drawCustomerTechnicalInput(doc: jsPDF, y: number, technical: TechnicalDetails | undefined): number {
  if (!technical) return y;
  const keys = (Object.keys(TECHNICAL_LABELS) as (keyof TechnicalDetails)[]).filter(
    (k) => k !== 'notes' && (technical[k] ?? '').trim().length > 0
  );
  const notes = technical.notes?.trim();
  if (keys.length === 0 && !notes) return y;

  y = sectionHeader(doc, y, 'Customer-Provided Technical Input (for reference)');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_400);
  const capLines = doc.splitTextToSize(
    'Entered by the customer for reference only — not an approved manufacturing parameter.',
    CONTENT_W
  ) as string[];
  y = pageBreakIfNeeded(doc, y, capLines.length * 3 + 6);
  doc.text(capLines, CONTENT_X, y);
  y += capLines.length * 3 + 3.5;

  keys.forEach((key) => {
    y = pageBreakIfNeeded(doc, y, 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_600);
    const label = `${TECHNICAL_LABELS[key]}: `;
    doc.text(label, CONTENT_X, y);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_900);
    const valueLines = doc.splitTextToSize(String(technical[key]), CONTENT_W - labelWidth) as string[];
    doc.text(valueLines, CONTENT_X + labelWidth, y);
    y += Math.max(4.2, valueLines.length * 3.6) + 1;
  });

  if (notes) {
    y = pageBreakIfNeeded(doc, y, 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_600);
    const noteLines = doc.splitTextToSize(`Notes: ${notes}`, CONTENT_W) as string[];
    doc.text(noteLines, CONTENT_X, y);
    y += noteLines.length * 3.6 + 1;
  }

  return y + 4;
}

// ---------------------------------------------------------------------------
// Weavability
// ---------------------------------------------------------------------------

const FEASIBILITY_LABEL: Record<Feasibility, string> = {
  suitable: 'Suitable for standard production',
  review: 'Requires technical review',
  modification: 'Modification likely required',
};

const FEASIBILITY_COLOR: Record<Feasibility, [number, number, number]> = {
  suitable: GREEN,
  review: AMBER,
  modification: RED,
};

function drawWeavability(doc: jsPDF, y: number, weav: WeavabilityResult | undefined): number {
  y = sectionHeader(doc, y, 'Weavability / Manufacturability Check');

  if (!weav) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);
    doc.text('Not yet evaluated.', CONTENT_X, y);
    y += 6;
  } else {
    const color = FEASIBILITY_COLOR[weav.level];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...color);
    doc.text(`Assessment: ${FEASIBILITY_LABEL[weav.level]}`, CONTENT_X, y);
    y += 6.5;

    if (weav.issues.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...SLATE_600);
      doc.text('No issues flagged by the automated check.', CONTENT_X, y);
      y += 6;
    } else {
      for (const issue of weav.issues) {
        y = pageBreakIfNeeded(doc, y, 8);
        const sevColor = issue.severity === 'error' ? RED : issue.severity === 'warn' ? AMBER : SLATE_500;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(...sevColor);
        doc.text(`[${issue.severity.toUpperCase()}]`, CONTENT_X, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(...SLATE_900);
        const lines = doc.splitTextToSize(issue.message, CONTENT_W - 20) as string[];
        doc.text(lines, CONTENT_X + 17, y);
        y += Math.max(5, lines.length * 4.1) + 1.5;
      }
    }
  }

  y += 2;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_400);
  const lines = doc.splitTextToSize(TECHNICAL_REVIEW_DISCLAIMER, CONTENT_W) as string[];
  doc.text(lines, CONTENT_X, y);
  return y + lines.length * 3.2 + 5;
}

// ---------------------------------------------------------------------------
// Internal production specification — always blank on the customer PDF.
// The filled production spec lives only in the admin dashboard
// (production_specs table); it is never populated here.
// ---------------------------------------------------------------------------

const PRODUCTION_SPEC_BLANK_FIELDS = [
  'Construction',
  'Warp',
  'Weft',
  'Elastic Core',
  'Number of Ends',
  'Picks / Density',
  'Target Elongation',
  'Tolerance',
  'Machine Reference',
];

function drawProductionSpecBlank(doc: jsPDF, y: number): number {
  y = sectionHeader(doc, y, 'Production Specification — Interconverters Internal');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.4);
  doc.setTextColor(...SLATE_500);
  const noteLines = doc.splitTextToSize(
    'To be completed by the Interconverters technical team after review. Customer selections above are ' +
      'requirements, not approved manufacturing parameters.',
    CONTENT_W
  ) as string[];
  y = pageBreakIfNeeded(doc, y, noteLines.length * 3.4 + 8);
  doc.text(noteLines, CONTENT_X, y);
  y += noteLines.length * 3.4 + 5;

  const cols = 2;
  const gap = 8;
  const colW = (CONTENT_W - gap) / cols;
  const rowH = 12;
  const rows = Math.ceil(PRODUCTION_SPEC_BLANK_FIELDS.length / cols);
  y = pageBreakIfNeeded(doc, y, rows * rowH + 4);

  PRODUCTION_SPEC_BLANK_FIELDS.forEach((label, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = CONTENT_X + col * (colW + gap);
    const ty = y + row * rowH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...SLATE_500);
    doc.text(label.toUpperCase(), x, ty);
    doc.setDrawColor(...SLATE_300);
    doc.setLineWidth(0.25);
    doc.line(x, ty + 6.5, x + colW, ty + 6.5);
  });

  return y + rows * rowH + 3;
}

// ---------------------------------------------------------------------------
// QR + signature closing block
// ---------------------------------------------------------------------------

async function drawClosing(doc: jsPDF, y: number, rec: DesignRecord): Promise<number> {
  const blockH = 66;
  y = pageBreakIfNeeded(doc, y, blockH);
  y += 3;

  const qrSize = 22;
  const refBoxH = qrSize + 8;
  const slug = FAMILY_BY_CODE[rec.family]?.slug ?? 'design';
  const url = `${COMPANY.website}/studio/${slug}/${rec.id}`;
  let qr: string | null = null;
  try {
    qr = await qrDataUrl(url, 300);
  } catch {
    qr = null;
  }

  // Design-reference band: code + scan note on the left, QR on the right,
  // inside one bordered box so nothing floats.
  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.roundedRect(CONTENT_X, y, CONTENT_W, refBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_500);
  doc.text('DESIGN REFERENCE', CONTENT_X + 5, y + 8);
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND);
  doc.text(rec.designCode, CONTENT_X + 5, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  doc.text(`Revision ${revisionLabel(rec.revisionNo)}  ·  Scan the code to view this design online`, CONTENT_X + 5, y + 22.5);

  const qrX = CONTENT_X + CONTENT_W - qrSize - 4;
  if (qr) {
    doc.addImage(qr, 'PNG', qrX, y + (refBoxH - qrSize) / 2, qrSize, qrSize);
  } else {
    doc.setDrawColor(...SLATE_300);
    doc.rect(qrX, y + (refBoxH - qrSize) / 2, qrSize, qrSize);
  }

  const sigY = y + refBoxH + 8;
  const gap = 5;
  const boxW = (CONTENT_W - gap * 2) / 3;
  const labels = ['Prepared By', 'Reviewed By', 'Approved By'];
  labels.forEach((label, i) => {
    const x = CONTENT_X + i * (boxW + gap);
    doc.setDrawColor(...SLATE_300);
    doc.setLineWidth(0.3);
    doc.rect(x, sigY, boxW, 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...SLATE_500);
    doc.text(label.toUpperCase(), x + 3, sigY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...SLATE_600);
    doc.text('Name: ________________', x + 3, sigY + 13);
    doc.text('Date: ________________', x + 3, sigY + 19);
  });

  return sigY + 22 + 4;
}

function stampFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const generated = new Date().toLocaleString();
  const site = COMPANY.website.replace(/^https?:\/\//, '');
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.2);
    doc.line(CONTENT_X, FOOTER_Y - 4, CONTENT_X + CONTENT_W, FOOTER_Y - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_400);
    doc.text(`Generated ${generated}`, CONTENT_X, FOOTER_Y);
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(site, CONTENT_X + CONTENT_W, FOOTER_Y, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function generateSpecPdf(rec: DesignRecord, previewPng: string): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  let y = await drawHeader(doc);
  y = drawMetaGrid(doc, y, rec);
  y = drawCustomerBlock(doc, y);
  y = await drawPreview(doc, y, previewPng);
  y = drawSpecTable(doc, y, rec.spec);
  y = drawCustomerTechnicalInput(doc, y, rec.spec.technical);
  y = drawWeavability(doc, y, rec.weavability);
  y = drawProductionSpecBlank(doc, y);
  await drawClosing(doc, y, rec);

  stampFooters(doc);

  return doc.output('blob');
}
