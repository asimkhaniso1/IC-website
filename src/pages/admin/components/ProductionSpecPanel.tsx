import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Lock, Sparkles } from 'lucide-react';
import type { DesignSpec, Family, ProductionSpec, TechnicalDetails } from '../../../lib/types';
import { useCapabilities } from '../../../lib/capabilities';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { saveProductionSpec } from '../../../lib/api/admin';
import { AiUnavailableError, generateProductionSpecDraft } from '../../../lib/ai';
import { Badge, Button, Field, Modal, Panel, Select, TextArea, TextInput, Tooltip } from '../../../components/ui';

/** Ordered field definitions shared by the read-only customer block, the editable form, and the Loom / CAD export. */
export const TECHNICAL_FIELD_DEFS: { key: keyof TechnicalDetails; label: string }[] = [
  { key: 'constructionType', label: 'Construction Type' },
  { key: 'yarnType', label: 'Yarn Type' },
  { key: 'yarnCount', label: 'Yarn Count' },
  { key: 'warpConfig', label: 'Warp Configuration' },
  { key: 'weftConfig', label: 'Weft Configuration' },
  { key: 'rubberType', label: 'Rubber Type' },
  { key: 'rubberConfig', label: 'Rubber Configuration' },
  { key: 'elasticEnds', label: 'Elastic Ends' },
  { key: 'picksDensity', label: 'Picks / Density (notes)' },
  { key: 'endsPerCm', label: 'Ends / cm (warp density)' },
  { key: 'picksPerCm', label: 'Picks / cm (weft density)' },
  { key: 'finishedWidthMm', label: 'Finished Width (mm)' },
  { key: 'elongationPct', label: 'Target Elongation (%)' },
  { key: 'recoveryPct', label: 'Recovery (%)' },
  { key: 'weightPerMeter', label: 'Weight / Meter' },
  { key: 'gsm', label: 'GSM' },
  { key: 'thicknessMm', label: 'Thickness (mm)' },
  { key: 'tolerance', label: 'Tolerance' },
  { key: 'machineRef', label: 'Machine Reference' },
  { key: 'finishing', label: 'Finishing' },
];

/** Fields entered as short single-line text — everything but constructionType (own control) and notes (textarea). */
const SIMPLE_FIELD_DEFS = TECHNICAL_FIELD_DEFS.filter((f) => f.key !== 'constructionType');

function hasContent(details: TechnicalDetails | undefined): boolean {
  if (!details) return false;
  return TECHNICAL_FIELD_DEFS.some((f) => (details[f.key] ?? '').trim().length > 0) || Boolean(details.notes?.trim());
}

function emptyDetails(): TechnicalDetails {
  return {};
}

// ---------------------------------------------------------------------------
// Read-only "customer-provided technical input" block
// ---------------------------------------------------------------------------

