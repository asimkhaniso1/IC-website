import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { COMPANY } from '../../../lib/constants';
import { useSession } from '../../../auth/useSession';
import { Button } from '../../../components/ui';

/** Shared slate-950 top bar + max-w-7xl content wrapper for all /admin/** pages. */
export function AdminChrome({ children }: { children: ReactNode }) {
  const { session, signOut } = useSession();
  const { pathname } = useLocation();
  const onSettings = pathname.startsWith('/admin/settings');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0" title="Go to interconverters.com homepage">
            <img src={COMPANY.logo} alt="" className="h-7 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{COMPANY.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Technical Dashboard</p>
            </div>
          </Link>
          <div className="flex items-center gap-4 shrink-0">
            <Link
              to="/admin"
              className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                !onSettings ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/settings"
              className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                onSettings ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </Link>
            {session?.user.email && (
              <span className="text-xs text-slate-300 font-mono hidden sm:inline">{session.user.email}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => void signOut()}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export default AdminChrome;
