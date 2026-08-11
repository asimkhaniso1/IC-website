import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  History,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { AdminGuard } from '../../auth/AdminGuard';
import { useSession } from '../../auth/useSession';
import { AdminChrome } from './components/AdminChrome';
import { STATUS_TONE } from './components/statusTone';
import {
  addComment,
  createAdminRevision,
  getProjectDetail,
  setStatus,
  type AdminProjectDetail,
} from '../../lib/api/admin';
import type { ArtworkItem, DesignSpec, DesignStatus, JacquardSpec, KnittedSpec, WovenSpec } from '../../lib/types';
import { DESIGN_STATUSES, FAMILY_BY_CODE } from '../../lib/constants';
import { revisionLabel } from '../../lib/ids';
import { Badge, Button, ColorSwatch, Field, Modal, Panel, Select, TextArea, Tooltip } from '../../components/ui';

const DECISIONS = ['Feasible', 'Needs Modification', 'Not Feasible'];

function friendly(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ---------------------------------------------------------------------------
// Spec renderer
// ---------------------------------------------------------------------------

function SwatchRow({ label, hex }: { label: string; hex?: string }) {
  if (!hex) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="flex items-center gap-2">
        <ColorSwatch color={hex} size="sm" />
        <span className="font-mono text-xs text-slate-600">{hex.toUpperCase()}</span>
      </span>
    </div>
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  );
}

