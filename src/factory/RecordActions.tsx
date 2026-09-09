import { Edit3, Printer, RotateCcw, Trash2, XCircle } from 'lucide-react';

type Props={
  onPrint?:()=>void;
  onEdit?:()=>void;
  onDelete?:()=>void;
  onCorrect?:()=>void;
  onVoid?:()=>void;
  disabledReason?:string;
};

const action='inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35';
export default function RecordActions({onPrint,onEdit,onDelete,onCorrect,onVoid,disabledReason}:Props){
  return <div className="flex items-center justify-end gap-1 print:hidden" title={disabledReason}>
    {onPrint&&<button type="button" onClick={onPrint} className={action} title="Print record"><Printer className="w-3.5 h-3.5"/></button>}
    {onEdit&&<button type="button" onClick={onEdit} className={action} title="Edit draft"><Edit3 className="w-3.5 h-3.5"/></button>}
    {onCorrect&&<button type="button" onClick={onCorrect} className={action} title="Create correction"><RotateCcw className="w-3.5 h-3.5"/></button>}
    {onVoid&&<button type="button" onClick={onVoid} className={`${action} text-amber-700`} title="Void record"><XCircle className="w-3.5 h-3.5"/></button>}
    {onDelete&&<button type="button" onClick={onDelete} className={`${action} text-red-600`} title="Delete draft"><Trash2 className="w-3.5 h-3.5"/></button>}
  </div>
}
