import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export interface UseSessionResult {
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;
}

/** Thin wrapper around Supabase Auth for the staff admin dashboard. */
export function useSession(): UseSessionResult {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase()!;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!configured) return { error: 'Supabase is not configured.' };
      const supabase = getSupabase()!;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    [configured]
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    const supabase = getSupabase()!;
    await supabase.auth.signOut();
  }, [configured]);

  return { session, loading, isConfigured: configured, signIn, signOut };
}
