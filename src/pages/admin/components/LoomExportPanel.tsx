/** Jacquard phase-one technical graph and Loom/CAD package controls. */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  CheckCircle2, Columns2, Download, FileText, Grid3X3, Image, Loader2, Lock, Maximize2, Minimize2, Pencil, Redo2,
  RefreshCw, Undo2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { Badge, Button, Panel, Tooltip } from '../../../components/ui';
import {
  buildLoomExportZip, canvasToBmpBlob, downloadBlob, LoomExportError, parsePositiveDensity, type PatternGridStatus,
} from '../../../lib/loomExport';
import {
  buildGraphPalette, buildJacquardPalette, buildPatternGridCanvas, NOMINAL_ENDS_PER_CM, NOMINAL_PICKS_PER_CM,
  type PaletteEntry,
} from '../../../lib/jacquardGraph';
import { revisionLabel } from '../../../lib/ids';
import { useCapabilities } from '../../../lib/capabilities';
import type { DesignSpec, JacquardSpec, ProductionSpec } from '../../../lib/types';
import { checkWeavability } from '../../../studio/weavability/rules';

type Graph = {
  dataGridPng: string;
  cols: number;
  rows: number;
  sourceKey: string;
  /** Same palette as the customer's Graph tab (declared yarns + uploaded-logo colours). */
  palette: PaletteEntry[];
  /** The customer-facing graph at nominal density, for side-by-side comparison. */
  customer: { dataUrl: string; cols: number; rows: number };
};

/** Zoom is screen pixels per fabric millimetre, so both graphs keep the fabric's true proportions. */
const MAX_PX_PER_MM = 60;
const CELL_LINE = 'rgba(100, 116, 139, 0.35)';
const MAJOR_LINE = 'rgba(71, 85, 105, 0.75)';

function gridLines(color: string, w: number, h: number) {
  return {
    backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
    backgroundSize: `${w}px ${h}px`,
  };
}

/** Thread lines (when cells are big enough) plus a bold line every 10 threads. */
function GridOverlay({ boxW, boxH, cols, rows }: { boxW: number; boxH: number; cols: number; rows: number }) {
  const cellW = boxW / cols;
  const cellH = boxH / rows;
  return (
    <>
      {Math.min(cellW, cellH) >= 3 && (
        <div className="pointer-events-none absolute inset-0" style={gridLines(CELL_LINE, cellW, cellH)} />
      )}
      <div className="pointer-events-none absolute inset-0" style={gridLines(MAJOR_LINE, cellW * 10, cellH * 10)} />
    </>
  );
}

function dataUrlBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  return new Blob([Uint8Array.from(atob(body), (c) => c.charCodeAt(0))], { type: mime });
}

function patternGridMessage(status: PatternGridStatus): string {
  if (status.included) return 'edited technical graph included.';
  if (status.reason === 'no-artwork') return 'no graph — this design has no artwork.';
  if (status.reason === 'no-density') return 'no graph — enter Ends/cm and Picks/cm.';
  return 'no technical graph.';
}