function CustomerTechnicalBlock({ technical }: { technical: TechnicalDetails }) {
  const filled = TECHNICAL_FIELD_DEFS.filter((f) => (technical[f.key] ?? '').trim().length > 0);
  const notes = technical.notes?.trim();
  if (filled.length === 0 && !notes) return null;

  return (
    <div className="border-l-4 border-amber-400 bg-amber-50/60 rounded-r-lg px-4 py-3 mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2">
        Customer-provided technical input (reference only)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {filled.map((f) => (
          <div key={f.key} className="flex items-center justify-between py-1 border-b border-amber-100 last:border-0">
            <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">{f.label}</span>
            <span className="text-xs text-amber-900 text-right">{technical[f.key]}</span>
          </div>
        ))}
      </div>
      {notes && <p className="text-xs text-amber-900 whitespace-pre-wrap mt-2">{notes}</p>}
      <p className="text-[10px] italic text-amber-700/80 mt-2">
        Provided by the customer for reference — not an approved manufacturing parameter.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ProductionSpecPanel({
  projectId,
  family,
  spec,
  customerTechnical,
  productionSpec,
  actorEmail,
  onSaved,
}: {
  projectId: string;
  family: Family;
  /** Full customer design spec — required only for the AI-assisted draft, which grounds itself in it. */
  spec?: DesignSpec;
  customerTechnical?: TechnicalDetails;
  productionSpec: ProductionSpec | null;
  actorEmail: string;
  onSaved: () => void;
}) {
  const [details, setDetails] = useState<TechnicalDetails>(productionSpec?.details ?? emptyDetails());
  const [constructionOther, setConstructionOther] = useState('');
  const [busy, setBusy] = useState<'draft' | 'approve' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFilledCount, setAiFilledCount] = useState<number | null>(null);

  const capabilities = useCapabilities();
  const constructionOptions = capabilities[family]?.constructions ?? [];

  useEffect(() => {
    const nextDetails = productionSpec?.details ?? emptyDetails();
    setDetails(nextDetails);
    const ct = nextDetails.constructionType ?? '';
    setConstructionOther(ct && !constructionOptions.includes(ct) ? ct : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productionSpec?.id, projectId]);

  function set<K extends keyof TechnicalDetails>(key: K, value: string) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  function effectiveDetails(): TechnicalDetails {
    if (details.constructionType === 'Other') {
      return { ...details, constructionType: constructionOther.trim() ? `Other — ${constructionOther.trim()}` : 'Other' };
    }
    return details;
  }

  /**
   * AI-assisted DRAFT — fills only currently-empty fields (never overwrites
   * something the technical team already entered), and the result is plain
   * editable form state, not saved or approved until they choose to.
   */
  async function generateDraft() {
    if (!spec) return;
    setAiError(null);
    setAiFilledCount(null);
    setAiBusy(true);
    try {
      const { details: suggested } = await generateProductionSpecDraft(spec, capabilities[family], customerTechnical);
      const constructionWasEmpty = !details.constructionType?.trim();
      let filled = 0;
      setDetails((d) => {
        const next = { ...d };
        for (const key of Object.keys(suggested) as (keyof TechnicalDetails)[]) {
          const value = suggested[key];
          if (!value || (next[key] ?? '').trim()) continue;
          next[key] = value;
          filled += 1;
        }
        return next;
      });
      if (suggested.constructionType && !constructionOptions.includes(suggested.constructionType) && constructionWasEmpty) {
        setConstructionOther(suggested.constructionType);
      }
      setAiFilledCount(filled);
    } catch (err) {
      setAiError(
        err instanceof AiUnavailableError || err instanceof Error ? err.message : 'Could not generate an AI draft.'
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function persist(status: 'draft' | 'approved') {
    setError(null);
    setBusy(status === 'approved' ? 'approve' : 'draft');
    try {
      await saveProductionSpec(projectId, effectiveDetails(), status, actorEmail);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the production specification.');
    } finally {
      setBusy(null);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <Panel title="Production Specification (Internal)">
        <p className="text-sm text-slate-400">Supabase is required to view or edit production specifications.</p>
      </Panel>
    );
  }

  const status = productionSpec?.status ?? 'draft';

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          Production Specification (Internal)
          <Badge tone={status === 'approved' ? 'green' : 'slate'}>{status === 'approved' ? 'Approved' : 'Draft'}</Badge>
        </span>
      }
      action={
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-slate-400">
          <Lock className="w-3 h-3 shrink-0" /> Internal — never shown to the customer
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {hasContent(customerTechnical) && <CustomerTechnicalBlock technical={customerTechnical!} />}

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        {spec && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Tooltip text="Drafts a starting point from the design and the capability library — grounded fields only, nothing invented. Fills only currently-empty fields; review and edit everything before saving.">
              <Button variant="secondary" size="sm" onClick={() => void generateDraft()} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                AI Draft
              </Button>
            </Tooltip>
            <span className="text-[11px] text-slate-500 leading-snug">
              {aiError
                ? <span className="font-medium text-red-600">{aiError}</span>
                : aiFilledCount !== null
                  ? aiFilledCount > 0
                    ? <span className="font-medium text-green-600">Filled {aiFilledCount} empty field{aiFilledCount === 1 ? '' : 's'} — review before saving.</span>
                    : 'Nothing to fill — every field already has a value.'
                  : 'Suggests starting values from this design; every field stays editable and nothing is saved automatically.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Construction Type" htmlFor="ps-construction">
            <Select
              id="ps-construction"
              value={
                details.constructionType && constructionOptions.includes(details.constructionType)
                  ? details.constructionType
                  : details.constructionType
                    ? 'Other'
                    : ''
              }
              onChange={(e) => set('constructionType', e.target.value)}
            >
              <option value="">—</option>
              {constructionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          {(details.constructionType === 'Other' ||
            (details.constructionType && !constructionOptions.includes(details.constructionType))) && (
            <Field label="Construction — Other (specify)" htmlFor="ps-construction-other">
              <TextInput
                id="ps-construction-other"
                value={constructionOther}
                onChange={(e) => setConstructionOther(e.target.value)}
                placeholder="Describe the construction"
              />
            </Field>
          )}

          {SIMPLE_FIELD_DEFS.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`ps-${f.key}`}>
              <TextInput
                id={`ps-${f.key}`}
                value={details[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </Field>
          ))}
        </div>

        <Field label="Notes" htmlFor="ps-notes">
          <TextArea id="ps-notes" rows={3} value={details.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {productionSpec?.updatedBy ? (
              <>
                Last updated by <span className="font-mono">{productionSpec.updatedBy}</span> ·{' '}
                {new Date(productionSpec.updatedAt).toLocaleString()}
              </>
            ) : (
              'No production specification saved yet.'
            )}
            {savedFlash && (
              <span className="inline-flex items-center gap-1 ml-2 text-green-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void persist('draft')} disabled={busy !== null}>
              {busy === 'draft' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Draft
            </Button>
            <Button variant="primary" size="sm" onClick={() => setConfirmOpen(true)} disabled={busy !== null}>
              {busy === 'approve' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Approve Specification
            </Button>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Approve Production Specification">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Approving marks this construction as reviewed by the technical team. Continue?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmOpen(false);
                void persist('approved');
              }}
              disabled={busy !== null}
            >
              {busy === 'approve' && <Loader2 className="w-4 h-4 animate-spin" />}
              Approve
            </Button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}

export default ProductionSpecPanel;
