import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Grid3x3, Ruler } from 'lucide-react';
import { Button } from '../components/ui/index';
import { FAMILY_BY_SLUG } from '../lib/constants';
import { getStorageAdapter } from '../lib/storage/index';
import type {
  DesignRecord,
  DesignSpec,
  Family,
  JacquardSpec,
  KnittedSpec,
  PreviewHandle,
  PreviewMode,
  WeavabilityResult,
  WovenSpec,
} from '../lib/types';
import FabricPreview from '../studio/preview/index';
import { jacquardDesigner } from '../studio/designers/jacquard/index';
import { knittedDesigner } from '../studio/designers/knitted/index';
import { wovenDesigner } from '../studio/designers/woven/index';
import { StudioLayout } from '../studio/shell/StudioLayout';
import { SpecSummaryPanel } from '../studio/shell/SpecSummaryPanel';
import { TopBar } from '../studio/shell/TopBar';
import { useDesignHistory } from '../studio/shell/useDesignHistory';
import { checkWeavability } from '../studio/weavability/rules';

type FamilySlug = 'jacquard' | 'woven' | 'knitted';

function createDefaultSpecFor(code: Family): DesignSpec {
  switch (code) {
    case 'J':
      return jacquardDesigner.createDefaultSpec();
    case 'W':
      return wovenDesigner.createDefaultSpec();
    case 'K':
      return knittedDesigner.createDefaultSpec();
  }
}

const MODES: { value: PreviewMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'roll', label: 'Roll' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'application', label: 'Application' },
];

export default function DesignerPage() {
  const { family, id } = useParams<{ family: string; id?: string }>();
  const familyMeta = family ? FAMILY_BY_SLUG[family] : undefined;

  const [loadState, setLoadState] = useState<{
    status: 'loading' | 'ready';
    spec?: DesignSpec;
    record?: DesignRecord | null;
  }>({ status: 'loading' });

  useEffect(() => {
    if (!familyMeta) return;
    let cancelled = false;
    setLoadState({ status: 'loading' });
    (async () => {
      if (id) {
        const rec = await getStorageAdapter().getDesign(id);
        if (cancelled) return;
        if (rec && rec.family === familyMeta.code) {
          setLoadState({ status: 'ready', spec: rec.spec, record: rec });
          return;
        }
      }
      if (cancelled) return;
      setLoadState({ status: 'ready', spec: createDefaultSpecFor(familyMeta.code), record: null });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, id]);

  if (!familyMeta) return <Navigate to="/studio" replace />;
  if (loadState.status === 'loading' || !loadState.spec) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading design…</p>
        </div>
      </div>
    );
  }

  return (
    <div key={id ?? familyMeta.slug} className="contents">
      <DesignerWorkspace
        familyCode={familyMeta.code}
        familyLabel={familyMeta.label}
        familySlug={familyMeta.slug as FamilySlug}
        initialSpec={loadState.spec}
        initialRecord={loadState.record ?? null}
      />
    </div>
  );
}

function DesignerWorkspace({
  familyCode,
  familyLabel,
  familySlug,
  initialSpec,
  initialRecord,
}: {
  familyCode: Family;
  familyLabel: string;
  familySlug: FamilySlug;
  initialSpec: DesignSpec;
  initialRecord: DesignRecord | null;
}) {
  const { spec, setSpec, replace, undo, redo, canUndo, canRedo } = useDesignHistory(initialSpec);
  const [record, setRecord] = useState<DesignRecord | null>(initialRecord);
  const [mode, setMode] = useState<PreviewMode>('flat');
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [weavability, setWeavability] = useState<WeavabilityResult>(() =>
    checkWeavability(initialSpec)
  );
  const previewRef = useRef<PreviewHandle | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setWeavability(checkWeavability(spec)), 400);
    return () => clearTimeout(t);
  }, [spec]);

  return (
    <StudioLayout
      topBar={
        <TopBar
          familyLabel={familyLabel}
          spec={spec}
          onSpecChange={setSpec}
          record={record}
          onRecordChange={setRecord}
          weavability={weavability}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onReset={() => replace(createDefaultSpecFor(familyCode))}
          previewRef={previewRef}
        />
      }
      controls={
        familySlug === 'jacquard' ? (
          <jacquardDesigner.Controls spec={spec as JacquardSpec} onChange={setSpec} />
        ) : familySlug === 'woven' ? (
          <wovenDesigner.Controls spec={spec as WovenSpec} onChange={setSpec} />
        ) : (
          <knittedDesigner.Controls spec={spec as KnittedSpec} onChange={setSpec} />
        )
      }
      preview={
        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={showGrid ? 'primary' : 'secondary'}
                onClick={() => setShowGrid((v) => !v)}
              >
                <Grid3x3 className="w-4 h-4" /> Grid
              </Button>
              <Button
                size="sm"
                variant={showRuler ? 'primary' : 'secondary'}
                onClick={() => setShowRuler((v) => !v)}
              >
                <Ruler className="w-4 h-4" /> Ruler
              </Button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <FabricPreview
              spec={spec}
              mode={mode}
              showGrid={showGrid}
              showRuler={showRuler}
              interactive={familySlug === 'jacquard'}
              onSpecChange={setSpec}
              previewRef={previewRef}
              className="w-full"
            />
          </div>
        </div>
      }
      specification={<SpecSummaryPanel spec={spec} onSpecChange={setSpec} weavability={weavability} />}
    />
  );
}
