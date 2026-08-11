/**
 * Supabase-backed StorageAdapter — talks only to the customer-facing RPCs
 * defined in supabase/migrations/0001_init.sql (create_design, save_revision,
 * get_design, get_designs_by_token, submit_rfq) plus the 'artwork' storage
 * bucket. Anonymous customers never query tables directly.
 */
import type {
  DesignRecord,
  DesignSpec,
  DesignStatus,
  Family,
  RfqInput,
  RfqResult,
  StorageAdapter,
  WeavabilityResult,
} from '../types';
import { getSupabase } from '../supabase';
import { ownerToken } from '../ids';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a Supabase-issued uuid; false for LOCAL-* draft ids. */
function isSupabaseId(id: string | undefined): id is string {
  return Boolean(id && UUID_RE.test(id));
}

function friendlyError(err: unknown, fallback: string): Error {
  const raw =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : typeof err === 'string'
        ? err
        : '';
  const message = raw && raw.trim().length > 0 ? raw : fallback;
  return new Error(message);
}

/** Parses the jsonb DesignRecord-shaped payload returned by the RPCs. */
function parseDesignRecord(raw: unknown): DesignRecord {
  const data = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  if (!data || typeof data !== 'object') {
    throw new Error('Received an empty response from the design server.');
  }
  const d = data as Record<string, unknown>;
  if (!d.id || !d.designCode || !d.family || !d.spec) {
    throw new Error('Received an incomplete design record from the server.');
  }
  return {
    id: String(d.id),
    designCode: String(d.designCode),
    family: d.family as Family,
    status: (d.status as DesignStatus) ?? 'Draft',
    revisionNo: Number(d.revisionNo) || 1,
    spec: d.spec as DesignSpec,
    weavability: (d.weavability as WeavabilityResult | null | undefined) ?? undefined,
    createdAt: String(d.createdAt ?? new Date().toISOString()),
    updatedAt: String(d.updatedAt ?? new Date().toISOString()),
  };
}

export const supabaseAdapter: StorageAdapter = {
  mode: 'supabase',

  async saveDesign(
    spec: DesignSpec,
    opts?: { id?: string; weavability?: WeavabilityResult }
  ): Promise<DesignRecord> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured.');
    const token = ownerToken();

    try {
      if (isSupabaseId(opts?.id)) {
        const { data, error } = await supabase.rpc('save_revision', {
          p_project: opts!.id,
          p_token: token,
          p_spec: spec,
          p_weavability: opts?.weavability ?? null,
          p_name: spec.name || null,
        });
        if (error) throw error;
        return parseDesignRecord(data);
      }

      const { data, error } = await supabase.rpc('create_design', {
        p_family: spec.family,
        p_name: spec.name,
        p_spec: spec,
        p_token: token,
        p_weavability: opts?.weavability ?? null,
      });
      if (error) throw error;
      return parseDesignRecord(data);
    } catch (err) {
      throw friendlyError(
        err,
        'Could not save your design to the server. Please check your connection and try again.'
      );
    }
  },

  async getDesign(id: string): Promise<DesignRecord | null> {
    if (!isSupabaseId(id)) return null;
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured.');
    try {
      const { data, error } = await supabase.rpc('get_design', {
        p_project: id,
        p_token: ownerToken(),
      });
      if (error) throw error;
      if (!data) return null;
      return parseDesignRecord(data);
    } catch (err) {
      throw friendlyError(err, 'Could not load this design.');
    }
  },

  async listMyDesigns(): Promise<DesignRecord[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured.');
    try {
      const { data, error } = await supabase.rpc('get_designs_by_token', {
        p_token: ownerToken(),
      });
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      const records: DesignRecord[] = [];
      for (const row of data) {
        try {
          records.push(parseDesignRecord(row));
        } catch {
          // skip malformed rows rather than failing the whole list
        }
      }
      return records;
    } catch (err) {
      throw friendlyError(err, 'Could not load your saved designs.');
    }
  },

  async submitRfq(input: RfqInput): Promise<RfqResult> {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, reason: 'Supabase is not configured.' };
    }
    try {
      const { data, error } = await supabase.rpc('submit_rfq', {
        p_project: input.designId,
        p_token: ownerToken(),
        p_rfq: input,
      });
      if (error) throw error;
      const result = (typeof data === 'string' ? JSON.parse(data) : data) as
        | Record<string, unknown>
        | null;
      if (!result) {
        return { ok: false, reason: 'The server did not confirm your request.' };
      }
      return {
        ok: Boolean(result.ok),
        reference: result.reference ? String(result.reference) : undefined,
        reason: result.reason ? String(result.reason) : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        reason: friendlyError(
          err,
          'Could not submit your request online. Please try again or contact us directly.'
        ).message,
      };
    }
  },

  async uploadArtwork(designId: string, file: File): Promise<{ storagePath?: string }> {
    try {
      const supabase = getSupabase();
      if (!supabase) return {};
      const path = `${ownerToken()}/${designId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('artwork')
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) return {};
      return { storagePath: path };
    } catch {
      // Best-effort only — the artwork data URL inside the spec stays canonical
      // even if the remote copy fails to upload.
      return {};
    }
  },
};
