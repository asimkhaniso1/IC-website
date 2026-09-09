import { Edit3, Printer, RotateCcw, Trash2, XCircle } from 'lucide-react';

type Props={
  onPrint?:()=>void;
  printRecord?:Record<string,unknown>;
  printTitle?:string;
  onEdit?:()=>void;
  onDelete?:()=>void;
  onCorrect?:()=>void;
  onVoid?:()=>void;
  disabledReason?:string;
};

const escape=(value:unknown)=>String(value??'—').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char));
export function printFactoryRecord(title:string,record:Record<string,unknown>){
  const popup=window.open('','_blank','width=960,height=720');if(!popup)return;
  const rows=Object.entries(record).filter(([,value])=>value!==undefined).map(([key,value])=>`<tr><th>${escape(key.replaceAll('_',' '))}</th><td>${escape(typeof value==='object'?JSON.stringify(value):value)}</td></tr>`).join('');
  const logo=new URL('/images/LOGO1.png',window.location.origin).href;
  popup.document.write(`<!doctype html><html><head><title>${escape(title)}</title><style>@page{size:A4;margin:12mm}body{font:12px Arial;color:#0f172a}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0a5592;padding-bottom:12px;margin-bottom:20px}img{max-height:52px;max-width:180px}h1{font-size:20px;color:#073b6f;margin:0}p{margin:4px 0;color:#64748b}table{width:100%;border-collapse:collapse}th,td{padding:9px;border:1px solid #cbd5e1;text-align:left;vertical-align:top}th{width:28%;text-transform:capitalize;background:#f1f5f9}@media print{button{display:none}}</style></head><body><header><div><img src="${logo}"><h1>${escape(title)}</h1><p>INTERCONVERTERS PVT. LTD. · Factory Live</p></div><p>${escape(new Date().toLocaleString())}</p></header><table>${rows}</table><script>window.onload=()=>window.print()<\/script></body></html>`);popup.document.close();
}

const action='inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35';
export default function RecordActions({onPrint,printRecord,printTitle='Factory record',onEdit,onDelete,onCorrect,onVoid,disabledReason}:Props){
  const print=onPrint??(printRecord?()=>printFactoryRecord(printTitle,printRecord):undefined);
  return <div className="flex items-center justify-end gap-1 print:hidden" title={disabledReason}>
    {print&&<button type="button" onClick={print} className={action} title="Print record"><Printer className="w-3.5 h-3.5"/></button>}
    {onEdit&&<button type="button" onClick={onEdit} className={action} title="Edit draft"><Edit3 className="w-3.5 h-3.5"/></button>}
    {onCorrect&&<button type="button" onClick={onCorrect} className={action} title="Create correction"><RotateCcw className="w-3.5 h-3.5"/></button>}
    {onVoid&&<button type="button" onClick={onVoid} className={`${action} text-amber-700`} title="Void record"><XCircle className="w-3.5 h-3.5"/></button>}
    {onDelete&&<button type="button" onClick={onDelete} className={`${action} text-red-600`} title="Delete draft"><Trash2 className="w-3.5 h-3.5"/></button>}
  </div>
}
