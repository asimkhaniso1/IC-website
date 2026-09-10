import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Factory, ShieldAlert } from 'lucide-react';
import { useSession } from '../auth/useSession';
import { CenteredNotice, ConfigNotice, LoadingScreen } from '../auth/AdminGuard';
import { getSupabase } from '../lib/supabase';

export default function FactoryGuard({ children }: { children: ReactNode }) {
  const { session, loading, isConfigured } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!session || !isConfigured) return;
    let active = true;
    getSupabase()!.rpc('has_factory_role', { uid: session.user.id, allowed: null }).then(({ data }) => {
      if (active) setAllowed(Boolean(data));
    });
    return () => { active = false; };
  }, [session, isConfigured]);
  if (loading || (session && allowed === null)) return <LoadingScreen />;
  if (!isConfigured) return <ConfigNotice />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: '/factory' }} />;
  if (!allowed) return <CenteredNotice icon={<ShieldAlert className="w-10 h-10 text-red-500" />} title="Factory access required" message="Your account has no Factory Live role. Ask an administrator to assign one." />;
  return <>{children}</>;
}
