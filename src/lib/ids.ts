import type { Family } from './types';

const OWNER_TOKEN_KEY = 'ic_owner_token';
const LOCAL_COUNTER_KEY = 'ic_local_design_counter';

/**
 * Anonymous ownership token for this browser. Sent to Supabase RPCs so a
 * customer can retrieve their own drafts without an account.
 */
export function ownerToken(): string {
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Draft code for designs saved only in this browser (Supabase not configured).
 * Clearly distinct from registered codes like "J-DES-000001".
 */
export function localDraftCode(family: Family): string {
  const n = (parseInt(localStorage.getItem(LOCAL_COUNTER_KEY) ?? '0', 10) || 0) + 1;
  localStorage.setItem(LOCAL_COUNTER_KEY, String(n));
  return `LOCAL-${family}-${String(n).padStart(4, '0')}`;
}

/** "-R01" style revision label. */
export function revisionLabel(revisionNo: number): string {
  return `R${String(revisionNo).padStart(2, '0')}`;
}
