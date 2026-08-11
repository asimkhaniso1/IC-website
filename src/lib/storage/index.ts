import type { StorageAdapter } from '../types';
import { localAdapter } from './local';

/**
 * Returns the active storage adapter. Foundation version always returns the
 * localStorage adapter; the persistence workstream extends this to switch to
 * the Supabase adapter when isSupabaseConfigured() is true.
 */
export function getStorageAdapter(): StorageAdapter {
  return localAdapter;
}
