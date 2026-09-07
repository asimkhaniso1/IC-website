/**
 * Internal "Production" panel for the admin studio editor — replaces the
 * customer-facing "Production CAD / Loom Export — Future Integration"
 * placeholder with a real export, built from the approved production
 * specification (see ProductionSpecPanel). Never rendered for customers.
 */
import { useState } from 'react';
import { CheckCircle2, Download, Loader2, Lock } from 'lucide-react';
import { Badge, Button, Panel, Tooltip } from '../../../components/ui';
import { buildLoomExportZip, downloadBlob, LoomExportError, type PatternGridStatus } from '../../../lib/loomExport';
import type { DesignSpec, ProductionSpec } from '../../../lib/types';

function patternGridMessage(status: PatternGridStatus): string {
  if (status.included) return 'pattern grid included.';
  switch (status.reason) {
    case 'not-jacquard':
      return 'no pattern grid — only Jacquard designs carry a woven repeat to grid.';
    case 'no-artwork':
      return 'no pattern grid — this design has no artwork to rasterize yet.';
    case 'no-density':
      return 'no pattern grid — set Ends/cm and Picks/cm below (a single number or a range) to generate one.';
    default:
      return 'no pattern grid.';
  }
}

export function LoomExportPanel({
  spec,
  productionSpec,
  designCode,
  revisionNo,
  preparedBy,
}: {
  spec: DesignSpec;
  productionSpec: ProductionSpec | null;
  designCode: string;
  revisionNo: number;
  preparedBy: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PatternGridStatus | null>(null);

  const ready = Boolean(productionSpec?.details.constructionType?.trim());

  async function handleExport() {
    setError(null);
    setBusy(true);
    setDone(null);
    try {
      const { blob, filename, patternGrid } = await buildLoomExportZip({
        spec,
        productionSpec,
        meta: { designCode, revisionNo, preparedBy },
      });
      downloadBlob(blob, filename);
      setDone(patternGrid);
    } catch (err) {
      setError(err instanceof LoomExportError || err instanceof Error ? err.message : 'Could not generate the export.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-1.5">
          Production
          <Lock className="w-3 h-3 text-slate-300" />
        </span>
      }
    >
      <div className="flex flex-col gap-2.5">
        <p className="text-xs leading-relaxed text-slate-500">
          Packages the <span className="font-medium text-slate-600">approved production specification</span> into a
          construction data sheet (CSV) and, for Jacquard designs with ends/cm and picks/cm set, a pixel-accurate
          pattern grid — for the technical team to prepare against your loom/CAD system.
        </p>

        {!ready && (
          <p className="text-xs text-amber-600">
            Save a production specification with a construction type below before exporting.
          </p>
        )}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <Tooltip text="Not a live integration with any specific loom controller or CAD vendor — a portable data package generated from the approved spec.">
            <Button size="sm" variant="secondary" onClick={() => void handleExport()} disabled={!ready || busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export Loom / CAD Package
            </Button>
          </Tooltip>
        </div>
        {done && (
          <p className={`text-xs font-medium ${done.included ? 'text-green-600' : 'text-amber-600'}`}>
            <CheckCircle2 className="mr-1 inline w-3.5 h-3.5" />
            Downloaded — {patternGridMessage(done)}
          </p>
        )}
        <span>
          <Badge tone="slate">Loom-agnostic reference data</Badge>
        </span>
      </div>
    </Panel>
  );
}

export default LoomExportPanel;
