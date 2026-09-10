/** Jacquard phase-one technical graph and Loom/CAD package controls. */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { CheckCircle2, Download, FileText, Grid3X3, Image, Loader2, Lock, Pencil, RefreshCw } from 'lucide-react';
import { Badge, Button, Panel, Tooltip } from '../../../components/ui';
import {
  buildJacquardPalette, buildLoomExportZip, buildPatternGridPngs, canvasToBmpBlob,
  downloadBlob, LoomExportError, parsePositiveDensity, type PatternGridStatus,
} from '../../../lib/loomExport';
import { revisionLabel } from '../../../lib/ids';
import type { DesignSpec, JacquardSpec, ProductionSpec } from '../../../lib/types';

type Graph = { dataGridPng: string; cols: number; rows: number };

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
  const [busy, setBusy] = useState<'generate' | 'export' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PatternGridStatus | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [editing, setEditing] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);

  const jacquard = spec.family === 'J' ? spec as JacquardSpec : null;
  const approved = productionSpec?.status === 'approved';
  const endsPerCm = parsePositiveDensity(productionSpec?.details.endsPerCm);
  const picksPerCm = parsePositiveDensity(productionSpec?.details.picksPerCm);
  const palette = jacquard ? buildJacquardPalette(jacquard) : [];
  const canGenerate = Boolean(jacquard && approved && jacquard.artwork.length && endsPerCm && picksPerCm);

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

  async function generate() {
    if (!jacquard || !endsPerCm || !picksPerCm) return;
    setBusy('generate'); setError(null); setDone(null);
    try {
      const result = await buildPatternGridPngs(jacquard, endsPerCm, picksPerCm);
      setGraph({ dataGridPng: result.dataGridPng, cols: result.cols, rows: result.rows });
      setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not generate the technical graph.'); }
    finally { setBusy(null); }
  }

  function editCell(event: MouseEvent<HTMLCanvasElement>) {
    if (!editing || !canvasRef.current || !palette[colorIndex]) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((event.clientX - rect.left) * canvas.width / rect.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((event.clientY - rect.top) * canvas.height / rect.height)));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = palette[colorIndex].hex; ctx.fillRect(x, y, 1, 1);
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
    const doc = new jsPDF({ orientation: graph.cols >= graph.rows ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(15); doc.text(`${designCode} ${revisionLabel(revisionNo)} — Jacquard Technical Graph`, 12, 14);
    doc.setFontSize(9); doc.text(`${graph.rows} warp ends × ${graph.cols} weft picks | Ends/cm ${endsPerCm} | Picks/cm ${picksPerCm}`, 12, 20);
    const pageW = doc.internal.pageSize.getWidth() - 24;
    const pageH = doc.internal.pageSize.getHeight() - 34;
    const ratio = Math.min(pageW / graph.cols, pageH / graph.rows);
    doc.addImage(artifacts.previewPng, 'PNG', 12, 26, graph.cols * ratio, graph.rows * ratio);
    doc.save(`${designCode}-${revisionLabel(revisionNo)}-technical-graph.pdf`);
  }

  async function handleExport() {
    setError(null); setBusy('export'); setDone(null);
    try {
      const result = await buildLoomExportZip({ spec, productionSpec, meta: { designCode, revisionNo, preparedBy }, patternGridOverride: graphArtifacts() });
      downloadBlob(result.blob, result.filename); setDone(result.patternGrid);
    } catch (err) { setError(err instanceof LoomExportError || err instanceof Error ? err.message : 'Could not generate the export.'); }
    finally { setBusy(null); }
  }

  return (
    <Panel title={<span className="inline-flex items-center gap-1.5">Production <Lock className="w-3 h-3 text-slate-300" /></span>}>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Jacquard Technical Graph <Badge tone="brand">Phase 1</Badge></p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Converts approved artwork and production densities into a discrete warp-end × weft-pick graph. Each cell is one declared yarn color.</p>
        </div>
        {!jacquard && <p className="text-xs text-slate-500">Technical graph generation is currently available for Jacquard designs only.</p>}
        {jacquard && !approved && <p className="text-xs font-medium text-amber-600">Approve the Production Specification before generating a graph.</p>}
        {approved && (!endsPerCm || !picksPerCm) && <p className="text-xs font-medium text-amber-600">Enter Ends/cm and Picks/cm in the approved specification.</p>}
        {approved && jacquard?.artwork.length === 0 && <p className="text-xs font-medium text-amber-600">Add artwork before generating a graph.</p>}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void generate()} disabled={!canGenerate || busy !== null}>
            {busy === 'generate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : graph ? <RefreshCw className="w-3.5 h-3.5" /> : <Grid3X3 className="w-3.5 h-3.5" />}
            {graph ? 'Regenerate' : 'Generate Technical Graph'}
          </Button>
          {graph && <Button size="sm" variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing((v) => !v)}><Pencil className="w-3.5 h-3.5" /> Edit Grid</Button>}
        </div>

        {graph && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span><b className="text-slate-700">{graph.rows}</b> warp ends × <b className="text-slate-700">{graph.cols}</b> weft picks</span>
            {editing && <span>Choose a yarn color, then click cells to edit.</span>}
          </div>
          {editing && <div className="mb-2 flex flex-wrap gap-1.5">{palette.map((entry, index) => <button key={entry.hex} type="button" onClick={() => setColorIndex(index)} title={`${entry.role}: ${entry.label}`} className={`h-7 w-7 rounded border-2 ${colorIndex === index ? 'border-brand-600 ring-2 ring-brand-200' : 'border-white'}`} style={{ backgroundColor: entry.hex }} />)}</div>}
          <div className="max-h-96 overflow-auto rounded border border-slate-300 bg-white p-2">
            <canvas ref={canvasRef} onClick={editCell} className={`mx-auto max-w-full border border-slate-200 [image-rendering:pixelated] ${editing ? 'cursor-crosshair' : ''}`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => downloadGraph('png')}><Image className="w-3.5 h-3.5" /> PNG</Button>
            <Button size="sm" variant="ghost" onClick={() => downloadGraph('bmp')}><Download className="w-3.5 h-3.5" /> BMP</Button>
            <Button size="sm" variant="ghost" onClick={() => void downloadPdf()}><FileText className="w-3.5 h-3.5" /> PDF</Button>
          </div>
        </div>}

        <Tooltip text="Downloads the approved specification, color key and current edited Jacquard graph as one portable package.">
          <Button size="sm" variant="primary" onClick={() => void handleExport()} disabled={!approved || !graph || busy !== null}>
            {busy === 'export' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Include in Loom / CAD Package
          </Button>
        </Tooltip>
        {done && <p className={`text-xs font-medium ${done.included ? 'text-green-600' : 'text-amber-600'}`}><CheckCircle2 className="mr-1 inline w-3.5 h-3.5" />Downloaded — {patternGridMessage(done)}</p>}
        <span><Badge tone="slate">Operator/CAD validation required</Badge></span>
      </div>
    </Panel>
  );
}

export default LoomExportPanel;
