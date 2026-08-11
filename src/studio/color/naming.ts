/**
 * Shared color-naming lookup — resolves a hex value to the nearest
 * Interconverters yarn shade and/or Pantone reference, for display in the
 * color picker, spec summary panel and the generated spec PDF.
 */
import { hexToRgb, normalizeHex } from '../../lib/color';
import { PANTONE_REFERENCES } from './pantone';
import { YARN_SHADE_CARD } from './yarnShades';

export interface ColorMatch {
  yarn: { code: string; name: string } | null;
  pantone: { code: string; name: string } | null;
  exact: boolean;
}

/** Squared-distance closeness threshold (~80 per RGB channel), same heuristic as the legacy PDF yarn matcher. */
const CLOSE_THRESHOLD_SQ = 3 * 80 ** 2;
/** Squared-distance threshold under which a match counts as an exact/near-exact hit (~4 per channel). */
const EXACT_THRESHOLD_SQ = 3 * 4 ** 2;

function nearestEntry<T extends { hex: string }>(
  hex: string,
  library: T[]
): { entry: T; distSq: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let best: { entry: T; distSq: number } | null = null;
  for (const entry of library) {
    const c = hexToRgb(entry.hex);
    if (!c) continue;
    const distSq = (rgb.r - c.r) ** 2 + (rgb.g - c.g) ** 2 + (rgb.b - c.b) ** 2;
    if (!best || distSq < best.distSq) best = { entry, distSq };
  }
  return best;
}

/** Nearest yarn shade and/or Pantone reference for a hex color, with a closeness cutoff. */
export function describeColor(hex: string): ColorMatch {
  const norm = normalizeHex(hex) ?? hex;
  const yarnBest = nearestEntry(norm, YARN_SHADE_CARD);
  const pantoneBest = nearestEntry(norm, PANTONE_REFERENCES);

  const yarn =
    yarnBest && yarnBest.distSq < CLOSE_THRESHOLD_SQ
      ? { code: yarnBest.entry.code, name: yarnBest.entry.name }
      : null;
  const pantone =
    pantoneBest && pantoneBest.distSq < CLOSE_THRESHOLD_SQ
      ? { code: pantoneBest.entry.code, name: pantoneBest.entry.name }
      : null;

  const exact =
    (yarnBest !== null && yarnBest.distSq < EXACT_THRESHOLD_SQ) ||
    (pantoneBest !== null && pantoneBest.distSq < EXACT_THRESHOLD_SQ);

  return { yarn, pantone, exact };
}

/** Short display label for a hex color, e.g. "Navy (IC-004)" or "PANTONE 186 C" or the bare hex when nothing is close. */
export function colorLabel(hex: string): string {
  const norm = normalizeHex(hex);
  if (!norm) return hex;
  const { yarn, pantone } = describeColor(norm);
  if (yarn) return `${yarn.name} (${yarn.code})`;
  if (pantone) return `${pantone.name} (PANTONE ${pantone.code})`;
  return norm.toUpperCase();
}
