/**
 * Weave-texture <pattern> defs and the sheen gradient shared by every fabric
 * strip. Kept as thin geometric strokes (no feTurbulence filters) so the
 * preview stays fast even with many repeat cells on screen.
 */
import type { Family, RibAppearance } from '../../lib/types';
import { hexToRgb, isLight, rgbToHex } from '../../lib/color';

function textureStroke(baseColor: string): string {
  return isLight(baseColor) ? '#0f172a' : '#ffffff';
}

/**
 * Lighten (amount > 0) or darken (amount < 0) a hex color toward
 * white/black. `amount` is 0–1. Falls back to the input color if it can't
 * be parsed (defensive — colors are validated at input time elsewhere).
 */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(amount));
  const mix = (c: number) => c + (target - c) * k;
  return rgbToHex({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) });
}

/** Lane height (mm) for the woven ribbed cross-lane texture, by appearance. */
export const WOVEN_RIB_LANE_MM: Record<RibAppearance, number> = {
  fine: 1.2,
  medium: 2,
  bold: 3.2,
};

/** Wale (rib line) height (mm) for the knitted ribbed texture, by appearance. */
export const KNIT_RIB_COLUMN_MM: Record<RibAppearance, number> = {
  fine: 1,
  medium: 1.8,
  bold: 3,
};

/**
 * Woven "ribbed" style: thin lanes stacked across the fabric WIDTH (each
 * lane runs the full length of the strip), alternating a lightened and
 * darkened tint of the base color. This mimics corded/ribbed woven elastic,
 * where the ribs run along the length — not the width — of the tape.
 */
export function WovenRibTexture({
  id,
  baseColor,
  ribAppearance,
}: {
  id: string;
  baseColor: string;
  ribAppearance: RibAppearance;
}) {
  const lane = WOVEN_RIB_LANE_MM[ribAppearance];
  const light = shade(baseColor, 0.16);
  const dark = shade(baseColor, -0.14);
  return (
    <pattern id={id} width={4} height={lane * 2} patternUnits="userSpaceOnUse">
      <rect x={0} y={0} width={4} height={lane} fill={light} />
      <rect x={0} y={lane} width={4} height={lane} fill={dark} />
    </pattern>
  );
}

/**
 * Knitted "ribbed" style: like the woven cords, the wales (rib lines) of a
 * narrow knitted elastic run in the PRODUCTION direction — along the length
 * of the tape — so the lanes are stacked across the width, exactly like the
 * woven rib orientation. The knit version reads softer: gentler contrast and
 * a thin groove line between wales, with the knit-loop chevron texture
 * layered on top elsewhere.
 */
export function KnittedRibTexture({
  id,
  baseColor,
  ribAppearance,
}: {
  id: string;
  baseColor: string;
  /** Kept optional for call-site compatibility; unused. */
  heightMm?: number;
  ribAppearance: RibAppearance;
}) {
  const lane = KNIT_RIB_COLUMN_MM[ribAppearance];
  const light = shade(baseColor, 0.1);
  const dark = shade(baseColor, -0.08);
  const groove = shade(baseColor, -0.28);
  return (
    <pattern id={id} width={4} height={lane * 2} patternUnits="userSpaceOnUse">
      <rect x={0} y={0} width={4} height={lane} fill={light} />
      <rect x={0} y={lane} width={4} height={lane} fill={dark} />
      <line x1={0} y1={lane} x2={4} y2={lane} stroke={groove} strokeWidth={Math.min(0.25, lane * 0.14)} opacity={0.5} />
      <line x1={0} y1={lane * 2} x2={4} y2={lane * 2} stroke={groove} strokeWidth={Math.min(0.25, lane * 0.14)} opacity={0.5} />
    </pattern>
  );
}

export function TextureDefs({
  id,
  family,
  baseColor,
}: {
  id: string;
  family: Family;
  baseColor: string;
}) {
  const stroke = textureStroke(baseColor);

  if (family === 'W') {
    // Fine diagonal twill lines, ~0.6mm pitch.
    return (
      <pattern id={id} width={1.2} height={1.2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={1.2} stroke={stroke} strokeWidth={0.18} opacity={0.22} />
      </pattern>
    );
  }

  if (family === 'K') {
    // Tiny knit-loop chevron rows.
    return (
      <pattern id={id} width={2.4} height={1.6} patternUnits="userSpaceOnUse">
        <path d="M0,1.6 L1.2,0.3 L2.4,1.6" fill="none" stroke={stroke} strokeWidth={0.16} opacity={0.2} />
      </pattern>
    );
  }

  // Jacquard: fine crosshatch grain.
  return (
    <pattern id={id} width={1.6} height={1.6} patternUnits="userSpaceOnUse">
      <line x1={0} y1={0} x2={1.6} y2={1.6} stroke={stroke} strokeWidth={0.12} opacity={0.16} />
      <line x1={1.6} y1={0} x2={0} y2={1.6} stroke={stroke} strokeWidth={0.12} opacity={0.16} />
    </pattern>
  );
}

/** Soft vertical sheen (white -> transparent -> black) for a rounded-fabric look. */
export function SheenGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.22} />
      <stop offset="45%" stopColor="#ffffff" stopOpacity={0} />
      <stop offset="60%" stopColor="#000000" stopOpacity={0} />
      <stop offset="100%" stopColor="#000000" stopOpacity={0.16} />
    </linearGradient>
  );
}