export function LoomExportPanel({ spec, productionSpec, designCode, revisionNo, preparedBy }: {
  spec: DesignSpec; productionSpec: ProductionSpec | null; designCode: string; revisionNo: number; preparedBy: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'generate' | 'export' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PatternGridStatus | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [editing, setEditing] = useState(false);
  const [colorIndex, setColorIndex] = useState(1);
  const [zoom, setZoom] = useState(6);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [edited, setEdited] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [compare, setCompare] = useState(false);
  const [hoverCell, setHoverCell] = useState<{ end: number; pick: number } | null>(null);

  const capabilities = useCapabilities();
  const jacquard = spec.family === 'J' ? spec as JacquardSpec : null;
  const approved = productionSpec?.status === 'approved';
  const endsPerCm = parsePositiveDensity(productionSpec?.details.endsPerCm);
  const picksPerCm = parsePositiveDensity(productionSpec?.details.picksPerCm);
  const palette = graph?.palette ?? (jacquard ? buildJacquardPalette(jacquard) : []);
  const lengthMm = Math.max(1, jacquard?.repeat.lengthMm ?? 1);
  const widthMm = Math.max(0.5, jacquard?.widthMm ?? 1);
  const boxW = lengthMm * zoom;
  const boxH = widthMm * zoom;
  const capabilityReview = checkWeavability(spec, capabilities[spec.family]);
  const familyCapability = capabilities[spec.family];
  const construction = productionSpec?.details.constructionType?.trim() ?? '';
  const constructionKey = construction.startsWith('Other') ? 'Other' : construction;
  const constructionAllowed = !construction || capabilities[spec.family].constructions.includes(constructionKey);
  const capabilityBlocks = [
    ...capabilityReview.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message),
    ...(!constructionAllowed ? [`Construction “${construction}” is not in the active ${spec.family} capability library.`] : []),
    ...(!familyCapability.technicalGraphEnabled ? ['Technical graph generation is disabled in the active capability library.'] : []),
  ];
  const capabilityWarnings = capabilityReview.issues.filter((issue) => issue.severity !== 'error');
  const graphSpecKey = jacquard
    ? { ...jacquard, artwork: jacquard.artwork.map((item) => ({ ...item, dataUrl: item.dataUrl ? `${item.dataUrl.slice(0, 80)}:${item.dataUrl.length}` : undefined })) }
    : { family: spec.family };
  const graphSourceKey = JSON.stringify({ spec: graphSpecKey, production: productionSpec?.details, capability: capabilities[spec.family] });
  const graphCurrent = graph?.sourceKey === graphSourceKey;
  const computedGraphCells = jacquard && endsPerCm && picksPerCm
    ? Math.max(1, Math.round((jacquard.widthMm / 10) * endsPerCm))
      * Math.max(1, Math.round((jacquard.repeat.lengthMm / 10) * picksPerCm))
    : 0;
  if (computedGraphCells > familyCapability.maxTechnicalGraphCells) {
    capabilityBlocks.push(`The graph requires ${computedGraphCells.toLocaleString()} cells, above the capability-library limit of ${familyCapability.maxTechnicalGraphCells.toLocaleString()}.`);
  }
  const capabilityCompliant = capabilityBlocks.length === 0;
  const canGenerate = Boolean(jacquard && approved && jacquard.artwork.length && endsPerCm && picksPerCm && capabilityCompliant);

  useEffect(() => {
    if (!graph || !canvasRef.current) return;
    const image = new window.Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = graph.cols; canvas.height = graph.rows;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0);
    };
    image.src = graph.dataGridPng;
  }, [graph]);

  /** Fits the whole graph (or both graphs, when comparing) into the visible area. */
  function fitZoom() {
    const el = viewportRef.current;
    if (!el || !graph) return;
    // A little slack so rounding never adds scrollbars (which would shift the centring).
    let availW = el.clientWidth - 44;
    let availH = el.clientHeight - 44;
    if (compare) {
      availW = availW / 2 - 12; // the two graphs sit side by side
      availH -= 20; // room for their captions
    }
    const fit = Math.floor(Math.min(availW / lengthMm, availH / widthMm) * 10) / 10;
    setZoom(Math.max(1, Math.min(MAX_PX_PER_MM, fit)));
  }

  useEffect(() => {
    if (!graph) return;
    const id = requestAnimationFrame(fitZoom);
    return () => cancelAnimationFrame(id);
  }, [graph, expanded, compare]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  async function generate() {
    if (!jacquard || !endsPerCm || !picksPerCm) return;
    setBusy('generate'); setError(null); setDone(null);
    try {
      // Same palette as the customer's Graph tab, so both graphs show the same yarns.
      const graphPalette = await buildGraphPalette(jacquard);
      const raw = await buildPatternGridCanvas(jacquard, endsPerCm, picksPerCm, graphPalette);
      const customerRaw = await buildPatternGridCanvas(jacquard, NOMINAL_ENDS_PER_CM, NOMINAL_PICKS_PER_CM, graphPalette);
      setGraph({
        dataGridPng: raw.toDataURL('image/png'), cols: raw.width, rows: raw.height, sourceKey: graphSourceKey,
        palette: graphPalette,
        customer: { dataUrl: customerRaw.toDataURL('image/png'), cols: customerRaw.width, rows: customerRaw.height },
      });
      setEditing(false);
      setUndoStack([]); setRedoStack([]); setEdited(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not generate the technical graph.'); }
    finally { setBusy(null); }
  }

  function cellFromEvent(event: MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(canvas.width - 1, Math.max(0, Math.floor((event.clientX - rect.left) * canvas.width / rect.width))),
      y: Math.min(canvas.height - 1, Math.max(0, Math.floor((event.clientY - rect.top) * canvas.height / rect.height))),
    };
  }

  function editCell(event: MouseEvent<HTMLCanvasElement>, dragging = false) {
    if (!editing || !canvasRef.current || !palette[colorIndex] || (dragging && event.buttons !== 1)) return;
    const cell = cellFromEvent(event);
    const ctx = canvasRef.current.getContext('2d');
    if (!cell || !ctx) return;
    ctx.fillStyle = palette[colorIndex].hex; ctx.fillRect(cell.x, cell.y, 1, 1);
    setEdited(true);
  }

  function trackHover(event: MouseEvent<HTMLCanvasElement>) {
    const cell = cellFromEvent(event);
    // Rows run across the width (warp ends); columns run along the length (weft picks).
    setHoverCell(cell ? { end: cell.y + 1, pick: cell.x + 1 } : null);
  }

  function beginStroke(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!editing || !canvas) return;
    setUndoStack((stack) => [...stack.slice(-29), canvas.toDataURL('image/png')]);
    setRedoStack([]);
    editCell(event);
  }

  function restoreGraph(dataUrl: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = new window.Image();
    image.onload = () => canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = dataUrl;
    setEdited(dataUrl !== graph?.dataGridPng);
  }

  function undoEdit() {
    const canvas = canvasRef.current;
    const previous = undoStack.at(-1);
    if (!canvas || !previous) return;
    setRedoStack((stack) => [...stack, canvas.toDataURL('image/png')]);
    setUndoStack((stack) => stack.slice(0, -1));
    restoreGraph(previous);
  }

  function redoEdit() {
    const canvas = canvasRef.current;
    const next = redoStack.at(-1);
    if (!canvas || !next) return;
    setUndoStack((stack) => [...stack, canvas.toDataURL('image/png')]);
    setRedoStack((stack) => stack.slice(0, -1));
    restoreGraph(next);
  }

  function resetEdits() {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    setUndoStack((stack) => [...stack, canvas.toDataURL('image/png')]);
    setRedoStack([]);
    restoreGraph(graph.dataGridPng);
  }

  function graphArtifacts() {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const preview = document.createElement('canvas');
    const scale = Math.max(1, Math.min(10, Math.floor(1600 / Math.max(canvas.width, 1))));
    preview.width = canvas.width * scale; preview.height = canvas.height * scale;
    const ctx = preview.getContext('2d');
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
    return { dataGridPng: canvas.toDataURL('image/png'), previewPng: preview.toDataURL('image/png'), gridBmp: canvasToBmpBlob(canvas) };
  }

  function downloadGraph(kind: 'png' | 'bmp') {
    const artifacts = graphArtifacts();
    if (!artifacts) return;
    downloadBlob(kind === 'png' ? dataUrlBlob(artifacts.dataGridPng) : artifacts.gridBmp,
      `${designCode}-${revisionLabel(revisionNo)}-technical-graph.${kind}`);
  }

  async function downloadPdf() {
    const artifacts = graphArtifacts();
    if (!artifacts || !graph) return;
    const { jsPDF } = await import('jspdf');
    // True proportions: repeat length × fabric width in mm (cells aren't square when ends/cm ≠ picks/cm).
    const doc = new jsPDF({ orientation: lengthMm >= widthMm ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(15); doc.text(`${designCode} ${revisionLabel(revisionNo)} — Jacquard Technical Graph`, 12, 14);
    doc.setFontSize(9); doc.text(`${graph.rows} warp ends × ${graph.cols} weft picks | Ends/cm ${endsPerCm} | Picks/cm ${picksPerCm} | ${widthMm} mm × ${lengthMm} mm repeat`, 12, 20);
    const pageW = doc.internal.pageSize.getWidth() - 24;
    const pageH = doc.internal.pageSize.getHeight() - 34;
    const ratio = Math.min(pageW / lengthMm, pageH / widthMm);
    doc.addImage(artifacts.previewPng, 'PNG', 12, 26, lengthMm * ratio, widthMm * ratio);
    doc.save(`${designCode}-${revisionLabel(revisionNo)}-technical-graph.pdf`);
  }

  async function handleExport() {
    setError(null); setBusy('export'); setDone(null);
    try {
      const result = await buildLoomExportZip({
        spec, productionSpec, meta: { designCode, revisionNo, preparedBy }, patternGridOverride: graphArtifacts(), palette: graph?.palette,
      });
      downloadBlob(result.blob, result.filename); setDone(result.patternGrid);
    } catch (err) { setError(err instanceof LoomExportError || err instanceof Error ? err.message : 'Could not generate the export.'); }
    finally { setBusy(null); }
  }

  return (
    <Panel title={<span className="inline-flex items-center gap-1.5">Production <Lock className="w-3 h-3 text-slate-300" /></span>}>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Jacquard Technical Graph <Badge tone="brand">Phase 1</Badge></p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Converts approved artwork and production densities into a discrete warp-end × weft-pick graph. Each cell is one yarn color — the same palette the customer sees, including uploaded-logo colors.</p>
        </div>
        <div className={`rounded-lg border px-3 py-2.5 ${capabilityCompliant ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-bold ${capabilityCompliant ? 'text-green-700' : 'text-red-700'}`}>Manufacturing Capability Library</p>
            <Badge tone={capabilityCompliant ? 'green' : 'red'}>{capabilityCompliant ? 'Within capability' : 'Blocked'}</Badge>
          </div>
          {capabilityBlocks.map((message) => <p key={message} className="mt-1 text-xs text-red-700">{message}</p>)}
          {capabilityWarnings.map((issue) => <p key={`${issue.code}-${issue.message}`} className="mt-1 text-xs text-amber-700">{issue.message}</p>)}
          {capabilityCompliant && capabilityWarnings.length === 0 && <p className="mt-1 text-xs text-green-700">Width, colors, elongation, text size and construction comply with the active Jacquard rules.</p>}
        </div>
        {!jacquard && <p className="text-xs text-slate-500">Technical graph generation is currently available for Jacquard designs only.</p>}
        {jacquard && !approved && <p className="text-xs font-medium text-amber-600">Approve the Production Specification before generating a graph.</p>}
        {approved && (!endsPerCm || !picksPerCm) && <p className="text-xs font-medium text-amber-600">Enter Ends/cm and Picks/cm in the approved specification.</p>}
        {approved && jacquard?.artwork.length === 0 && <p className="text-xs font-medium text-amber-600">Add artwork before generating a graph.</p>}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {graph && !graphCurrent && <p className="text-xs font-medium text-amber-600">The design, approved specification, or capability rules changed. Regenerate the graph before export.</p>}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void generate()} disabled={!canGenerate || busy !== null}>
            {busy === 'generate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : graph ? <RefreshCw className="w-3.5 h-3.5" /> : <Grid3X3 className="w-3.5 h-3.5" />}
            {graph ? 'Regenerate' : 'Generate Technical Graph'}
          </Button>
          {graph && <Button size="sm" variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing((v) => !v)}><Pencil className="w-3.5 h-3.5" /> Edit Grid</Button>}
          {graph && <Button size="sm" variant="secondary" onClick={() => setExpanded(true)}><Maximize2 className="w-3.5 h-3.5" /> Open full graph</Button>}
        </div>

        {graph && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          {/* One canvas serves the inline view and the full-screen editor, so edits survive switching between them. */}
          <div
            className={expanded ? 'fixed inset-0 z-50 flex flex-col gap-2 bg-slate-100 p-4' : 'flex flex-col gap-2'}
            role={expanded ? 'dialog' : undefined}
            aria-modal={expanded ? true : undefined}
            aria-label={expanded ? 'Jacquard technical graph editor' : undefined}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {expanded && <b className="text-sm text-slate-800">{designCode} {revisionLabel(revisionNo)} — Technical Graph</b>}
                <span>
                  <b className="text-slate-700">{graph.rows}</b> warp ends × <b className="text-slate-700">{graph.cols}</b> weft picks · {endsPerCm} ends/cm × {picksPerCm} picks/cm
                </span>
                {edited && <Badge tone="amber">Edited</Badge>}
                {hoverCell && <span className="font-mono text-slate-600">End {hoverCell.end} · Pick {hoverCell.pick}</span>}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {expanded && <Button size="sm" variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing((v) => !v)}><Pencil className="w-3.5 h-3.5" /> Edit Grid</Button>}
                <Button size="sm" variant={compare ? 'primary' : 'secondary'} onClick={() => setCompare((v) => !v)}><Columns2 className="w-3.5 h-3.5" /> Compare with customer graph</Button>
                <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(1, z / 1.25))} aria-label="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></Button>
                <span className="min-w-16 text-center text-xs font-medium text-slate-600">{zoom.toFixed(1)} px/mm</span>
                <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(MAX_PX_PER_MM, z * 1.25))} aria-label="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={fitZoom}>Fit</Button>
                {expanded && <Button size="sm" variant="secondary" onClick={() => setExpanded(false)}><Minimize2 className="w-3.5 h-3.5" /> Close</Button>}
              </div>
            </div>
            {editing && <div className="flex flex-wrap items-center gap-1.5">{palette.map((entry, index) => <button key={entry.hex} type="button" onClick={() => setColorIndex(index)} title={`${entry.role}: ${entry.label}`} aria-label={`Use ${entry.role} color ${entry.label}`} className={`h-8 w-8 rounded border-2 ${colorIndex === index ? 'border-brand-600 ring-2 ring-brand-200' : 'border-white'}`} style={{ backgroundColor: entry.hex }} />)}<span className="ml-2 text-xs font-medium text-slate-600">Painting: {palette[colorIndex]?.role} — {palette[colorIndex]?.label}</span></div>}
            {editing && <div className="flex flex-wrap items-center gap-1">
              <Button size="sm" variant="ghost" onClick={undoEdit} disabled={!undoStack.length}><Undo2 className="w-3.5 h-3.5" /> Undo</Button>
              <Button size="sm" variant="ghost" onClick={redoEdit} disabled={!redoStack.length}><Redo2 className="w-3.5 h-3.5" /> Redo</Button>
              <Button size="sm" variant="ghost" onClick={resetEdits} disabled={!edited}><RefreshCw className="w-3.5 h-3.5" /> Reset edits</Button>
              <span className="ml-1 text-xs text-slate-500">Choose a yarn color, then click or drag across cells.</span>
            </div>}
            <div ref={viewportRef} className={`relative flex overflow-auto rounded border border-slate-300 bg-white p-4 ${expanded ? 'min-h-0 flex-1' : 'h-96'}`}>
              <div className={`m-auto flex shrink-0 gap-6 ${compare ? 'flex-row items-start' : 'flex-col items-center'}`}>
                {compare && (
                  <figure className="flex flex-col gap-1">
                    <figcaption className="text-[11px] font-medium text-slate-500">
                      Customer graph — nominal {NOMINAL_ENDS_PER_CM} ends/cm × {NOMINAL_PICKS_PER_CM} picks/cm ({graph.customer.rows} × {graph.customer.cols})
                    </figcaption>
                    <div className="relative bg-white ring-1 ring-slate-400" style={{ width: boxW, height: boxH }}>
                      <img src={graph.customer.dataUrl} alt="Customer-facing weave graph" className="block h-full w-full [image-rendering:pixelated]" />
                      <GridOverlay boxW={boxW} boxH={boxH} cols={graph.customer.cols} rows={graph.customer.rows} />
                    </div>
                  </figure>
                )}
                <figure className="flex flex-col gap-1">
                  {compare && (
                    <figcaption className="text-[11px] font-medium text-slate-500">
                      Technical graph — approved {endsPerCm} ends/cm × {picksPerCm} picks/cm ({graph.rows} × {graph.cols}){edited ? ' · edited' : ''}
                    </figcaption>
                  )}
                  <div className="relative bg-white ring-1 ring-slate-400" style={{ width: boxW, height: boxH }}>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={beginStroke}
                      onMouseMove={(event) => { trackHover(event); editCell(event, true); }}
                      onMouseLeave={() => setHoverCell(null)}
                      className={`block h-full w-full select-none [image-rendering:pixelated] ${editing ? 'cursor-crosshair touch-none' : ''}`}
                    />
                    <GridOverlay boxW={boxW} boxH={boxH} cols={graph.cols} rows={graph.rows} />
                  </div>
                </figure>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Shown in true proportion ({widthMm} mm width × {lengthMm} mm repeat) · bold lines every 10 threads{expanded ? ' · Esc to close — edits are kept' : ''}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => downloadGraph('png')}><Image className="w-3.5 h-3.5" /> PNG</Button>
            <Button size="sm" variant="ghost" onClick={() => downloadGraph('bmp')}><Download className="w-3.5 h-3.5" /> BMP</Button>
            <Button size="sm" variant="ghost" onClick={() => void downloadPdf()}><FileText className="w-3.5 h-3.5" /> PDF</Button>
          </div>
        </div>}

        <Tooltip text="Downloads the approved specification, color key and current edited Jacquard graph as one portable package.">
          <Button size="sm" variant="primary" onClick={() => void handleExport()} disabled={!approved || !graph || !graphCurrent || !capabilityCompliant || busy !== null}>
            {busy === 'export' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Include in Loom / CAD Package
          </Button>
        </Tooltip>
        {graph && <p className="text-[11px] leading-relaxed text-slate-500">Package includes the graph PNG/BMP, enlarged preview, color key, production data, checksum manifest, and operator/CAD validation checklist. Status remains pending until the loom/CAD operator signs off the test import and sample weave.</p>}
        {done && <p className={`text-xs font-medium ${done.included ? 'text-green-600' : 'text-amber-600'}`}><CheckCircle2 className="mr-1 inline w-3.5 h-3.5" />Downloaded — {patternGridMessage(done)}</p>}
        <span><Badge tone="slate">Operator/CAD validation required</Badge></span>
      </div>
    </Panel>
  );
}

export default LoomExportPanel;
