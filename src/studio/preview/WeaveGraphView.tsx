/**
 * WeaveGraphView — the jacquard "point paper" for the customer studio. Shows
 * one repeat of the motif as a warp-end × weft-pick grid in which every cell
 * is one of the design's declared yarn colors, so the customer can see how
 * the logo/text is actually built from threads (and where fine detail is
 * lost). Uses nominal densities: the approved production densities are set
 * later by the technical team, so this is indicative, not the loom file.
 *
 * Two looks: "Paper" (default) leaves ground cells blank like jacquard point
 * paper and marks only the figure; "Yarn colours" shows every cell in its
 * real yarn shade. The grid is drawn at one canvas pixel per cell and scaled
 * up with nearest-neighbor rendering; the cell lines are a CSS overlay so
 * they stay crisp at every zoom level.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { JacquardSpec } from '../../lib/types';
import {
  buildGraphPalette,
  buildJacquardPalette,
  buildPatternGridCanvas,
  patternGridSize,
  type PaletteEntry,
} from '../../lib/jacquardGraph';

/** Nominal preview densities — mid-range for narrow jacquard elastics. */
export const PREVIEW_ENDS_PER_CM = 40;
export const PREVIEW_PICKS_PER_CM = 30;

type GraphLook = 'paper' | 'yarn';

const STAGE_PAD = 16;
const CELL_LINE = 'rgba(100, 116, 139, 0.35)';
const MAJOR_LINE = 'rgba(71, 85, 105, 0.75)';
/** Ink used on paper for yarns too pale to see on a white background. */
const PALE_YARN_INK = { r: 30, g: 41, b: 59, hex: '#1e293b' };

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function isPale(r: number, g: number, b: number): boolean {
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}

/** Copies the quantized grid into `target`; in the paper look the ground goes blank and pale yarns are inked. */
function paintGrid(target: HTMLCanvasElement, raw: HTMLCanvasElement, groundHex: string, look: GraphLook) {
  target.width = raw.width;
  target.height = raw.height;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(raw, 0, 0);
  const ground = parseHex(groundHex);
  if (look === 'yarn' || !ground) return;
  const image = ctx.getImageData(0, 0, target.width, target.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] === ground.r && px[i + 1] === ground.g && px[i + 2] === ground.b) {
      px[i + 3] = 0;
    } else if (isPale(px[i], px[i + 1], px[i + 2])) {
      px[i] = PALE_YARN_INK.r;
      px[i + 1] = PALE_YARN_INK.g;
      px[i + 2] = PALE_YARN_INK.b;
    }
  }
  ctx.putImageData(image, 0, 0);
}

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
  const rawRef = useRef<HTMLCanvasElement | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [look, setLook] = useState<GraphLook>('paper');
  const [built, setBuilt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { cols, rows } = patternGridSize(spec, PREVIEW_ENDS_PER_CM, PREVIEW_PICKS_PER_CM);
  const [palette, setPalette] = useState<PaletteEntry[]>(() => buildJacquardPalette(spec));

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
        if (cancelled) return;
        rawRef.current = raw;
        setPalette(graphPalette);
        setError(null);
        setBuilt((n) => n + 1);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not build the weave graph.');
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [spec]);

  // Repaint on a new grid or a look change — switching look needs no rebuild.
  useEffect(() => {
    if (rawRef.current && canvasRef.current) paintGrid(canvasRef.current, rawRef.current, spec.baseColor, look);
  }, [built, look, spec.baseColor]);

  const fitCell = Math.max(
    0.5,
    Math.min((stage.w - STAGE_PAD * 2) / cols, (stage.h - STAGE_PAD * 2) / rows)
  );
  const cellPx = fitCell * zoom;
  const zoomIn = () => setZoom((z) => Math.min(12, z * 1.5));
  const zoomOut = () => setZoom((z) => Math.max(1, z / 1.5));
  const groundNorm = spec.baseColor.trim().toLowerCase();

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col gap-1.5 ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1 text-[11px] text-slate-500">
          <span>
            <b className="text-slate-700">{rows}</b> warp ends × <b className="text-slate-700">{cols}</b> weft picks
            <span className="text-slate-400"> · one {spec.repeat.lengthMm} mm repeat · each square is one thread crossing</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {palette.map((p) => {
              const isGround = p.hex.trim().toLowerCase() === groundNorm;
              const rgb = parseHex(p.hex);
              const inked = look === 'paper' && !isGround && rgb !== null && isPale(rgb.r, rgb.g, rgb.b);
              const blank = look === 'paper' && isGround;
              return (
                <span key={p.hex} className="inline-flex items-center gap-1" title={p.label}>
                  <span
                    className={`h-3 w-3 rounded-sm border ${blank ? 'border-dashed border-slate-400' : 'border-slate-300'}`}
                    style={{ backgroundColor: blank ? '#ffffff' : inked ? PALE_YARN_INK.hex : p.hex }}
                  />
                  {p.role}
                  {blank && <span className="text-slate-400">(blank)</span>}
                  {inked && <span className="text-slate-400">(pale yarn, shown dark)</span>}
                </span>
              );
            })}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
            {(['paper', 'yarn'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLook(value)}
                aria-pressed={look === value}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  look === value ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {value === 'paper' ? 'Paper' : 'Yarn colours'}
              </button>
            ))}
          </div>

          {/* Zoom controls (same style as the fabric preview; inline so they wrap on narrow screens) */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm">
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
      </div>

      <div ref={stageRef} className="relative flex min-h-64 flex-1 overflow-auto">
        <div
          className="relative m-auto shrink-0 border border-slate-400 bg-white shadow-sm"
          style={{ width: cols * cellPx, height: rows * cellPx }}
        >
          <canvas
            ref={canvasRef}
            className={`block h-full w-full [image-rendering:pixelated] ${built ? '' : 'opacity-0'}`}
            aria-label={`Weave graph: ${rows} warp ends by ${cols} weft picks`}
            role="img"
          />
          {showGrid && cellPx >= 3 && (
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
