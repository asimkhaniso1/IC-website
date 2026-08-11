import type { EdgeStyle } from '../../lib/types';

/**
 * Build a repeating edge-decoration path for the top or bottom of a strip.
 * Returns null for 'straight' (rendered as a plain thin line by the caller).
 */
export function edgePath(
  style: EdgeStyle,
  lengthMm: number,
  side: 'top' | 'bottom',
  stripHeightMm: number
): string | null {
  if (style === 'straight' || lengthMm <= 0) return null;

  const bumpSize =
    style === 'picot' ? Math.min(1.6, Math.max(0.4, stripHeightMm * 0.12)) : Math.min(4, Math.max(0.8, stripHeightMm * 0.28));
  const count = Math.max(1, Math.round(lengthMm / (bumpSize * 2.2)));
  const step = lengthMm / count;
  const baseY = side === 'top' ? 0 : stripHeightMm;
  const dir = side === 'top' ? -1 : 1;

  let d = `M0,${baseY}`;
  for (let i = 0; i < count; i += 1) {
    const x1 = (i + 1) * step;
    if (style === 'picot') {
      // Small semicircle bumps, alternating outward along the edge.
      const sweep = side === 'top' ? 0 : 1;
      d += ` A${step / 2},${bumpSize} 0 0 ${sweep} ${x1},${baseY}`;
    } else {
      // Larger smooth scallops.
      const xm = x1 - step / 2;
      d += ` Q${xm},${baseY + dir * bumpSize} ${x1},${baseY}`;
    }
  }
  return d;
}
