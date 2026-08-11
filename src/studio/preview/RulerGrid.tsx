/**
 * mm ruler (top + left), optional 5mm grid, and — for jacquard — dimension
 * callouts (fabric width, active artwork size, repeat length/spacing).
 */
import type { DesignSpec, JacquardSpec, Unit } from '../../lib/types';
import { formatDim } from '../../lib/units';

function clampFont(v: number) {
  return Math.min(4, Math.max(1.4, v));
}

export function RulerGrid({
  spec,
  originX,
  originY,
  lengthMm,
  heightMm,
  showGrid,
  showRuler,
  showDimensions,
}: {
  spec: DesignSpec;
  originX: number;
  originY: number;
  lengthMm: number;
  heightMm: number;
  showGrid?: boolean;
  showRuler?: boolean;
  showDimensions?: boolean;
}) {
  if (!showGrid && !showRuler && !showDimensions) return null;

  const fontSize = clampFont(heightMm / 12);
  const unit: Unit = spec.unit;

  const ticksX: number[] = [];
  for (let m = 0; m <= lengthMm; m += 5) ticksX.push(m);
  const ticksY: number[] = [];
  for (let m = 0; m <= heightMm; m += 5) ticksY.push(m);

  return (
    <g transform={`translate(${originX}, ${originY})`}>
      {showGrid && (
        <g opacity={0.12} stroke="#64748b" strokeWidth={0.08}>
          {ticksX.map((m) => (
            <line key={`gx-${m}`} x1={m} y1={0} x2={m} y2={heightMm} />
          ))}
          {ticksY.map((m) => (
            <line key={`gy-${m}`} x1={0} y1={m} x2={lengthMm} y2={m} />
          ))}
        </g>
      )}

      {showRuler && (
        <g>
          <g stroke="#94a3b8" strokeWidth={0.15}>
            {ticksX.map((m) => (
              <line key={`tx-${m}`} x1={m} y1={-3} x2={m} y2={m % 10 === 0 ? -1.2 : -2} />
            ))}
          </g>
          <g fill="#64748b" fontSize={fontSize} className="font-mono" textAnchor="middle">
            {ticksX
              .filter((m) => m % 20 === 0)
              .map((m) => (
                <text key={`tl-${m}`} x={m} y={-4}>
                  {m}
                </text>
              ))}
          </g>

          <g stroke="#94a3b8" strokeWidth={0.15}>
            {ticksY.map((m) => (
              <line key={`ty-${m}`} x1={-3} x2={m % 10 === 0 ? -1.2 : -2} y1={m} y2={m} />
            ))}
          </g>
        </g>
      )}

      {showDimensions && spec.family === 'J' && (
        <DimensionCallouts spec={spec as JacquardSpec} heightMm={heightMm} fontSize={fontSize} unit={unit} />
      )}
    </g>
  );
}

function DimensionCallouts({
  spec,
  heightMm,
  fontSize,
  unit,
}: {
  spec: JacquardSpec;
  heightMm: number;
  fontSize: number;
  unit: Unit;
}) {
  const activeArt = spec.artwork[0];
  const labelY = heightMm + fontSize * 3.2;
  return (
    <g className="font-mono" fontSize={fontSize} fill="#334155">
      <text x={0} y={labelY}>
        Fabric width: {formatDim(spec.widthMm, unit)}
      </text>
      {activeArt && (
        <text x={0} y={labelY + fontSize * 1.6}>
          Artwork: {formatDim(activeArt.transform.widthMm, unit)} × {formatDim(activeArt.transform.heightMm, unit)}
        </text>
      )}
      <text x={0} y={labelY + fontSize * 3.2}>
        Repeat length: {formatDim(spec.repeat.lengthMm, unit)} · Spacing: {formatDim(spec.repeat.spacingMm, unit)}
      </text>
    </g>
  );
}
