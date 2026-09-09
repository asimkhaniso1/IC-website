import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, PackageCheck } from 'lucide-react';
import FactoryGuard from './FactoryGuard';
import FactoryShell from './FactoryShell';
import RecordActions from './RecordActions';
import { listPackingData, packFinishedGoods } from './api';

const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm';

function Body() {
  const [data, setData] = useState<any>({ batches: [], records: [], finished: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { setData(await listPackingData()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load packing.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const total = useMemo(() => data.finished.reduce((sum: number, row: any) => sum + Number(row.quantity), 0), [data]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError('');
    try {
      await packFinishedGoods({ p_batch: values.get('batch'), p_quantity: Number(values.get('quantity')), p_rolls: values.get('rolls') ? Number(values.get('rolls')) : null, p_cartons: values.get('cartons') ? Number(values.get('cartons')) : null, p_roll_length: values.get('roll_length') ? Number(values.get('roll_length')) : null, p_packed_by: values.get('packed_by'), p_remarks: values.get('remarks') || null });
      form.reset(); setNotice('Packing completed and finished goods posted.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not complete packing.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div><p className="text-xs font-bold text-brand-600 uppercase tracking-[.18em]">Quality released output</p><h1 className="text-2xl font-bold mt-1">Packing & Finished Goods</h1><p className="text-sm text-slate-500 mt-1">Convert QC-approved WIP into available finished stock.</p></div>
    <div className="grid grid-cols-3 gap-3">{[['Ready to pack', data.batches.length], ['Packing records', data.records.length], ['Finished meters', total.toLocaleString()]].map(item => <div className="bg-white border rounded-2xl p-4" key={String(item[0])}><p className="text-xs font-bold text-slate-500">{item[0]}</p><p className="text-2xl font-bold mt-2">{item[1]}</p></div>)}</div>
    {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
    {notice && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl flex gap-2"><CheckCircle2 className="w-4 h-4" />{notice}</div>}
    <form onSubmit={submit} className="bg-white border rounded-2xl p-5 space-y-4 print:hidden">
      <div className="flex gap-2"><PackageCheck className="text-brand-600" /><h2 className="font-bold">New packing record</h2></div>
      <div className="grid md:grid-cols-3 gap-2"><select required name="batch" className={field}><option value="">QC-approved batch…</option>{data.batches.map((row: any) => <option key={row.production_batch_id} value={row.production_batch_id}>{row.batch_code} · {row.order?.product?.description} · {row.actual_quantity} m</option>)}</select><input required name="quantity" type="number" min=".01" step=".01" placeholder="Packed quantity (meters)" className={field} /><input name="roll_length" type="number" min=".01" step=".01" placeholder="Roll length" className={field} /><input name="rolls" type="number" min="0" placeholder="Roll count" className={field} /><input name="cartons" type="number" min="0" placeholder="Carton count" className={field} /><input required name="packed_by" placeholder="Packed by" className={field} /><input name="remarks" placeholder="Remarks" className={`${field} md:col-span-3`} /></div>
      <div className="text-right"><button disabled={busy || !data.batches.length} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40">{busy ? <Loader2 className="animate-spin w-4 h-4" /> : 'Complete packing'}</button></div>
    </form>
    <section className="bg-white border rounded-2xl overflow-hidden">
      <h2 className="font-bold p-4 border-b">Packing register</h2>
      {!data.records.length ? <p className="p-8 text-center text-slate-400">No packing records yet.</p> : data.records.map((row: any) => <div key={row.packing_record_id} className="p-4 border-b flex flex-wrap items-center gap-3"><div><b className="font-mono text-xs">{row.packing_record_no}</b><p className="text-sm mt-1">Batch {row.batch?.batch_code ?? '—'} · Packed by {row.packed_by ?? '—'}</p></div><div className="ml-auto text-right"><b>{Number(row.quantity).toLocaleString()} MTR</b><p className="text-xs text-slate-500">{row.packed_date} · {row.roll_count ?? 0} rolls · {row.carton_count ?? 0} cartons</p></div><RecordActions printTitle={`Packing Record ${row.packing_record_no}`} printRecord={{ packing_record: row.packing_record_no, packed_date: row.packed_date, batch: row.batch?.batch_code, quantity_meters: row.quantity, rolls: row.roll_count, cartons: row.carton_count, packed_by: row.packed_by }} disabledReason="Posted packing records create finished stock and require a controlled correction." /></div>)}
    </section>
    <section className="bg-white border rounded-2xl overflow-hidden">
      <h2 className="font-bold p-4 border-b">Finished goods</h2>
      {!data.finished.length ? <p className="p-8 text-center text-slate-400">No finished goods yet.</p> : data.finished.map((row: any) => <div key={row.finished_goods_id} className="p-4 border-b flex flex-wrap items-center gap-3"><div><b>{row.product?.product_code} · {row.product?.description}</b><p className="text-xs text-slate-500">{row.location?.location_name}</p></div><div className="ml-auto text-right"><b>{Number(row.quantity).toLocaleString()} {row.uom?.uom_code}</b><p className="text-xs text-emerald-700">{row.status}</p></div><RecordActions printTitle={`Finished Goods ${row.product?.product_code ?? ''}`} printRecord={{ product_code: row.product?.product_code, product: row.product?.description, location: row.location?.location_name, quantity: row.quantity, uom: row.uom?.uom_code, status: row.status }} disabledReason="Finished-goods balances are controlled by packing, dispatch, and stock adjustments." /></div>)}
    </section>
  </div>;
}

export default function Packing() { return <FactoryGuard><FactoryShell><Body /></FactoryShell></FactoryGuard>; }
