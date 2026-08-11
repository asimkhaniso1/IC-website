import type { StorageAdapter } from '../types';
import { isSupabaseConfigured } from '../supabase';
import { localAdapter } from './local';
import { supabaseAdapter } from './supabaseAdapter';

/**
 * Returns the active storage adapter: the Supabase-backed adapter when
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured, otherwise the
 * fully offline localStorage adapter.
 */
export function getStorageAdapter(): StorageAdapter {
  return isSupabaseConfigured() ? supabaseAdapter : localAdapter;
}
