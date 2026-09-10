import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Server, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Health = { configured: boolean; username: string; missing?: string[] };

export default function QuickBooksHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetch('/api/qbwc-health')
      .then(async response => {
        const result = await response.json() as Health;
        setHealth(result);
      })
      .catch(() => setUnavailable(true));
  }, []);

  const ready = health?.configured === true;
  return <section className={`mb-5 rounded-2xl border p-4 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {!health && !unavailable ? <Loader2 className="h-5 w-5 animate-spin text-slate-500"/> : ready ? <CheckCircle2 className="h-5 w-5 text-emerald-600"/> : <XCircle className="h-5 w-5 text-amber-600"/>}
        <div>
          <p className="text-sm font-bold">Web Connector {ready ? 'is configured' : 'needs Vercel configuration'}</p>
          <p className="text-xs text-slate-600">{ready ? `Ready for QuickBooks username ${health?.username}.` : health?.missing?.length ? `Missing in Vercel: ${health.missing.join(', ')}.` : 'Set the server credentials before importing the QWC file.'}</p>
        </div>
      </div>
      <Link to="/factory/quickbooks/export" className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"><Server className="h-4 w-4"/>CSV fallback</Link>
    </div>
  </section>;
}
