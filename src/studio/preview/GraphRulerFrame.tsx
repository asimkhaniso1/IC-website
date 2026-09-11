/**
 * A millimetre ruler (top + left) wrapped around an HTML/canvas jacquard
 * graph — the studio Graph tab and the admin technical graph both draw their
 * grid as a plain DOM box (not SVG, unlike the main FabricPreview), so they
 * share this instead of `RulerGrid`. Tick spacing adapts to zoom so labels
 * never crowd together; ticks and the graph box scroll together because the
 * ruler is drawn as siblings inside the same positioned wrapper, not as a
 * fixed page overlay.
 */
import type { ReactNode } from 'react';
import { niceRulerStep } from '../../lib/jacquardGraph';

export const RULER_SIZE = 20;

export function GraphRulerFrame({
  lengthMm,
  widthMm,
  pxPerMm,
  boxW,
  boxH,
  className = '',
  children,
}: {
  /** Physical length of the graph box along its horizontal (running/production) axis, in mm. */
  lengthMm: number;
  /** Physical length of the graph box along its vertical (fabric width) axis, in mm. */
  widthMm: number;
  /** Screen pixels per fabric millimetre — must match how `boxW`/`boxH` were computed. */
  pxPerMm: number;
  /** Rendered width/height of the graph box in pixels (lengthMm/widthMm × pxPerMm). */
  boxW: number;
  boxH: number;
  className?: string;
  children: ReactNode;
}) {
  const minorStep = niceRulerStep(pxPerMm, 6);
  const labelStep = niceRulerStep(pxPerMm, 30);
  const xTicks: number[] = [];
  for (let m = 0; m <= lengthMm; m += minorStep) xTicks.push(m);
  const yTicks: number[] = [];
  for (let m = 0; m <= widthMm; m += minorStep) yTicks.push(m);

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: boxW + RULER_SIZE, height: boxH + RULER_SIZE }}>
      {/* corner */}
      <div
        className="absolute left-0 top-0 border-b border-r border-slate-200 bg-slate-50"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      {/* top ruler — length / running direction */}
      <div
        className="absolute top-0 overflow-hidden border-b border-slate-200 bg-slate-50"
        style={{ left: RULER_SIZE, width: boxW, height: RULER_SIZE }}
      >
        {xTicks.map((m) => (
          <div
            key={m}
            className="absolute bottom-0 border-l border-slate-300"
            style={{ left: m * pxPerMm, height: m % labelStep === 0 ? 9 : 4 }}
          />
        ))}
        {xTicks
          .filter((m) => m % labelStep === 0)
          .map((m) => (
            <span
              key={`l${m}`}
              className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-slate-500"
              style={{ left: m * pxPerMm }}
            >
              {m}
            </span>
          ))}
      </div>
      {/* left ruler — fabric width / cross direction */}
      <div
        className="absolute left-0 overflow-hidden border-r border-slate-200 bg-slate-50"
        style={{ top: RULER_SIZE, width: RULER_SIZE, height: boxH }}
      >
        {yTicks.map((m) => (
          <div
            key={m}
            className="absolute right-0 border-t border-slate-300"
            style={{ top: m * pxPerMm, width: m % labelStep === 0 ? 9 : 4 }}
          />
        ))}
        {yTicks
          .filter((m) => m % labelStep === 0)
          .map((m) => (
            <span
              key={`l${m}`}
              className="absolute left-0.5 -translate-y-1/2 font-mono text-[9px] text-slate-500"
              style={{ top: m * pxPerMm }}
            >
              {m}
            </span>
          ))}
      </div>
      {/* graph content */}
      <div className="absolute" style={{ left: RULER_SIZE, top: RULER_SIZE, width: boxW, height: boxH }}>
        {children}
      </div>
    </div>
  );
}
