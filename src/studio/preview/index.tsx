/**
 * FabricPreview — SVG fabric renderer for the Narrow Fabric Design Studio.
 *
 * Coordinate system: the root <svg> viewBox is sized so that 1 SVG user unit
 * = 1 mm (plus small fixed mm gutters for the ruler), which keeps every
 * dimensional relationship (fabric width vs. artwork size vs. repeat length)
 * automatically correct. The component is pure props-in/pixels-out — no
 * internal spec copies — so it re-renders immediately on every spec change.
 *
 * The signature (PreviewProps / PreviewHandle) is the frozen contract and is
 * unchanged from the placeholder this file replaces.
 */
import { useId, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { DesignSpec, JacquardSpec, PreviewHandle, PreviewMode, PreviewProps } from '../../lib/types';
import { FabricStrip } from './FabricStrip';
import { RulerGrid } from './RulerGrid';
import { getSilhouette } from './modes/silhouettes';
import { svgToPngDataUrl } from './exportPng';

const RULER_LEFT = 18;
const RULER_TOP = 14;
const RIGHT_PAD = 8;

/** Max simulated elongation per elasticity class (upper bound of the class range). */
const MAX_STRETCH: Record<string, number> = { low: 50, medium: 120, high: 200 };

function jacquardCycleMm(spec: DesignSpec): number {
  if (spec.family !== 'J') return 0;
  const j = spec as JacquardSpec;
  return Math.max(1, j.repeat.lengthMm + j.repeat.spacingMm);
}

function getVisibleLengthMm(spec: DesignSpec, mode: PreviewMode): number {
  const isJ = spec.family === 'J';
  const cycle = jacquardCycleMm(spec);
  switch (mode) {
    case 'repeat':
      return isJ ? Math.max(cycle * 6, 240) : 480;
    case 'roll':
      return 300;
    case 'application':
      return 0;
    case 'flat':
    default:
      return isJ ? Math.max(cycle * 3, 240) : 240;
  }
}

export default function FabricPreview({
  spec,
  mode,
  showGrid,
  showRuler,
  interactive,
  onSpecChange,
  previewRef,
  className = '',
}: PreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const idPrefix = `fp-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [zoom, setZoom] = useState(1);
  const [stretchPct, setStretchPct] = useState(0);

  const maxStretch = MAX_STRETCH[spec.elasticityClass ?? ''] ?? 100;
  const stretchActive =
    spec.elastic && (mode === 'flat' || mode === 'repeat') && stretchPct > 0;
  // Longitudinal stretch factor and the resulting width contraction
  // (elastics neck slightly as they elongate — approximate power law).
  const sx = stretchActive ? 1 + Math.min(stretchPct, maxStretch) / 100 : 1;
  const sy = stretchActive ? Math.max(0.72, Math.pow(sx, -0.3)) : 1;

  useImperativeHandle(
    previewRef,
    (): PreviewHandle => ({
      async toPngDataUrl(pxPerMm = 4) {
        if (!svgRef.current) throw new Error('Preview is not mounted yet.');
        return svgToPngDataUrl(svgRef.current, pxPerMm);
      },
    }),
    []
  );

  const heightMm = Math.max(spec.widthMm, 0.5);
  const visibleLengthMm = getVisibleLengthMm(spec, mode);

  let stageW: number;
  let stageH: number;
  let content: ReactNode;

  if (mode === 'application') {
    const cfg = getSilhouette(spec.application);
    const pad = 20;
    stageW = cfg.viewW + pad * 2;
    stageH = cfg.viewH + pad * 2;
    // Cap how wide the strip renders inside the illustration so wide fabrics
    // don't swallow the line art (mode is illustrative, not to scale).
    const k = Math.min(1, cfg.bandMaxWidthMm / Math.max(heightMm, 0.5));
    content = (
      <g transform={`translate(${pad}, ${pad})`}>
        {/* white backdrop so the line art reads clearly against the workshop grid */}
        <rect
          x={-pad + 2}
          y={-pad + 2}
          width={cfg.viewW + pad * 2 - 4}
          height={cfg.viewH + pad * 2 - 4}
          rx={8}
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth={0.8}
        />
        <g fill="none" stroke="#64748b" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
          {cfg.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g transform={`translate(${cfg.bandX}, ${cfg.bandY}) rotate(${cfg.bandRotationDeg}) scale(${k})`}>
          <FabricStrip
            spec={spec}
            x={0}
            y={-heightMm / 2}
            lengthMm={cfg.bandLengthMm / k}
            idPrefix={`${idPrefix}-app`}
          />
        </g>
      </g>
    );
  } else if (mode === 'roll') {
    stageW = RULER_LEFT + visibleLengthMm + RIGHT_PAD;
    stageH = Math.max(heightMm * 1.7, 100);
    const rollCx = RULER_LEFT + 30;
    const rollCy = stageH / 2;
    const rollRy = heightMm / 2 + 4;
    const rollRx = 24;
    const stripStartX = rollCx + rollRx + 14;
    const stripLengthMm = Math.max(120, stageW - stripStartX - RIGHT_PAD);
    const rollShadeId = `${idPrefix}-rollshade`;

    content = (
      <g>
        <defs>
          <radialGradient id={rollShadeId} cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
        </defs>
        <ellipse cx={rollCx} cy={rollCy} rx={rollRx} ry={rollRy} fill={`url(#${rollShadeId})`} stroke="#64748b" strokeWidth={0.5} />
        {[0.72, 0.5, 0.3].map((f) => (
          <ellipse key={f} cx={rollCx} cy={rollCy} rx={rollRx * f} ry={rollRy * f} fill="none" stroke="#cbd5e1" strokeWidth={0.4} opacity={0.7} />
        ))}
        <ellipse cx={rollCx} cy={rollCy} rx={rollRx * 0.18} ry={rollRy * 0.18} fill="#475569" />
        <path
          d={`M${rollCx + rollRx * 0.94},${rollCy - heightMm / 2}
              Q${rollCx + rollRx + 16},${rollCy - heightMm / 2 - 5} ${stripStartX},${rollCy - heightMm / 2}
              L${stripStartX},${rollCy + heightMm / 2}
              Q${rollCx + rollRx + 16},${rollCy + heightMm / 2 + 5} ${rollCx + rollRx * 0.94},${rollCy + heightMm / 2}
              Z`}
          fill={spec.baseColor}
        />
        <FabricStrip spec={spec} x={stripStartX} y={rollCy - heightMm / 2} lengthMm={stripLengthMm} idPrefix={`${idPrefix}-roll`} />
      </g>
    );
  } else {
    // flat / repeat
    const extraTop = interactive && spec.family === 'J' ? Math.max(8, heightMm * 0.4) : 4;
    const showDims = Boolean(showRuler) && spec.family === 'J';
    const bottomPad = showDims ? heightMm * 0.32 + 10 : 8;
    stageW = RULER_LEFT + visibleLengthMm + RIGHT_PAD;
    stageH = RULER_TOP + extraTop + heightMm + bottomPad;
    const stripY = RULER_TOP + extraTop;

    // When stretch simulation is active the same physical strip is elongated
    // by sx (so a shorter relaxed length fills the visible window) and necks
    // to sy of its relaxed width. Artwork and texture stretch with the fabric.
    const relaxedLengthMm = visibleLengthMm / sx;
    const repeatCells =
      spec.family === 'J' ? Math.max(1, Math.ceil(relaxedLengthMm / jacquardCycleMm(spec)) + 1) : undefined;
    const stripCenterY = stripY + heightMm / 2;

    content = (
      <g>
        <RulerGrid
          spec={spec}
          originX={RULER_LEFT}
          originY={stripY}
          lengthMm={visibleLengthMm}
          heightMm={heightMm}
          showGrid={showGrid}
          showRuler={showRuler}
          showDimensions={showDims && !stretchActive}
        />
        <g
          transform={
            stretchActive
              ? `translate(${RULER_LEFT}, ${stripCenterY}) scale(${sx}, ${sy}) translate(${-RULER_LEFT}, ${-stripCenterY})`
              : undefined
          }
        >
          <FabricStrip
            spec={spec}
            x={RULER_LEFT}
            y={stripY}
            lengthMm={relaxedLengthMm}
            idPrefix={`${idPrefix}-strip`}
            interactive={interactive && !stretchActive}
            onSpecChange={onSpecChange}
            repeatCells={repeatCells}
          />
        </g>
        {mode === 'repeat' && spec.family === 'J' && !stretchActive && (
          <RepeatTicks spec={spec as JacquardSpec} originX={RULER_LEFT} y={stripY + heightMm + 3} lengthMm={visibleLengthMm} />
        )}
      </g>
    );
  }

  // For narrow strips the fit-width rendering can be a hairline — boost the
  // default so the fabric always occupies a sensible share of the canvas.
  const aspect = stageH / stageW;
  const autoBoost = aspect < 0.14 ? Math.min(3, 0.18 / Math.max(aspect, 0.02)) : 1;
  const effectiveZoom = zoom * autoBoost;

  const zoomIn = () => setZoom((z) => Math.min(8, z * 1.4));
  const zoomOut = () => setZoom((z) => Math.max(0.4, z / 1.4));

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col gap-1.5 ${className}`}>
      {/* Zoom controls */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm">
        <button
          type="button"
          onClick={zoomOut}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="min-w-11 text-center font-mono text-[11px] text-slate-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Fit to view"
          title="Fit to view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${stageW} ${stageH}`}
          style={{
            width: `${effectiveZoom * 100}%`,
            minWidth: effectiveZoom > 1 ? `${effectiveZoom * 100}%` : undefined,
            aspectRatio: `${stageW} / ${stageH}`,
            maxHeight: effectiveZoom <= 1 ? '100%' : undefined,
            margin: 'auto',
            flexShrink: 0,
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {content}
        </svg>
      </div>
      {/* Stretch simulation — the core "what happens to my logo when the elastic stretches" tool */}
      {spec.elastic && (mode === 'flat' || mode === 'repeat') && (
        <div className="mx-auto flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Stretch simulation
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Relaxed</span>
            <input
              type="range"
              min={0}
              max={maxStretch}
              step={5}
              value={Math.min(stretchPct, maxStretch)}
              onChange={(e) => setStretchPct(Number(e.target.value))}
              className="w-40 accent-brand-600"
              aria-label="Simulated elongation"
            />
            <span className="text-[11px] text-slate-400">Stretched</span>
          </div>
          <span className="w-12 text-right font-mono text-[11px] font-bold text-brand-600">
            +{Math.min(stretchPct, maxStretch)}%
          </span>
          <div className="flex gap-1">
            {[0, 25, 50, maxStretch].map((p, i, arr) => (
              <button
                key={p}
                type="button"
                onClick={() => setStretchPct(p)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  Math.min(stretchPct, maxStretch) === p
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p === 0 ? 'Relaxed' : i === arr.length - 1 ? `Max ${p}%` : `${p}%`}
              </button>
            ))}
          </div>
          {stretchActive && (
            <span className="font-mono text-[11px] text-slate-500">
              width ≈ {(heightMm * sy).toFixed(1)} mm
            </span>
          )}
        </div>
      )}

      <p className="shrink-0 text-center text-[11px] italic text-slate-400">
        {mode === 'application'
          ? `Illustrative ${spec.application.toLowerCase()} mockup — approximate scale, not dimensionally exact`
          : stretchActive
            ? `Simulated at +${Math.min(stretchPct, maxStretch)}% elongation — visual approximation, actual stretch behaviour depends on construction`
            : 'Approximate scale preview — not dimensionally exact'}
      </p>
    </div>
  );
}

function RepeatTicks({
  spec,
  originX,
  y,
  lengthMm,
}: {
  spec: JacquardSpec;
  originX: number;
  y: number;
  lengthMm: number;
}) {
  const cycle = jacquardCycleMm(spec);
  const ticks: number[] = [];
  for (let m = 0; m <= lengthMm; m += cycle) ticks.push(m);
  return (
    <g transform={`translate(${originX}, ${y})`} stroke="#94a3b8" strokeWidth={0.3} strokeDasharray="1.2 1.2" opacity={0.6}>
      {ticks.map((m) => (
        <line key={m} x1={m} y1={0} x2={m} y2={4} />
      ))}
    </g>
  );
}
