/**
 * WeaveGraphView — the jacquard "point paper" for the customer studio. Shows
 * one repeat of the motif as a warp-end × weft-pick grid in which every cell
 * is one yarn color, so the customer can see how the logo/text is actually
 * built from threads (and where fine detail is lost). Uses nominal densities:
 * the approved production densities are set later by the technical team, so
 * this is indicative, not the loom file.
 *
 * The grid is drawn at one canvas pixel per cell and scaled up with
 * nearest-neighbor rendering; the cell lines are a CSS overlay so they stay
 * crisp at every zoom level. Single-thread lines only appear once a cell is
 * big enough to see; bold lines mark every 10 threads.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { JacquardSpec } from '../../lib/types';
import {
  buildGraphPalette,
  buildJacquardPalette,
  buildPatternGridCanvas,
  NOMINAL_ENDS_PER_CM as PREVIEW_ENDS_PER_CM,
  NOMINAL_PICKS_PER_CM as PREVIEW_PICKS_PER_CM,
  patternGridSize,
  type PaletteEntry,
} from '../../lib/jacquardGraph';

const STAGE_PAD = 16;
/** Smallest on-screen cell (px) at which single-thread lines are drawn. */
const MIN_CELL_FOR_LINES = 3;
const CELL_LINE = 'rgba(100, 116, 139, 0.35)';
const MAJOR_LINE = 'rgba(71, 85, 105, 0.75)';

function gridLines(color: string, sizePx: number) {
  return {
    backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
    backgroundSize: `${sizePx}px ${sizePx}px`,
  };
}

export default function WeaveGraphView({
  spec,
  showGrid = true,
  className = '',
}: {
  spec: JacquardSpec;
  showGrid?: boolean;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteEntry[]>(() => buildJacquardPalette(spec));

  const { cols, rows } = patternGridSize(spec, PREVIEW_ENDS_PER_CM, PREVIEW_PICKS_PER_CM);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rebuild shortly after the design settles (dragging artwork fires many edits).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        // Uploaded logos keep their own colours: their main colours join the yarn palette.
        const graphPalette = await buildGraphPalette(spec);
        const raw = await buildPatternGridCanvas(spec, PREVIEW_ENDS_PER_CM, PREVIEW_PICKS_PER_CM, graphPalette);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = raw.width;
        canvas.height = raw.height;
        canvas.getContext('2d')?.drawImage(raw, 0, 0);
        setPalette(graphPalette);
        setError(null);
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not build the weave graph.');
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [spec]);

  const fitCell = Math.max(
    0.5,
    Math.min((stage.w - STAGE_PAD * 2) / cols, (stage.h - STAGE_PAD * 2) / rows)
  );
  const cellPx = fitCell * zoom;
  const threadLinesVisible = showGrid && cellPx >= MIN_CELL_FOR_LINES;
  const zoomIn = () => setZoom((z) => Math.min(12, z * 1.5));
  const zoomOut = () => setZoom((z) => Math.max(1, z / 1.5));

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col gap-1.5 ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1 text-[11px] text-slate-500">
          <span>
            <b className="text-slate-700">{rows}</b> warp ends × <b className="text-slate-700">{cols}</b> weft picks
            <span className="text-slate-400">
              {' '}· one {spec.repeat.lengthMm} mm repeat ·{' '}
              {threadLinesVisible
                ? 'each small square is one thread crossing, bold lines every 10 threads'
                : 'bold lines every 10 threads — zoom in to see each thread'}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {palette.map((p) => (
              <span key={p.hex} className="inline-flex items-center gap-1" title={p.label}>
                <span className="h-3 w-3 rounded-sm border border-slate-300" style={{ backgroundColor: p.hex }} />
                {p.role}
              </span>
            ))}
          </span>
        </div>

        {/* Zoom controls (same style as the fabric preview; inline so they wrap on narrow screens) */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="min-w-11 text-center font-mono text-[11px] text-slate-500">{Math.round(zoom * 100)}%</span>
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
      </div>

      <div ref={stageRef} className="relative flex min-h-96 flex-1 overflow-auto">
        <div
          className="relative m-auto shrink-0 border border-slate-400 bg-white shadow-sm"
          style={{ width: cols * cellPx, height: rows * cellPx }}
        >
          <canvas
            ref={canvasRef}
            className={`block h-full w-full [image-rendering:pixelated] ${ready ? '' : 'opacity-0'}`}
            aria-label={`Weave graph: ${rows} warp ends by ${cols} weft picks`}
            role="img"
          />
          {threadLinesVisible && (
            <div className="pointer-events-none absolute inset-0" style={gridLines(CELL_LINE, cellPx)} />
          )}
          {showGrid && (
            <div className="pointer-events-none absolute inset-0" style={gridLines(MAJOR_LINE, cellPx * 10)} />
          )}
        </div>
        {(error || spec.artwork.length === 0) && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className={`rounded-lg border bg-white/95 px-3 py-1.5 text-xs shadow-sm ${error ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-600'}`}>
              {error ?? 'Add a logo or text to see how it is woven, thread by thread.'}
            </span>
          </div>
        )}
      </div>

      <p className="shrink-0 text-center text-[11px] italic text-slate-400">
        Indicative weave graph at a nominal {PREVIEW_ENDS_PER_CM} ends/cm × {PREVIEW_PICKS_PER_CM} picks/cm — our
        technical team prepares the final loom graph
      </p>
    </div>
  );
}
