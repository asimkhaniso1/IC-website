import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useSession } from './useSession';
import { getSupabase } from '../lib/supabase';
import { Button } from '../components/ui';

export function CenteredNotice({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4">
        {icon}
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        {action}
      </div>
    </div>
  );
}

/** Shared "Supabase not configured" notice used by AdminGuard and AdminLogin. */
export function ConfigNotice() {
  return (
    <CenteredNotice
      icon={<AlertTriangle className="w-10 h-10 text-amber-500" />}
      title="Admin dashboard requires Supabase configuration"
      message={
        <>
          Set <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>, then
          apply the schema. See <span className="font-mono text-xs">supabase/README.md</span> for setup steps.
        </>
      }
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
    </div>
  );
}

type ProfileCheck = 'checking' | 'staff' | 'not-staff' | 'error';

/**
 * Gate for /admin/** routes. Order of checks:
 *  1. session loading         -> spinner
 *  2. Supabase not configured -> friendly config notice
 *  3. no session              -> redirect to /admin/login
 *  4. session but no profiles row -> "no staff profile" notice
 *  5. otherwise render children
 *
 * Role enforcement ultimately lives in RLS (is_staff()); the profiles lookup
 * here is a UX convenience so a logged-in non-staff account sees a clear
 * message instead of empty tables everywhere.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { session, loading, isConfigured, signOut } = useSession();
  const [profileCheck, setProfileCheck] = useState<ProfileCheck>('checking');

  useEffect(() => {
    if (!isConfigured || loading || !session) return;
    let active = true;
    setProfileCheck('checking');
    const supabase = getSupabase()!;
    supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setProfileCheck('error');
        } else {
          setProfileCheck(data ? 'staff' : 'not-staff');
        }
      });
    return () => {
      active = false;
    };
  }, [isConfigured, loading, session]);

  if (loading) return <LoadingScreen />;

  if (!isConfigured) return <ConfigNotice />;

  if (!session) return <Navigate to="/admin/login" replace />;

  if (profileCheck === 'checking') return <LoadingScreen />;

  if (profileCheck === 'not-staff' || profileCheck === 'error') {
    return (
      <CenteredNotice
        icon={<ShieldAlert className="w-10 h-10 text-red-500" />}
        title="Your account has no staff profile"
        message={
          profileCheck === 'error'
            ? 'Could not verify staff access. Please try again or contact an administrator.'
            : `Signed in as ${session.user.email}, but this account is not registered as staff. Ask an administrator to add a row in the profiles table for your user id.`
        }
        action={
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}

export default AdminGuard;
