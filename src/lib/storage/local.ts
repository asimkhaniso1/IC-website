import type {
  DesignRecord,
  DesignSpec,
  RfqInput,
  RfqResult,
  StorageAdapter,
  WeavabilityResult,
} from '../types';
import { localDraftCode } from '../ids';

const DESIGNS_KEY = 'ic_studio_designs_v1';
const RFQS_KEY = 'ic_studio_rfqs_v1';

function readAll(): Record<string, DesignRecord> {
  try {
    return JSON.parse(localStorage.getItem(DESIGNS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, DesignRecord>): void {
  localStorage.setItem(DESIGNS_KEY, JSON.stringify(records));
}

/**
 * Full offline implementation — the studio works with no Supabase keys.
 * Designs live in localStorage under a per-browser store; RFQ submission is
 * blocked with a clear reason (there is no server to receive it).
 */
export const localAdapter: StorageAdapter = {
  mode: 'local',

  async saveDesign(
    spec: DesignSpec,
    opts?: { id?: string; weavability?: WeavabilityResult }
  ): Promise<DesignRecord> {
    const all = readAll();
    const now = new Date().toISOString();

    if (opts?.id && all[opts.id]) {
      const existing = all[opts.id];
      const next: DesignRecord = {
        ...existing,
        spec,
        weavability: opts.weavability ?? existing.weavability,
        revisionNo: existing.revisionNo + 1,
        updatedAt: now,
      };
      all[next.id] = next;
      writeAll(all);
      return next;
    }

    const record: DesignRecord = {
      id: crypto.randomUUID(),
      designCode: localDraftCode(spec.family),
      family: spec.family,
      status: 'Draft',
      revisionNo: 1,
      spec,
      weavability: opts?.weavability,
      createdAt: now,
      updatedAt: now,
    };
    all[record.id] = record;
    try {
      writeAll(all);
    } catch {
      // localStorage quota (large artwork data URLs) — surface a friendly error
      throw new Error(
        'Local storage is full. Remove old drafts or use a smaller artwork file (max 2 MB).'
      );
    }
    return record;
  },

  async getDesign(id: string): Promise<DesignRecord | null> {
    return readAll()[id] ?? null;
  },

  async listMyDesigns(): Promise<DesignRecord[]> {
    return Object.values(readAll()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  },

  async submitRfq(input: RfqInput): Promise<RfqResult> {
    // Keep a local record so nothing is lost, but be explicit that it has NOT
    // reached Interconverters.
    try {
      const list = JSON.parse(localStorage.getItem(RFQS_KEY) ?? '[]');
      list.push({ ...input, savedAt: new Date().toISOString() });
      localStorage.setItem(RFQS_KEY, JSON.stringify(list));
    } catch {
      /* non-fatal */
    }
    return {
      ok: false,
      reason:
        'Online submission is not available yet (Supabase is not configured). Your design and request are saved in this browser — please email sales@interconverters.com with your design PDF, or try again once the studio is connected.',
    };
  },

  async uploadArtwork(): Promise<{ storagePath?: string }> {
    // No remote storage in local mode; the artwork data URL inside the spec is canonical.
    return {};
  },
};
