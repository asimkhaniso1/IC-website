/**
 * Weave-texture <pattern> defs and the sheen gradient shared by every fabric
 * strip. Kept as thin geometric strokes (no feTurbulence filters) so the
 * preview stays fast even with many repeat cells on screen.
 */
import type { Family } from '../../lib/types';
import { isLight } from '../../lib/color';

function textureStroke(baseColor: string): string {
  return isLight(baseColor) ? '#0f172a' : '#ffffff';
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