function ArtworkThumb({ item }: { item: ArtworkItem }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50">
      {item.kind === 'image' && item.dataUrl ? (
        <img src={item.dataUrl} alt="" className="w-10 h-10 object-contain rounded bg-white border border-slate-200" />
      ) : (
        <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-slate-300" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">
          {item.kind === 'text' ? `"${item.text ?? ''}"` : 'Image'}
        </p>
        <p className="text-[11px] text-slate-400 font-mono">
          {item.transform.widthMm.toFixed(1)} × {item.transform.heightMm.toFixed(1)} mm
        </p>
      </div>
    </div>
  );
}

function SpecPanel({ spec }: { spec: DesignSpec }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <KvRow label="Width" value={`${spec.widthMm.toFixed(1)} mm`} />
        <KvRow label="Roll Length" value={`${spec.rollLengthM} m`} />
        <KvRow
          label="Elastic"
          value={spec.elastic ? `Yes${spec.elasticityClass ? ` — ${spec.elasticityClass}` : ''}` : 'No'}
        />
        <KvRow label="Thickness" value={spec.thicknessClass} />
        {spec.construction && <KvRow label="Construction" value={spec.construction} />}
        <KvRow label="Edge Style" value={spec.edgeStyle} />
        <KvRow label="Application" value={spec.application} />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Colors</p>
        <SwatchRow label="Base" hex={spec.baseColor} />
        <SwatchRow label="Secondary" hex={spec.secondaryColor} />
        <SwatchRow label="Edge" hex={spec.edgeColor} />
        {spec.additionalColors && spec.additionalColors.length > 0 && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Additional</span>
            <span className="flex items-center gap-1">
              {spec.additionalColors.map((c, i) => (
                <ColorSwatch key={`${c}-${i}`} color={c} size="sm" />
              ))}
            </span>
          </div>
        )}
      </div>

      {spec.family === 'J' && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Jacquard</p>
          <SwatchRow label="Foreground" hex={(spec as JacquardSpec).fg} />
          <KvRow label="Repeat Length" value={`${(spec as JacquardSpec).repeat.lengthMm.toFixed(1)} mm`} />
          <KvRow label="Repeat Spacing" value={`${(spec as JacquardSpec).repeat.spacingMm.toFixed(1)} mm`} />
          <KvRow label="Mirror" value={(spec as JacquardSpec).repeat.mirror ? 'Yes' : 'No'} />
          <KvRow label="Reverse" value={(spec as JacquardSpec).repeat.reverse ? 'Yes' : 'No'} />
          {(spec as JacquardSpec).artwork.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              {(spec as JacquardSpec).artwork.map((item) => (
                <ArtworkThumb key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {spec.family === 'W' && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Woven</p>
          <KvRow label="Rubber" value={(spec as WovenSpec).rubber} />
          <div className="flex flex-col gap-1 mt-1.5">
            {(spec as WovenSpec).stripes.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500">
                  #{i + 1} · width {s.widthMm.toFixed(1)} mm · offset {s.offsetMm.toFixed(1)} mm
                </span>
                <ColorSwatch color={s.color} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {spec.family === 'K' && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Knitted</p>
          <KvRow label="Rubber" value={(spec as KnittedSpec).rubber ? 'Yes' : 'No'} />
        </div>
      )}

      {spec.notes && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Customer Notes</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{spec.notes}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DetailBody({ id }: { id: string }) {
  const navigate = useNavigate();
  const { session } = useSession();
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProjectDetail(id)
      .then((d) => {
        if (!active) return;
        setDetail(d);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(friendly(err, 'Could not load this design.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, refreshKey]);

  const actorEmail = session?.user.email ?? 'unknown-staff';
  const actorUid = session?.user.id ?? '';

  // --- status transition ---
  const [statusBusy, setStatusBusy] = useState(false);
  async function handleStatusChange(next: string) {
    if (!detail || next === detail.project.status) return;
    if (!window.confirm(`Change status of ${detail.project.designCode} to "${next}"?`)) return;
    setStatusBusy(true);
    try {
      await setStatus(detail.project.id, next as DesignStatus, actorEmail);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(friendly(err, 'Could not update status.'));
    } finally {
      setStatusBusy(false);
    }
  }

  // --- comments ---
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  async function handleAddComment() {
    if (!detail || !comment.trim()) return;
    setCommentBusy(true);
    try {
      await addComment(detail.project.id, comment.trim(), decision || undefined, actorUid);
      setComment('');
      setDecision('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(friendly(err, 'Could not save comment.'));
    } finally {
      setCommentBusy(false);
    }
  }

  // --- create technical revision ---
  const [revOpen, setRevOpen] = useState(false);
  const [revSpecText, setRevSpecText] = useState('');
  const [revNotes, setRevNotes] = useState('');
  const [revError, setRevError] = useState<string | null>(null);
  const [revBusy, setRevBusy] = useState(false);

  function openRevisionModal() {
    if (!detail) return;
    setRevSpecText(JSON.stringify(detail.project.spec, null, 2));
    setRevNotes('');
    setRevError(null);
    setRevOpen(true);
  }

  async function submitRevision() {
    if (!detail) return;
    let parsed: DesignSpec;
    try {
      parsed = JSON.parse(revSpecText) as DesignSpec;
    } catch {
      setRevError('That is not valid JSON.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || parsed.family !== detail.project.family) {
      setRevError(`The spec must keep "family": "${detail.project.family}".`);
      return;
    }
    setRevBusy(true);
    try {
      await createAdminRevision(detail.project.id, parsed, revNotes.trim() || undefined, actorEmail);
      setRevOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setRevError(friendly(err, 'Could not create the revision.'));
    } finally {
      setRevBusy(false);
    }
  }

  const familyLabel = useMemo(
    () => (detail ? (FAMILY_BY_CODE[detail.project.family]?.label ?? detail.project.family) : ''),
    [detail]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-slate-600 max-w-md">{error ?? 'Design not found.'}</p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </button>
      </div>
    );
  }

  const { project } = detail;

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/admin')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 self-start"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All designs
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-mono text-xl font-bold text-slate-900">{project.designCode}</h1>
            <Badge tone="slate">{revisionLabel(project.revisionNo)}</Badge>
            <Badge tone="brand">{familyLabel}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{project.spec?.name || 'Untitled design'}</p>
          {(project.customerName || project.customerCompany) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {project.customerName}
              {project.customerCompany ? ` · ${project.customerCompany}` : ''}
              {project.customerEmail ? ` · ${project.customerEmail}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={project.status}
            disabled={statusBusy}
            onChange={(e) => void handleStatusChange(e.target.value)}
            className="w-56"
          >
            {DESIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Tooltip text="Product code generation will be driven by approved technical parameters">
            <span className="inline-flex items-center gap-1.5">
              <Button variant="secondary" disabled>
                <Lock className="w-3.5 h-3.5" />
                Convert to Product Code
              </Button>
              <Badge tone="slate">Future Integration</Badge>
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: spec + weavability */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Panel title="Specification">
            <SpecPanel spec={project.spec} />
          </Panel>

          <Panel title="Weavability / Manufacturability">
            {project.weavability ? (
              <div className="flex flex-col gap-2">
                <Badge
                  tone={
                    project.weavability.level === 'suitable'
                      ? 'green'
                      : project.weavability.level === 'review'
                        ? 'amber'
                        : 'red'
                  }
                >
                  {project.weavability.level}
                </Badge>
                {project.weavability.issues.length === 0 ? (
                  <p className="text-sm text-slate-500">No issues flagged.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 mt-1">
                    {project.weavability.issues.map((iss, i) => (
                      <li key={i} className="text-sm text-slate-700">
                        <Badge
                          tone={iss.severity === 'error' ? 'red' : iss.severity === 'warn' ? 'amber' : 'slate'}
                          className="mr-1.5"
                        >
                          {iss.severity}
                        </Badge>
                        {iss.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Not evaluated.</p>
            )}
          </Panel>

          <Panel
            title="Internal Comments"
            action={<MessageSquare className="w-4 h-4 text-slate-300" />}
          >
            <div className="flex flex-col gap-3 mb-4">
              {detail.reviews.length === 0 ? (
                <p className="text-sm text-slate-400">No comments yet.</p>
              ) : (
                detail.reviews.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{r.author ?? 'staff'}</span>
                      <span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    {r.decision && <Badge tone="brand" className="mb-1.5">{r.decision}</Badge>}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col gap-2">
              <TextArea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add an internal note for the technical team…"
              />
              <div className="flex items-center gap-2">
                <Select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-52">
                  <option value="">No decision</option>
                  {DECISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleAddComment()}
                  disabled={commentBusy || !comment.trim()}
                >
                  {commentBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Post Comment
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right: revisions + RFQs */}
        <div className="flex flex-col gap-6">
          <Panel
            title="Revision History"
            action={
              <Button variant="secondary" size="sm" onClick={openRevisionModal}>
                <Plus className="w-3.5 h-3.5" />
                New Revision
              </Button>
            }
          >
            <ul className="flex flex-col gap-2">
              {detail.revisions.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-sm">
                  <History className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700">
                      {revisionLabel(r.revisionNo)} · {r.createdBy}
                    </p>
                    <p className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
                    {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={`RFQs (${detail.rfqs.length})`}>
            {detail.rfqs.length === 0 ? (
              <p className="text-sm text-slate-400">No requests yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {detail.rfqs.map((r) => (
                  <li key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge tone={r.kind === 'sample' ? 'amber' : 'brand'}>{r.kind}</Badge>
                      <span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="font-bold text-slate-800">{r.contactName}</p>
                    {r.company && <p className="text-xs text-slate-500">{r.company}</p>}
                    <p className="text-xs text-slate-500">{r.email}</p>
                    {r.quantity && (
                      <p className="text-xs text-slate-500 mt-1">
                        Qty: {r.quantity} {r.quantityUnit ?? ''}
                      </p>
                    )}
                    {r.message && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{r.message}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal open={revOpen} onClose={() => setRevOpen(false)} title="Create Technical Revision" wide>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400 italic">
            Full technical editor comes in Phase 2 — for now, edit the raw specification JSON directly. The family
            must remain <span className="font-mono">"{project.family}"</span>.
          </p>
          <Field label="Spec JSON" htmlFor="rev-spec">
            <textarea
              id="rev-spec"
              value={revSpecText}
              onChange={(e) => setRevSpecText(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </Field>
          <Field label="Revision Notes" htmlFor="rev-notes">
            <TextArea
              id="rev-notes"
              rows={2}
              value={revNotes}
              onChange={(e) => setRevNotes(e.target.value)}
              placeholder="What changed and why…"
            />
          </Field>
          {revError && <p className="text-xs font-medium text-red-600">{revError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRevOpen(false)} disabled={revBusy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submitRevision()} disabled={revBusy}>
              {revBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Revision
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminDesignDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <AdminGuard>
      <AdminChrome>{id ? <DetailBody id={id} /> : <p className="text-slate-500">Missing design id.</p>}</AdminChrome>
    </AdminGuard>
  );
}
