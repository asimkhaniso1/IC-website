import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { AdminGuard } from '../../auth/AdminGuard';
import { AdminChrome } from './components/AdminChrome';
import { STATUS_TONE } from './components/statusTone';
import { listProjects, listRfqs, type AdminProjectSummary } from '../../lib/api/admin';
import type { DesignStatus, RfqRecord } from '../../lib/types';
import { DESIGN_STATUSES, FAMILY_BY_CODE } from '../../lib/constants';
import { revisionLabel } from '../../lib/ids';
import { Badge, Panel } from '../../components/ui';

function DashboardBody() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AdminProjectSummary[] | null>(null);
  const [rfqs, setRfqs] = useState<RfqRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DesignStatus | 'All'>('All');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([listProjects(), listRfqs()])
      .then(([p, r]) => {
        if (!active) return;
        setProjects(p);
        setRfqs(r);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load the dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of projects ?? []) c.set(p.status, (c.get(p.status) ?? 0) + 1);
    return c;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (statusFilter === 'All') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-slate-600 max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Design Projects</h1>
        <p className="text-sm text-slate-500 mt-1">Every customer design submitted through the studio.</p>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('All')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
            statusFilter === 'All'
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          All ({projects?.length ?? 0})
        </button>
        {DESIGN_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
              statusFilter === s
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {s} ({counts.get(s) ?? 0})
          </button>
        ))}
      </div>

      <Panel title={`Designs (${filtered.length})`} className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <Inbox className="w-8 h-8" />
            <p className="text-sm">No designs in this status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2">Design ID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Family</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Rev</th>
                  <th className="px-4 py-2">RFQs</th>
                  <th className="px-4 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/admin/designs/${p.id}`)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{p.designCode}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate">{p.spec?.name || 'Untitled'}</td>
                    <td className="px-4 py-3">
                      <Badge tone="slate">{FAMILY_BY_CODE[p.family]?.label ?? p.family}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.customerName ?? p.customerCompany ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{revisionLabel(p.revisionNo)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.rfqCount}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={`RFQ Inbox (${rfqs?.length ?? 0})`} className="overflow-hidden">
        {!rfqs || rfqs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <Inbox className="w-8 h-8" />
            <p className="text-sm">No requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2">Design</th>
                  <th className="px-4 py-2">Kind</th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/admin/designs/${r.designId}`)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{r.designCode ?? r.designId}</td>
                    <td className="px-4 py-3">
                      <Badge tone={r.kind === 'sample' ? 'amber' : 'brand'}>{r.kind}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.contactName}</td>
                    <td className="px-4 py-3 text-slate-500">{r.company ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.email}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.quantity ? `${r.quantity} ${r.quantityUnit ?? ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminChrome>
        <DashboardBody />
      </AdminChrome>
    </AdminGuard>
  );
}
