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

type FamilySlug = 'jacquard' | 'woven' | 'knitted' | 'webbing';

interface FamilyMeta {
  code: Family;
  slug: FamilySlug;
  label: string;
}

/**
 * Resolves route slug -> family metadata. 'webbing' is not part of the
 * frozen FAMILY_BY_SLUG map (family codes stay J/W/K) — it mounts the woven
 * designer module preset to non-elastic, so it is resolved locally here.
 */
function resolveFamilyMeta(slug: string | undefined): FamilyMeta | undefined {
  if (!slug) return undefined;
  if (slug === 'webbing') {
    return { code: 'W', slug: 'webbing', label: 'Non-Elastic Webbing / Tape' };
  }
  const meta = FAMILY_BY_SLUG[slug];
  if (!meta) return undefined;
  return { code: meta.code, slug: meta.slug as FamilySlug, label: meta.label };
}

/** The base module default for a family — used to forward-compat-merge older saved specs. */
function baseModuleDefaultFor(code: Family): DesignSpec {
  switch (code) {
    case 'J':
      return jacquardDesigner.createDefaultSpec();
    case 'W':
      return wovenDesigner.createDefaultSpec();
    case 'K':
      return knittedDesigner.createDefaultSpec();
  }
}

/** Default spec for a brand-new design in this route slug. */
function createDefaultSpecFor(slug: FamilySlug): DesignSpec {
  switch (slug) {
    case 'jacquard':
      return jacquardDesigner.createDefaultSpec();
    case 'woven':
      return wovenDesigner.createDefaultSpec();
    case 'knitted':
      return knittedDesigner.createDefaultSpec();
    case 'webbing':
      return {
        ...wovenDesigner.createDefaultSpec(),
        elastic: false,
        style: 'standard',
        name: 'Untitled Webbing / Tape',
      };
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
  const familyMeta = resolveFamilyMeta(family);

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
          // Merge over the module's defaults so older saved specs pick up
          // new optional fields (style, firmness, technical, …) without
          // crashing.
          const merged = { ...baseModuleDefaultFor(rec.family), ...rec.spec } as DesignSpec;
          setLoadState({ status: 'ready', spec: merged, record: rec });
          return;
        }
      }
      if (cancelled) return;
      setLoadState({ status: 'ready', spec: createDefaultSpecFor(familyMeta.slug), record: null });
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
        familySlug={familyMeta.slug}
        initialSpec={loadState.spec}
        initialRecord={loadState.record ?? null}
      />
    </div>
  );
}

function DesignerWorkspace({
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
          onReset={() => replace(createDefaultSpecFor(familySlug))}
          previewRef={previewRef}
        />
      }
      controls={
        familySlug === 'jacquard' ? (
          <jacquardDesigner.Controls spec={spec as JacquardSpec} onChange={setSpec} />
        ) : familySlug === 'knitted' ? (
          <knittedDesigner.Controls spec={spec as KnittedSpec} onChange={setSpec} />
        ) : (
          // 'woven' and 'webbing' both mount the woven designer module.
          <wovenDesigner.Controls spec={spec as WovenSpec} onChange={setSpec} />
        )
      }
      preview={
        <div className="flex h-full min-h-0 flex-col gap-4">
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
          <div className="flex min-h-0 flex-1">
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
