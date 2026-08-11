import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Download, Grid3x3, Loader2, Ruler, Sparkles } from 'lucide-react';
import { Button, Modal } from '../components/ui/index';
import { FAMILY_BY_SLUG, TECHNICAL_REVIEW_DISCLAIMER } from '../lib/constants';
import { getStorageAdapter } from '../lib/storage/index';
import { AiUnavailableError, analyzeDesignAi, renderFabricPhoto } from '../lib/ai';
import type {
  DesignRecord,
  DesignSpec,
  Family,
  Feasibility,
  JacquardSpec,
  KnittedSpec,
  PreviewHandle,
  PreviewMode,
  WeavabilityIssue,
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
import { AiCheckButton } from '../studio/weavability/AiCheckButton';
import { FeasibilityBadge } from '../studio/weavability/FeasibilityBadge';
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

type AiPhotoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; image: string }
  | { status: 'error'; message: string; unavailable: boolean; limitReached?: boolean };

// ---------------------------------------------------------------------------
// AI photo render limit — cost control: each design gets a fixed number of
// photorealistic renders. Tracked per design id in localStorage (unsaved
// drafts share a per-family counter until they are saved, which also stops
// the limit being dodged by never saving). Soft client-side cap.
// ---------------------------------------------------------------------------

// Typed as number (not the literal) so the singular/plural copy stays valid
// whenever this is tuned.
const AI_RENDER_LIMIT: number = 2;
const RENDER_COUNT_KEY = 'ic_ai_render_counts_v1';

function getRenderCount(key: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(RENDER_COUNT_KEY) ?? '{}') as Record<string, number>;
    return map[key] ?? 0;
  } catch {
    return 0;
  }
}

function bumpRenderCount(key: string): number {
  let map: Record<string, number> = {};
  try {
    map = JSON.parse(localStorage.getItem(RENDER_COUNT_KEY) ?? '{}') as Record<string, number>;
  } catch {
    /* start fresh */
  }
  map[key] = (map[key] ?? 0) + 1;
  try {
    localStorage.setItem(RENDER_COUNT_KEY, JSON.stringify(map));
  } catch {
    /* non-fatal */
  }
  return map[key];
}

type AiReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; level: Feasibility; issues: WeavabilityIssue[]; summary: string }
  | { status: 'error'; message: string; unavailable: boolean };

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

  const [aiPhotoOpen, setAiPhotoOpen] = useState(false);
  const [aiPhoto, setAiPhoto] = useState<AiPhotoState>({ status: 'idle' });
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReview, setAiReview] = useState<AiReviewState>({ status: 'idle' });

  // Saved designs count per design id; unsaved drafts share a per-family key.
  const renderKey = record?.id ?? `draft-${familySlug}`;
  const [renderCount, setRenderCount] = useState(() => getRenderCount(renderKey));
  useEffect(() => {
    setRenderCount(getRenderCount(renderKey));
  }, [renderKey]);
  const rendersLeft = Math.max(0, AI_RENDER_LIMIT - renderCount);

  async function runAiPhoto() {
    if (getRenderCount(renderKey) >= AI_RENDER_LIMIT) {
      setAiPhoto({
        status: 'error',
        message:
          AI_RENDER_LIMIT === 1
            ? 'This design has used its AI photo render. Adjust the design and save it as a new design for another, or request a sample to see the real fabric.'
            : `This design has used all ${AI_RENDER_LIMIT} AI photo renders. Adjust the design and save it as a new design for more, or contact us for the physical sample.`,
        unavailable: false,
        limitReached: true,
      });
      return;
    }
    setAiPhoto({ status: 'loading' });
    try {
      const png = await previewRef.current?.toPngDataUrl(3);
      if (!png) throw new Error('Preview is not ready yet.');
      const { image } = await renderFabricPhoto(png, spec);
      setRenderCount(bumpRenderCount(renderKey));
      setAiPhoto({ status: 'ready', image });
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        setAiPhoto({ status: 'error', message: err.message, unavailable: err.reason === 'not_configured' });
      } else {
        setAiPhoto({
          status: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong generating the image.',
          unavailable: false,
        });
      }
    }
  }

  function openAiPhoto() {
    setAiPhotoOpen(true);
    void runAiPhoto();
  }

  async function runAiReview() {
    setAiReview({ status: 'loading' });
    try {
      const result = await analyzeDesignAi(spec);
      setAiReview({ status: 'ready', ...result });
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        setAiReview({ status: 'error', message: err.message, unavailable: err.reason === 'not_configured' });
      } else {
        setAiReview({
          status: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong running the AI review.',
          unavailable: false,
        });
      }
    }
  }

  function openAiReview() {
    setAiReviewOpen(true);
    void runAiReview();
  }

  return (
    <>
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
          aiReview={aiReview.status === 'ready' ? aiReview : undefined}
          aiPhoto={aiPhoto.status === 'ready' ? aiPhoto.image : undefined}
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={openAiPhoto}>
                <Sparkles className="w-4 h-4" /> AI Photo
              </Button>
              <AiCheckButton onClick={openAiReview} loading={aiReview.status === 'loading'} />
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

    <Modal open={aiPhotoOpen} onClose={() => setAiPhotoOpen(false)} title="AI Photorealistic Preview" wide>
      {aiPhoto.status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm text-slate-500">Rendering your fabric…</p>
        </div>
      )}
      {aiPhoto.status === 'error' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          {aiPhoto.unavailable ? (
            <p>
              AI rendering isn&apos;t configured yet — it requires the{' '}
              <code className="font-mono text-xs">GEMINI_API_KEY</code> on the server. The standard preview above
              is always available.
            </p>
          ) : (
            <p>{aiPhoto.message}</p>
          )}
          {!aiPhoto.limitReached && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={runAiPhoto}>
              Try again
            </Button>
          )}
        </div>
      )}
      {aiPhoto.status === 'ready' && (
        <div className="flex flex-col gap-4">
          <img
            src={aiPhoto.image}
            alt="AI-generated photorealistic fabric visualization"
            className="w-full rounded-xl border border-slate-200"
          />
          <p className="text-xs leading-relaxed text-slate-500">
            AI-generated visualization — indicative only. Final appearance is confirmed by the approved physical
            sample.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={aiPhoto.image}
              download={`${spec.name || 'fabric-design'}-ai-preview.png`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-600/30 bg-white px-4 py-2.5 text-sm font-bold text-brand-600 hover:bg-slate-50 transition-all"
            >
              <Download className="w-4 h-4" /> Download
            </a>
            <Button size="md" variant="secondary" onClick={runAiPhoto} disabled={rendersLeft === 0}>
              {rendersLeft > 0 ? `Regenerate (${rendersLeft} left)` : 'Render limit reached'}
            </Button>
          </div>
          {rendersLeft === 0 && (
            <p className="text-[11px] text-slate-400">
              {AI_RENDER_LIMIT === 1
                ? 'Each design includes one AI photo render. Save your changes as a new design for another.'
                : `Each design includes ${AI_RENDER_LIMIT} AI photo renders. Save your changes as a new design for more.`}
            </p>
          )}
        </div>
      )}
    </Modal>

    <Modal open={aiReviewOpen} onClose={() => setAiReviewOpen(false)} title="AI Manufacturability Review" wide>
      {aiReview.status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm text-slate-500">Reviewing your design…</p>
        </div>
      )}
      {aiReview.status === 'error' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          {aiReview.unavailable ? (
            <p>
              AI review isn&apos;t configured yet — it requires the{' '}
              <code className="font-mono text-xs">GEMINI_API_KEY</code> on the server. The rule-based weavability
              check in the panel on the right is always available.
            </p>
          ) : (
            <p>{aiReview.message}</p>
          )}
          <Button size="sm" variant="secondary" className="mt-3" onClick={runAiReview}>
            Try again
          </Button>
        </div>
      )}
      {aiReview.status === 'ready' && (
        <div className="flex flex-col gap-4">
          <FeasibilityBadge level={aiReview.level} />
          <p className="text-sm leading-relaxed text-slate-700">{aiReview.summary}</p>
          {aiReview.issues.length > 0 && (
            <ul className="flex flex-col gap-2">
              {aiReview.issues.map((issue, i) => (
                <li
                  key={`${issue.code}-${i}`}
                  className={`text-xs rounded-lg border px-2.5 py-2 leading-relaxed ${
                    issue.severity === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : issue.severity === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <p className="font-medium">{issue.message}</p>
                  {issue.hint && <p className="mt-0.5 opacity-80">{issue.hint}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Advisory AI feedback — not a production approval.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-400">{TECHNICAL_REVIEW_DISCLAIMER}</p>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}
