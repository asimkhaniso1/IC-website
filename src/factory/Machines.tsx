import { useEffect, useMemo, useState } from 'react';
import { Activity, Factory, Loader2, Search } from 'lucide-react';
import FactoryGuard from './FactoryGuard';
import FactoryShell from './FactoryShell';
import { listMachineOverview } from './api';

type Machine = {
  machine_id: string;
  legacy_machine_no: number | null;
  machine_name: string;
  active_status: boolean;
  group: { group_name: string } | null;
  batches: Array<{
    batch_code: string;
    status: string;
    actual_quantity: number | null;
    order: { production_order_no: string; product: { description: string } | null } | null;
    entries: Array<{ total_meter: number | null }>;
  }>;
};

function Body() {
  const [rows, setRows] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');

  useEffect(() => {
    listMachineOverview()
      .then(data => setRows(data as unknown as Machine[]))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load machines.'))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => [...new Set(rows.map(row => row.group?.group_name).filter((name): name is string => Boolean(name)))], [rows]);
  const view = rows.filter(row =>
    (!group || row.group?.group_name === group) &&
    (!query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
  );
  const running = rows.filter(row => row.batches?.some(batch => batch.status === 'RUNNING')).length;

  return <div className="space-y-5">
    <div><p className="text-xs font-bold text-brand-600 uppercase tracking-[.18em]">Factory live</p><h1 className="text-2xl font-bold mt-1">Machine Overview</h1><p className="text-sm text-slate-500 mt-1">Current state, assignment, order and output for every verified machine.</p></div>
    <div className="grid grid-cols-3 gap-3">{[['Machines', rows.length], ['Running', running], ['Available', rows.length - running]].map(item => <div key={String(item[0])} className="bg-white border rounded-2xl p-4"><p className="text-xs font-bold text-slate-500">{item[0]}</p><p className="text-2xl font-bold mt-2">{item[1]}</p></div>)}</div>
    <section className="flex flex-col sm:flex-row gap-2 bg-white border rounded-2xl p-4"><label className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search machines, batches or orders…" className="w-full border rounded-xl py-2.5 pl-10 pr-3"/></label><select value={group} onChange={e => setGroup(e.target.value)} className="border rounded-xl px-3 py-2.5"><option value="">All groups</option>{groups.map(name => <option key={name}>{name}</option>)}</select></section>
    {loading ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin"/></div> : error ? <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{view.map(machine => {
      const batch = machine.batches?.find(item => ['RUNNING', 'SETUP', 'ASSIGNED'].includes(item.status));
      const state = batch?.status ?? (machine.active_status ? 'IDLE' : 'OFFLINE');
      const meters = batch?.entries?.reduce((sum, entry) => sum + Number(entry.total_meter || 0), 0) ?? 0;
      return <article key={machine.machine_id} className="bg-white border rounded-2xl overflow-hidden"><header className="p-4 border-b flex justify-between gap-3"><div className="flex gap-3"><span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Factory className="w-5 h-5 text-brand-600"/></span><div><h2 className="font-bold">{machine.machine_name}</h2><p className="text-xs text-slate-500">MACH {machine.legacy_machine_no ?? '—'} · {machine.group?.group_name ?? 'Ungrouped'}</p></div></div><span className={`h-fit px-2 py-1 rounded-full text-[10px] font-bold ${state === 'RUNNING' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{state}</span></header><div className="p-4">{batch ? <div className="space-y-3"><p className="font-mono text-xs font-bold">{batch.batch_code}</p><div><b>{batch.order?.product?.description ?? 'Product unavailable'}</b><p className="text-xs text-slate-500">{batch.order?.production_order_no}</p></div><div className="bg-slate-50 rounded-xl p-3 flex justify-between"><span className="text-xs flex gap-1"><Activity className="w-4 h-4 text-emerald-600"/>Output</span><b>{meters.toLocaleString()} m</b></div></div> : <p className="py-8 text-center text-sm text-slate-400">No active assignment</p>}</div></article>;
    })}</div>}
  </div>;
}

export default function Machines() {
  return <FactoryGuard><FactoryShell><Body/></FactoryShell></FactoryGuard>;
}
