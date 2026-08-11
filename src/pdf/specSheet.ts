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
  WeavabilityResult,
  WovenSpec,
  WovenStripe,
} from '../lib/types';
import { COMPANY, FAMILY_BY_CODE, PDF_PREVIEW_DISCLAIMER, TECHNICAL_REVIEW_DISCLAIMER } from '../lib/constants';
import { revisionLabel } from '../lib/ids';
import { mmToIn } from '../lib/units';
import { hexToRgb } from '../lib/color';
import { qrDataUrl } from './qr';

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
  doc.text(hex.toUpperCase(), VALUE_X + 7, y);
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
  return y + 4.6;
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
  const maxH = 82;
  y = pageBreakIfNeeded(doc, y, maxH + 14);
  const boxX = CONTENT_X + (CONTENT_W - maxW) / 2;

  doc.setDrawColor(...SLATE_300);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.rect(boxX, y, maxW, maxH, 'FD');

  if (previewPng) {
    try {
      const dims = await loadImageDims(previewPng);
      const fitScale = Math.min(maxW / dims.width, maxH / dims.height);
      const imgW = dims.width * fitScale;
      const imgH = dims.height * fitScale;
      const ix = boxX + (maxW - imgW) / 2;
      const iy = y + (maxH - imgH) / 2;
      doc.addImage(previewPng, imageFormatFor(previewPng), ix, iy, imgW, imgH);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...SLATE_400);
      doc.text('Preview not available', boxX + maxW / 2, y + maxH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_400);
    doc.text('Preview not available', boxX + maxW / 2, y + maxH / 2, { align: 'center' });
  }

  y += maxH + 4;
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
  y = kvRow(doc, y, 'Width', `${spec.widthMm.toFixed(1)} mm (${widthIn}")`);
  y = kvRow(doc, y, 'Roll Length', `${spec.rollLengthM} m`);
  y = kvRow(
    doc,
    y,
    'Elastic',
    spec.elastic ? `Yes${spec.elasticityClass ? ` — ${spec.elasticityClass} stretch` : ''}` : 'No'
  );
  y = kvRow(doc, y, 'Thickness Class', spec.thicknessClass);
  if (spec.construction) y = kvRow(doc, y, 'Construction', spec.construction);
  y = kvRow(doc, y, 'Edge Style', spec.edgeStyle);
  y = kvRow(doc, y, 'Application', spec.application);

  y = sectionHeader(doc, y, 'Colors');
  y = colorRow(doc, y, 'Base Color', spec.baseColor);
  y = colorRow(doc, y, 'Secondary Color', spec.secondaryColor);
  y = colorRow(doc, y, 'Edge Color', spec.edgeColor);
  y = additionalColorsRow(doc, y, spec.additionalColors);

  if (spec.family === 'J') {
    const j = spec as JacquardSpec;
    y = sectionHeader(doc, y, 'Jacquard Detail');
    y = colorRow(doc, y, 'Foreground Color', j.fg);
    y = kvRow(doc, y, 'Repeat Length', `${j.repeat.lengthMm.toFixed(1)} mm`);
    y = kvRow(doc, y, 'Repeat Spacing', `${j.repeat.spacingMm.toFixed(1)} mm`);
    y = kvRow(doc, y, 'Mirror', j.repeat.mirror ? 'Yes' : 'No');
    y = kvRow(doc, y, 'Reverse', j.repeat.reverse ? 'Yes' : 'No');
    y = artworkRows(doc, y, j.artwork);
  } else if (spec.family === 'W') {
    const w = spec as WovenSpec;
    y = sectionHeader(doc, y, 'Woven Detail');
    y = kvRow(doc, y, 'Rubber', w.rubber);
    y = stripeRows(doc, y, w.stripes);
  } else {
    const k = spec as KnittedSpec;
    y = sectionHeader(doc, y, 'Knitted Detail');
    y = kvRow(doc, y, 'Rubber', k.rubber ? 'Yes' : 'No');
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
// QR + signature closing block
// ---------------------------------------------------------------------------

async function drawClosing(doc: jsPDF, y: number, rec: DesignRecord): Promise<number> {
  const blockH = 62;
  y = pageBreakIfNeeded(doc, y, blockH);
  y += 3;

  const qrSize = 26;
  const slug = FAMILY_BY_CODE[rec.family]?.slug ?? 'design';
  const url = `${COMPANY.website}/studio/${slug}/${rec.id}`;
  let qr: string | null = null;
  try {
    qr = await qrDataUrl(url, 300);
  } catch {
    qr = null;
  }

  const qrX = CONTENT_X + CONTENT_W - qrSize;
  if (qr) {
    doc.addImage(qr, 'PNG', qrX, y, qrSize, qrSize);
  } else {
    doc.setDrawColor(...SLATE_300);
    doc.rect(qrX, y, qrSize, qrSize);
  }
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_900);
  doc.text(rec.designCode, qrX + qrSize / 2, y + qrSize + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  const noteLines = doc.splitTextToSize('Scan to view this design online.', CONTENT_W - qrSize - 10) as string[];
  doc.text(noteLines, CONTENT_X, y + qrSize / 2);

  const sigY = y + qrSize + 12;
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = await drawHeader(doc);
  y = drawMetaGrid(doc, y, rec);
  y = drawCustomerBlock(doc, y);
  y = await drawPreview(doc, y, previewPng);
  y = drawSpecTable(doc, y, rec.spec);
  y = drawWeavability(doc, y, rec.weavability);
  await drawClosing(doc, y, rec);

  stampFooters(doc);

  return doc.output('blob');
}
