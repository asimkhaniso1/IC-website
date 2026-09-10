import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, Search } from 'lucide-react';
import FactoryGuard from './FactoryGuard';
import FactoryShell from './FactoryShell';
import RecordActions from './RecordActions';
import { listAuditEvents } from './api';

const field = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';

function Body() {
  const [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [action, setAction] = useState(''), [entity, setEntity] = useState('');
  useEffect(() => { listAuditEvents().then(setRows).catch(e => setError(e instanceof Error ? e.message : 'Could not load audit events.')).finally(() => setLoading(false)); }, []);
  const actions = useMemo(() => [...new Set(rows.map(row => row.action))].sort(), [rows]);
  const entities = useMemo(() => [...new Set(rows.map(row => row.entity_type))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter(row => (!action || row.action === action) && (!entity || row.entity_type === entity) && (!query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))), [rows, query, action, entity]);
  return <div className="space-y-5">
    <div><p className="text-xs font-bold text-brand-600 uppercase tracking-[.18em]">Controlled record</p><h1 className="text-2xl font-bold mt-1">Audit Log</h1><p className="text-sm text-slate-500 mt-1">Immutable workflow evidence for Factory Live transactions.</p></div>
    <section className="bg-white border rounded-2xl p-4 grid md:grid-cols-3 gap-3 print:hidden"><label className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search events…" className={`${field} pl-9 w-full`} /></label><select value={action} onChange={e => setAction(e.target.value)} className={field}><option value="">All actions</option>{actions.map(value => <option key={value}>{value}</option>)}</select><select value={entity} onChange={e => setEntity(e.target.value)} className={field}><option value="">All entities</option>{entities.map(value => <option key={value}>{value}</option>)}</select></section>
    {loading ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-brand-600" /></div> : error ? <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div> : <section className="bg-white border rounded-2xl overflow-hidden"><div className="p-4 border-b flex justify-between"><h2 className="font-bold flex gap-2"><History className="w-5 h-5 text-brand-600" />Events</h2><span className="text-xs font-bold text-slate-400">{filtered.length} shown</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase"><tr>{['Timestamp', 'Action', 'Entity', 'User / Role', 'Change', 'Source', 'Actions'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.audit_log_id} className="border-t align-top"><td className="p-3 whitespace-nowrap text-xs">{new Date(row.event_timestamp).toLocaleString()}</td><td className="p-3 font-bold">{row.action}</td><td className="p-3"><span className="font-mono text-xs">{row.entity_type}</span><br /><span className="font-mono text-[10px] text-slate-400">{row.entity_id}</span></td><td className="p-3 text-xs">{row.user_role ?? '—'}<br /><span className="font-mono text-[10px] text-slate-400">{row.user_id ?? 'system'}</span></td><td className="p-3 max-w-sm"><pre className="text-[10px] whitespace-pre-wrap break-words bg-slate-50 rounded-lg p-2">{JSON.stringify(row.new_value ?? row.old_value ?? {}, null, 2)}</pre>{row.reason && <p className="text-xs mt-1">{row.reason}</p>}</td><td className="p-3 text-xs">{row.source}</td><td className="p-3"><RecordActions printTitle={`Audit Event ${row.action}`} printRecord={{ timestamp: new Date(row.event_timestamp).toLocaleString(), action: row.action, entity_type: row.entity_type, entity_id: row.entity_id, user_role: row.user_role, user_id: row.user_id ?? 'system', previous_value: row.old_value, new_value: row.new_value, reason: row.reason, source: row.source }} disabledReason="Audit events are immutable and cannot be edited or deleted." /></td></tr>)}</tbody></table>{!filtered.length && <p className="p-12 text-center text-slate-400">No matching audit events.</p>}</div></section>}
  </div>;
}

export default function AuditLog() { return <FactoryGuard><FactoryShell><Body /></FactoryShell></FactoryGuard>; }
