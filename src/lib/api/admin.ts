/**
 * Staff-side data access — direct table queries through Supabase Auth + RLS
 * (is_staff() policies in supabase/migrations/0001_init.sql). Only used
 * behind AdminGuard, where a Supabase session is guaranteed to exist.
 */
import type {
  DesignReview,
  DesignSpec,
  DesignStatus,
  Family,
  ProductionSpec,
  RfqRecord,
  TechnicalDetails,
  WeavabilityResult,
} from '../types';
import { getSupabase } from '../supabase';

function friendlyError(err: unknown, fallback: string): Error {
  const raw =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : typeof err === 'string'
        ? err
        : '';
  return new Error(raw && raw.trim().length > 0 ? raw : fallback);
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface AdminProjectSummary {
  id: string;
  designCode: string;
  family: Family;
  status: DesignStatus;
  revisionNo: number;
  spec: DesignSpec;
  weavability?: WeavabilityResult;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  rfqCount: number;
}

export interface AdminRevision {
  id: string;
  revisionNo: number;
  spec: DesignSpec;
  weavability?: WeavabilityResult;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface AdminActivity {
  id: string;
  actor: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminProjectDetail {
  project: AdminProjectSummary;
  revisions: AdminRevision[];
  reviews: DesignReview[];
  rfqs: RfqRecord[];
  activity: AdminActivity[];
  /** Internal production specification, kept separate from the customer's spec. Null when none exists yet. */
  productionSpec: ProductionSpec | null;
}

// Raw row shapes (hand-typed — no generated Database types in this project).

interface RawProjectRow {
  id: string;
  design_code: string;
  family: Family;
  name: string;
  status: DesignStatus;
  customer_name: string | null;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  current_revision: number;
  created_at: string;
  updated_at: string;
}

interface RawRevisionRow {
  id: string;
  project_id: string;
  revision_no: number;
  spec: unknown;
  weavability: unknown;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface RawReviewRow {
  id: string;
  project_id: string;
  author: string | null;
  comment: string;
  internal: boolean;
  decision: string | null;
  created_at: string;
}

interface RawRfqRow {
  id: string;
  project_id: string;
  kind: string;
  contact_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  quantity: string | null;
  quantity_unit: string | null;
  annual_requirement: string | null;
  target_price: string | null;
  target_date: string | null;
  application: string | null;
  message: string | null;
  status: string;
  created_at: string;
  design_projects?: { design_code: string } | null;
}

interface RawActivityRow {
  id: string;
  actor: string;
  action: string;
  payload: unknown;
  created_at: string;
}

interface RawProductionSpecRow {
  id: string;
  project_id: string;
  details: unknown;
  status: 'draft' | 'approved';
  updated_by: string | null;
  updated_at: string;
}

interface RawCapabilityRuleRow {
  id: string;
  family: Family;
  rule_key: string;
  rule_value: unknown;
  notes: string | null;
}

function mapProductionSpec(r: RawProductionSpecRow): ProductionSpec {
  return {
    id: r.id,
    projectId: r.project_id,
    details: (r.details as TechnicalDetails | null) ?? {},
    status: r.status,
    updatedBy: r.updated_by ?? undefined,
    updatedAt: r.updated_at,
  };
}

function mapRfq(r: RawRfqRow, designCode?: string): RfqRecord {
  return {
    id: r.id,
    designId: r.project_id,
    designCode: designCode ?? r.design_projects?.design_code,
    kind: (r.kind as 'sample' | 'quote') ?? 'sample',
    contactName: r.contact_name,
    company: r.company ?? undefined,
    email: r.email,
    phone: r.phone ?? undefined,
    country: r.country ?? undefined,
    quantity: r.quantity ?? undefined,
    quantityUnit: r.quantity_unit ?? undefined,
    annualRequirement: r.annual_requirement ?? undefined,
    targetPrice: r.target_price ?? undefined,
    targetDate: r.target_date ?? undefined,
    application: r.application ?? undefined,
    message: r.message ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapReview(r: RawReviewRow): DesignReview {
  return {
    id: r.id,
    projectId: r.project_id,
    author: r.author ?? undefined,
    comment: r.comment,
    internal: r.internal,
    decision: r.decision ?? undefined,
    createdAt: r.created_at,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listProjects(filter?: { status?: DesignStatus }): Promise<AdminProjectSummary[]> {
  const supabase = requireSupabase();

  let query = supabase.from('design_projects').select('*').order('updated_at', { ascending: false });
  if (filter?.status) query = query.eq('status', filter.status);
  const { data: projectsRaw, error } = await query;
  if (error) throw friendlyError(error, 'Could not load designs.');
  const projects = (projectsRaw ?? []) as RawProjectRow[];
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);

  const [{ data: revisionsRaw, error: revErr }, { data: rfqRowsRaw, error: rfqErr }] = await Promise.all([
    supabase.from('design_revisions').select('project_id, revision_no, spec, weavability').in('project_id', ids),
    supabase.from('rfqs').select('project_id').in('project_id', ids),
  ]);
  if (revErr) throw friendlyError(revErr, 'Could not load design specifications.');
  if (rfqErr) throw friendlyError(rfqErr, 'Could not load RFQ counts.');

  const revByProject = new Map<string, { revision_no: number; spec: unknown; weavability: unknown }>();
  for (const r of (revisionsRaw ?? []) as Array<{ project_id: string; revision_no: number; spec: unknown; weavability: unknown }>) {
    const existing = revByProject.get(r.project_id);
    if (!existing || r.revision_no > existing.revision_no) revByProject.set(r.project_id, r);
  }

  const rfqCounts = new Map<string, number>();
  for (const row of (rfqRowsRaw ?? []) as Array<{ project_id: string }>) {
    rfqCounts.set(row.project_id, (rfqCounts.get(row.project_id) ?? 0) + 1);
  }

  return projects.map((p) => {
    const rev = revByProject.get(p.id);
    return {
      id: p.id,
      designCode: p.design_code,
      family: p.family,
      status: p.status,
      revisionNo: p.current_revision,
      spec: (rev?.spec ?? {}) as DesignSpec,
      weavability: (rev?.weavability as WeavabilityResult | null | undefined) ?? undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      customerName: p.customer_name ?? undefined,
      customerCompany: p.customer_company ?? undefined,
      customerEmail: p.customer_email ?? undefined,
      customerPhone: p.customer_phone ?? undefined,
      rfqCount: rfqCounts.get(p.id) ?? 0,
    };
  });
}

export async function getProjectDetail(id: string): Promise<AdminProjectDetail | null> {
  const supabase = requireSupabase();

  const { data: projectRaw, error } = await supabase.from('design_projects').select('*').eq('id', id).maybeSingle();
  if (error) throw friendlyError(error, 'Could not load this design.');
  if (!projectRaw) return null;
  const project = projectRaw as RawProjectRow;

  const [revisionsRes, reviewsRes, rfqsRes, activityRes, productionSpecRes] = await Promise.all([
    supabase.from('design_revisions').select('*').eq('project_id', id).order('revision_no', { ascending: false }),
    supabase.from('design_reviews').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('rfqs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('activity_log').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('production_specs').select('*').eq('project_id', id).maybeSingle(),
  ]);
  if (revisionsRes.error) throw friendlyError(revisionsRes.error, 'Could not load revision history.');
  if (reviewsRes.error) throw friendlyError(reviewsRes.error, 'Could not load review comments.');
  if (rfqsRes.error) throw friendlyError(rfqsRes.error, 'Could not load RFQs.');
  if (activityRes.error) throw friendlyError(activityRes.error, 'Could not load activity log.');
  if (productionSpecRes.error) throw friendlyError(productionSpecRes.error, 'Could not load the production specification.');

  const revisions = (revisionsRes.data ?? []) as RawRevisionRow[];
  const rfqs = (rfqsRes.data ?? []) as RawRfqRow[];
  const current = revisions.find((r) => r.revision_no === project.current_revision) ?? revisions[0];

  const summary: AdminProjectSummary = {
    id: project.id,
    designCode: project.design_code,
    family: project.family,
    status: project.status,
    revisionNo: project.current_revision,
    spec: (current?.spec ?? {}) as DesignSpec,
    weavability: (current?.weavability as WeavabilityResult | null | undefined) ?? undefined,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    customerName: project.customer_name ?? undefined,
    customerCompany: project.customer_company ?? undefined,
    customerEmail: project.customer_email ?? undefined,
    customerPhone: project.customer_phone ?? undefined,
    rfqCount: rfqs.length,
  };

  return {
    project: summary,
    revisions: revisions.map((r) => ({
      id: r.id,
      revisionNo: r.revision_no,
      spec: r.spec as DesignSpec,
      weavability: (r.weavability as WeavabilityResult | null | undefined) ?? undefined,
      notes: r.notes ?? undefined,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
    reviews: ((reviewsRes.data ?? []) as RawReviewRow[]).map(mapReview),
    rfqs: rfqs.map((r) => mapRfq(r, project.design_code)),
    activity: ((activityRes.data ?? []) as RawActivityRow[]).map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      payload: (a.payload as Record<string, unknown> | null) ?? {},
      createdAt: a.created_at,
    })),
    productionSpec: productionSpecRes.data ? mapProductionSpec(productionSpecRes.data as RawProductionSpecRow) : null,
  };
}

export async function listRfqs(): Promise<RfqRecord[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('rfqs')
    .select('*, design_projects(design_code)')
    .order('created_at', { ascending: false });
  if (error) throw friendlyError(error, 'Could not load RFQs.');
  return ((data ?? []) as RawRfqRow[]).map((r) => mapRfq(r));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function setStatus(id: string, status: DesignStatus, actorEmail: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('design_projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw friendlyError(error, 'Could not update status.');

  const { error: actErr } = await supabase.from('activity_log').insert({
    project_id: id,
    actor: actorEmail,
    action: 'status.changed',
    payload: { status },
  });
  if (actErr) throw friendlyError(actErr, 'Status updated, but the activity log entry could not be written.');
}

export async function addComment(
  projectId: string,
  comment: string,
  decision: string | undefined,
  authorUid: string
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('design_reviews').insert({
    project_id: projectId,
    author: authorUid,
    comment,
    internal: true,
    decision: decision ?? null,
  });
  if (error) throw friendlyError(error, 'Could not save comment.');

  await supabase.from('activity_log').insert({
    project_id: projectId,
    actor: authorUid,
    action: 'review.comment',
    payload: decision ? { decision } : {},
  });
}

export async function createAdminRevision(
  projectId: string,
  spec: DesignSpec,
  notes: string | undefined,
  actorEmail: string
): Promise<void> {
  const supabase = requireSupabase();

  const { data: latest, error: fetchErr } = await supabase
    .from('design_revisions')
    .select('revision_no')
    .eq('project_id', projectId)
    .order('revision_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchErr) throw friendlyError(fetchErr, 'Could not determine the next revision number.');
  const nextRevisionNo = ((latest as { revision_no: number } | null)?.revision_no ?? 0) + 1;

  const { error: insErr } = await supabase.from('design_revisions').insert({
    project_id: projectId,
    revision_no: nextRevisionNo,
    spec,
    notes: notes ?? null,
    created_by: actorEmail,
  });
  if (insErr) throw friendlyError(insErr, 'Could not create the new revision.');

  const { error: updErr } = await supabase
    .from('design_projects')
    .update({ current_revision: nextRevisionNo, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (updErr) throw friendlyError(updErr, 'Revision created, but the project record could not be updated.');

  await supabase.from('activity_log').insert({
    project_id: projectId,
    actor: actorEmail,
    action: 'revision.created',
    payload: { revisionNo: nextRevisionNo },
  });
}

// ---------------------------------------------------------------------------
// Production specification (INTERNAL — never shown to the customer)
//
// Stored separately from the customer's design requirement
// (design_revisions.spec). The technical team's production parameters never
// overwrite the customer's original spec, and customer choices never
// automatically become an approved manufacturing spec — this row only
// changes through an explicit staff save/approve action.
// ---------------------------------------------------------------------------

export async function getProductionSpec(projectId: string): Promise<ProductionSpec | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('production_specs')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw friendlyError(error, 'Could not load the production specification.');
  return data ? mapProductionSpec(data as RawProductionSpecRow) : null;
}

export async function saveProductionSpec(
  projectId: string,
  details: TechnicalDetails,
  status: 'draft' | 'approved',
  actorEmail: string
): Promise<ProductionSpec> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('production_specs')
    .upsert(
      {
        project_id: projectId,
        details,
        status,
        updated_by: actorEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    )
    .select('*')
    .single();
  if (error) throw friendlyError(error, 'Could not save the production specification.');

  await supabase.from('activity_log').insert({
    project_id: projectId,
    actor: actorEmail,
    action: status === 'approved' ? 'production_spec.approved' : 'production_spec.updated',
    payload: { status },
  });

  return mapProductionSpec(data as RawProductionSpecRow);
}

export async function listCapabilityRules(
  family?: Family
): Promise<{ family: string; ruleKey: string; ruleValue: unknown; notes?: string }[]> {
  const supabase = requireSupabase();
  let query = supabase.from('capability_rules').select('*');
  if (family) query = query.eq('family', family);
  const { data, error } = await query;
  if (error) throw friendlyError(error, 'Could not load the capability library.');
  return ((data ?? []) as RawCapabilityRuleRow[]).map((r) => ({
    family: r.family,
    ruleKey: r.rule_key,
    ruleValue: r.rule_value,
    notes: r.notes ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Admin settings — capability library editing + staff management
// ---------------------------------------------------------------------------

export async function updateCapabilityRule(
  family: Family,
  ruleKey: string,
  ruleValue: unknown,
  notes?: string
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('capability_rules')
    .update({ rule_value: ruleValue, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq('family', family)
    .eq('rule_key', ruleKey);
  if (error) throw friendlyError(error, 'Could not save the capability rule.');
}

export interface StaffMember {
  id: string;
  role: 'admin' | 'technical';
  fullName?: string;
  createdAt: string;
}

export async function listStaff(): Promise<StaffMember[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, created_at')
    .order('created_at', { ascending: true });
  if (error) throw friendlyError(error, 'Could not load staff members.');
  return (data ?? []).map((r) => ({
    id: r.id as string,
    role: r.role as 'admin' | 'technical',
    fullName: (r.full_name as string | null) ?? undefined,
    createdAt: r.created_at as string,
  }));
}

/**
 * Registers an existing Supabase Auth user as staff (or updates their role /
 * name). Creating the auth user itself must be done in the Supabase
 * dashboard — the browser has no admin auth API access, by design.
 * Requires the caller to have role 'admin' (enforced by RLS, 0003).
 */
export async function upsertStaff(id: string, role: 'admin' | 'technical', fullName?: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id, role, full_name: fullName ?? null }, { onConflict: 'id' });
  if (error) throw friendlyError(error, 'Could not save the staff member (are you an admin?).');
}

/** Removes staff access (the auth account itself remains). Admin-only; RLS blocks self-removal. */
export async function removeStaff(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Could not remove the staff member (you cannot remove yourself).');
}
