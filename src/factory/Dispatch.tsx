import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send, Truck } from 'lucide-react';
import FactoryGuard from './FactoryGuard';
import FactoryShell from './FactoryShell';
import RecordActions from './RecordActions';
import { dispatchFinishedGoods, dispatchScheduledGoods, listDispatchData } from './api';

const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm';

function Body() {
  const [data, setData] = useState<any>({ goods: [], passes: [], dispatches: [], schedules: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { setData(await listDispatchData()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load dispatch.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    const selection = String(values.get('goods'));
    const scheduled = selection.startsWith('schedule:');
    const common = { p_gate_pass: values.get('pass') || null, p_vehicle: values.get('vehicle'), p_driver: values.get('driver'), p_dispatcher: values.get('dispatcher') };
    setBusy(true); setError(''); setNotice('');
    try {
      if (scheduled) await dispatchScheduledGoods({ p_schedule: selection.slice(9), ...common });
      else await dispatchFinishedGoods({ p_finished_goods: selection, ...common });
      form.reset();
      setNotice(scheduled ? 'Scheduled delivery dispatched and closed.' : 'Finished goods dispatched and stock issued.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not dispatch.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div><p className="text-xs font-bold text-brand-600 uppercase tracking-[.18em]">Finished goods issue</p><h1 className="text-2xl font-bold mt-1">Dispatch</h1><p className="text-sm text-slate-500 mt-1">Release scheduled or direct finished inventory against an authorized gate pass.</p></div>
    {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
    {notice && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl flex gap-2"><CheckCircle2 className="w-4 h-4" />{notice}</div>}
    <form onSubmit={submit} className="bg-white border rounded-2xl p-5 space-y-4 print:hidden">
      <div className="flex gap-2"><Send className="text-brand-600" /><h2 className="font-bold">New dispatch</h2></div>
      <div className="grid md:grid-cols-2 gap-2">
        <select required name="goods" className={field}><option value="">Scheduled or available goods…</option>{data.schedules.length > 0 && <optgroup label="Scheduled deliveries">{data.schedules.map((row: any) => <option key={row.dispatch_schedule_id} value={`schedule:${row.dispatch_schedule_id}`}>{row.schedule_no} · {row.scheduled_date} · {row.customer?.customer_name} · {row.goods?.product?.description}</option>)}</optgroup>}<optgroup label="Direct dispatch">{data.goods.map((row: any) => <option key={row.finished_goods_id} value={row.finished_goods_id}>{row.product?.product_code} · {row.product?.description} · {row.quantity} {row.uom?.uom_code}</option>)}</optgroup></select>
        <select name="pass" className={field}><option value="">Gate pass (optional)…</option>{data.passes.map((row: any) => <option key={row.gate_pass_id} value={row.gate_pass_id}>{row.serial_no} · {row.company_name ?? row.vehicle_no}</option>)}</select>
        <input required name="vehicle" placeholder="Vehicle number" className={field} /><input required name="driver" placeholder="Driver name" className={field} /><input required name="dispatcher" placeholder="Dispatcher" className={field} />
      </div>
      <div className="text-right"><button disabled={busy || (!data.goods.length && !data.schedules.length)} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm disabled:opacity-40">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch goods'}</button></div>
    </form>
    <section className="bg-white border rounded-2xl overflow-hidden">
      <h2 className="font-bold p-4 border-b flex gap-2"><Truck className="w-5 h-5 text-brand-600" />Dispatch history</h2>
      {!data.dispatches.length ? <p className="p-8 text-center text-slate-400">No dispatches yet.</p> : data.dispatches.map((row: any) => <div key={row.dispatch_id} className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div><b className="font-mono text-xs">{row.dispatch_no}</b>{row.schedule?.schedule_no && <span className="ml-2 text-[10px] px-2 py-1 rounded-full bg-brand-50 text-brand-700">{row.schedule.schedule_no}</span>}<p className="text-sm mt-1">{row.customer?.customer_name} · {row.goods?.product?.description}</p><p className="text-xs text-slate-500">{row.driver_name} · {row.vehicle_no}</p></div>
        <div className="ml-auto text-right"><b>{Number(row.quantity).toLocaleString()} {row.uom?.uom_code}</b><p className="text-xs text-emerald-700">{row.status}</p></div>
        <RecordActions printTitle={`Dispatch ${row.dispatch_no}`} printRecord={{ dispatch_no: row.dispatch_no, date: row.dispatch_date, customer: row.customer?.customer_name, product_code: row.goods?.product?.product_code, product: row.goods?.product?.description, quantity: row.quantity, uom: row.uom?.uom_code, schedule_no: row.schedule?.schedule_no, gate_pass: row.gate_pass?.serial_no, vehicle: row.vehicle_no, driver: row.driver_name, dispatcher: row.dispatcher, status: row.status }} disabledReason="Posted dispatches affect inventory and must be corrected through a controlled reversal." />
      </div>)}
    </section>
  </div>;
}

export default function Dispatch() { return <FactoryGuard><FactoryShell><Body /></FactoryShell></FactoryGuard>; }
