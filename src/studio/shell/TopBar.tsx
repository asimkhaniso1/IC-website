import { useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
} from 'lucide-react';
import { Badge, Button, Modal, TextInput } from '../../components/ui/index';
import { COMPANY } from '../../lib/constants';
import { revisionLabel } from '../../lib/ids';
import { getStorageAdapter } from '../../lib/storage/index';
import type { DesignRecord, DesignSpec, PreviewHandle, WeavabilityResult } from '../../lib/types';
import { generateSpecPdf } from '../../pdf/specSheet';
import { RfqDialog } from '../../rfq/RfqDialog';
import { FeasibilityBadge } from '../weavability/FeasibilityBadge';

export function TopBar({
  familyLabel,
  spec,
  onSpecChange,
  record,
  onRecordChange,
  weavability,
  undo,
  redo,
  canUndo,
  canRedo,
  onReset,
  previewRef,
}: {
  familyLabel: string;
  spec: DesignSpec;
  onSpecChange: (next: DesignSpec) => void;
  record: DesignRecord | null;
  onRecordChange: (record: DesignRecord) => void;
  weavability: WeavabilityResult;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  previewRef: RefObject<PreviewHandle | null>;
}) {
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [rfqDesign, setRfqDesign] = useState<DesignRecord | null>(null);
  const [rfqPreviewPng, setRfqPreviewPng] = useState<string | undefined>();

  const flash = (tone: 'ok' | 'error', text: string) => {
    setFeedback({ tone, text });
    window.setTimeout(() => setFeedback(null), 4500);
  };

  const persist = async (): Promise<DesignRecord> => {
    const rec = await getStorageAdapter().saveDesign(spec, { id: record?.id, weavability });
    onRecordChange(rec);
    return rec;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rec = await persist();
      flash('ok', `Saved as ${rec.designCode} (${revisionLabel(rec.revisionNo)})`);
    } catch (e) {
      flash('error', e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const rec = record ?? (await persist());
      const png = await previewRef.current?.toPngDataUrl(4);
      if (!png) throw new Error('Preview is not ready yet — please try again.');
      const blob = await generateSpecPdf(rec, png);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rec.designCode}-${revisionLabel(rec.revisionNo)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash('error', e instanceof Error ? e.message : 'Could not generate PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleRfq = async () => {
    try {
      const rec = record ?? (await persist());
      const png = await previewRef.current?.toPngDataUrl(4);
      setRfqPreviewPng(png);
      setRfqDesign(rec);
    } catch (e) {
      flash('error', e instanceof Error ? e.message : 'Could not prepare your request.');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <Link to="/" className="flex items-center shrink-0">
        <img src={COMPANY.logo} alt="Interconverters" className="h-8 w-auto" />
      </Link>

      <div className="flex items-center gap-2 min-w-0">
        <TextInput
          value={spec.name}
          onChange={(e) => onSpecChange({ ...spec, name: e.target.value })}
          className="w-44 sm:w-56 font-semibold"
          aria-label="Project name"
        />
        <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest text-slate-400">
          {familyLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge tone="brand" className="font-mono">
          {record?.designCode ?? 'Unsaved draft'}
        </Badge>
        {record && <Badge tone="slate">{revisionLabel(record.revisionNo)}</Badge>}
        <FeasibilityBadge level={weavability.level} className="hidden md:inline-flex" />
      </div>

      <div className="flex-1" />

      {feedback && (
        <span
          className={`hidden lg:flex items-center gap-1.5 text-xs font-medium ${
            feedback.tone === 'ok' ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {feedback.tone === 'ok' ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {feedback.text}
        </span>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo} aria-label="Undo">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo} aria-label="Redo">
          <Redo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)} aria-label="Reset">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </Button>
        <Button size="sm" variant="secondary" disabled={pdfBusy} onClick={handleDownloadPdf}>
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">Download Spec PDF</span>
        </Button>
        <Button size="sm" onClick={handleRfq}>
          Request Sample / Get Quotation
        </Button>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset design?">
        <p className="text-sm text-slate-600">
          This clears all changes and returns to a blank {familyLabel} design. Saved revisions are
          not affected.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onReset();
              setResetOpen(false);
            }}
          >
            Reset design
          </Button>
        </div>
      </Modal>

      {rfqDesign && (
        <RfqDialog
          design={rfqDesign}
          previewPng={rfqPreviewPng}
          open={!!rfqDesign}
          onClose={() => setRfqDesign(null)}
        />
      )}
    </header>
  );
}
