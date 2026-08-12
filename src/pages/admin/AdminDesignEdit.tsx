/**
 * Admin visual editor for a CUSTOMER design — opens the same designer the
 * customer used (controls + live preview), loaded from the latest revision.
 * Saving creates a new customer-design revision via the staff API; it never
 * touches the internal production specification.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import { AdminGuard } from '../../auth/AdminGuard';
import { useSession } from '../../auth/useSession';
import { createAdminRevision, getProjectDetail } from '../../lib/api/admin';
import { revisionLabel } from '../../lib/ids';
import { useCapabilities } from '../../lib/capabilities';
import type { DesignSpec, JacquardSpec, KnittedSpec, PreviewMode, WovenSpec } from '../../lib/types';
import { Badge, Button, Modal, TextArea } from '../../components/ui';
import FabricPreview from '../../studio/preview/index';
import { StudioLayout } from '../../studio/shell/StudioLayout';
import { SpecSummaryPanel } from '../../studio/shell/SpecSummaryPanel';
import { useDesignHistory } from '../../studio/shell/useDesignHistory';
import { checkWeavability } from '../../studio/weavability/rules';
import { jacquardDesigner } from '../../studio/designers/jacquard';
import { wovenDesigner } from '../../studio/designers/woven';
import { knittedDesigner } from '../../studio/designers/knitted';
import type { WeavabilityResult } from '../../lib/types';

const MODES: { value: PreviewMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'roll', label: 'Roll' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'application', label: 'Application' },
];

function defaultsFor(family: DesignSpec['family']): DesignSpec {
  if (family === 'J') return jacquardDesigner.createDefaultSpec();
  if (family === 'W') return wovenDesigner.createDefaultSpec();
  return knittedDesigner.createDefaultSpec();
}

function EditorBody({ id }: { id: string }) {
  const navigate = useNavigate();
  const { session } = useSession();
  const [load, setLoad] = useState<{
    status: 'loading' | 'error' | 'ready';
    message?: string;
    spec?: DesignSpec;
    designCode?: string;
    revisionNo?: number;
  }>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getProjectDetail(id)
      .then((detail) => {
        if (!active) return;
        if (!detail) {
          setLoad({ status: 'error', message: 'Design not found.' });
          return;
        }
        const spec = { ...defaultsFor(detail.project.family), ...detail.project.spec } as DesignSpec;
        setLoad({
          status: 'ready',
          spec,
          designCode: detail.project.designCode,
          revisionNo: detail.project.revisionNo,
        });
      })
      .catch((e: unknown) => {
        if (active) setLoad({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the design.' });
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (load.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }
  if (load.status === 'error' || !load.spec) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center px-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-slate-600 max-w-md">{load.message}</p>
        <Link to={`/admin/designs/${id}`} className="text-sm font-bold text-brand-600 hover:underline">
          Back to design
        </Link>
      </div>
    );
  }

  return (
    <EditorWorkspace
      id={id}
      initialSpec={load.spec}
      designCode={load.designCode ?? ''}
      revisionNo={load.revisionNo ?? 1}
      actorEmail={session?.user.email ?? 'staff'}
      onSaved={() => navigate(`/admin/designs/${id}`)}
    />
  );
}

function EditorWorkspace({
  id,
  initialSpec,
  designCode,
  revisionNo,
  actorEmail,
  onSaved,
}: {
  id: string;
  initialSpec: DesignSpec;
  designCode: string;
  revisionNo: number;
  actorEmail: string;
  onSaved: () => void;
}) {
  const { spec, setSpec, undo, redo, canUndo, canRedo } = useDesignHistory(initialSpec);
  const [mode, setMode] = useState<PreviewMode>('flat');
  const capabilities = useCapabilities();
  const [weavability, setWeavability] = useState<WeavabilityResult>(() => checkWeavability(initialSpec));
  const [saveOpen, setSaveOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setWeavability(checkWeavability(spec, capabilities[spec.family])), 400);
    return () => clearTimeout(t);
  }, [spec, capabilities]);

  const dirty = useMemo(() => JSON.stringify(spec) !== JSON.stringify(initialSpec), [spec, initialSpec]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await createAdminRevision(id, spec, notes.trim() || undefined, actorEmail);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the revision.');
      setBusy(false);
    }
  };

  const Controls =
    spec.family === 'J'
      ? jacquardDesigner.Controls
      : spec.family === 'W'
        ? wovenDesigner.Controls
        : knittedDesigner.Controls;

  return (
    <>
      <StudioLayout
        topBar={
          <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-950 px-4 py-2.5 text-white">
            <Link
              to={`/admin/designs/${id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <span className="font-mono text-sm font-bold">{designCode}</span>
            <Badge tone="amber">Editing as staff → will save as {revisionLabel(revisionNo + 1)}</Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10" disabled={!canUndo} onClick={undo}>
                Undo
              </Button>
              <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10" disabled={!canRedo} onClick={redo}>
                Redo
              </Button>
              <Button size="sm" disabled={!dirty} onClick={() => setSaveOpen(true)}>
                <Save className="w-3.5 h-3.5" /> Save Revision
              </Button>
            </div>
          </header>
        }
        controls={<Controls spec={spec as JacquardSpec & WovenSpec & KnittedSpec} onChange={setSpec} />}
        preview={
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 self-start">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    mode === m.value ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 flex-1">
              <FabricPreview
                spec={spec}
                mode={mode}
                showGrid
                showRuler
                interactive={spec.family === 'J'}
                onSpecChange={setSpec}
                className="w-full"
              />
            </div>
          </div>
        }
        specification={<SpecSummaryPanel spec={spec} onSpecChange={setSpec} weavability={weavability} />}
      />

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title={`Save as revision ${revisionLabel(revisionNo + 1)}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            This creates a new revision of the customer&apos;s design requirement. The original revision is kept
            for traceability, and the internal production specification is untouched.
          </p>
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Revision notes — what changed and why…"
            rows={3}
          />
          {error && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Revision
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function AdminDesignEdit() {
  const { id } = useParams<{ id: string }>();
  return <AdminGuard>{id ? <EditorBody id={id} /> : null}</AdminGuard>;
}
