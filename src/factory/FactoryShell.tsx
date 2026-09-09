import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRightLeft, BarChart3, Boxes, ChevronDown, ClipboardList, Factory, FileCheck2, History, Home, LogOut, PackageCheck, PackageOpen, Route, Send, Settings2, ShieldCheck, ShoppingCart, Truck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSession } from '../auth/useSession';
import { COMPANY } from '../lib/constants';

type NavGroup = { label: string; icon: LucideIcon; items: readonly (readonly [string, string, LucideIcon])[] };
const groups: NavGroup[] = [
  { label: 'Customers & sales', icon: Users, items: [
    ['/factory/quotations/preparation', 'Construction & costing', ClipboardList], ['/factory/quotations', 'Quotations', FileCheck2], ['/factory/samples', 'Sample development', PackageCheck], ['/factory/orders', 'Customer orders', ClipboardList],
  ]},
  { label: 'Production', icon: Factory, items: [
    ['/factory/planning', 'Production planning', ClipboardList], ['/factory/production', 'Production entry', Factory], ['/factory/machines', 'Machines', Factory], ['/factory/maintenance', 'Maintenance', Settings2], ['/factory/material-planning', 'Material planning', Boxes], ['/factory/material-issues', 'Company material issues', PackageOpen],
  ]},
  { label: 'Quality', icon: ShieldCheck, items: [
    ['/factory/qc', 'Quality control', ShieldCheck], ['/factory/qc/analytics', 'Quality analytics', BarChart3],
  ]},
  { label: 'Inventory & store', icon: Boxes, items: [
    ['/factory/grn', 'Supplier / PO receiving', Truck], ['/factory/stock/customer-custody', 'Customer material custody', ArrowRightLeft], ['/factory/stock/register', 'Stock register & ledger', ClipboardList], ['/factory/stock/adjustments', 'Stock adjustments', Settings2], ['/factory/stock/transfers', 'Stock transfers', Route], ['/factory/stock/take', 'Stock take', ClipboardList], ['/factory/packing', 'Company packing & finished', PackageCheck],
  ]},
  { label: 'Purchasing', icon: ShoppingCart, items: [
    ['/factory/approvals', 'Approval inbox', FileCheck2], ['/factory/purchase-requests', 'Purchase requests', ShoppingCart], ['/factory/purchase-orders', 'Purchase orders', ClipboardList],
  ]},
  { label: 'Dispatch', icon: Truck, items: [
    ['/factory/dispatch/schedule', 'Dispatch schedule', Truck], ['/factory/dispatch', 'Company dispatch', Send], ['/factory/gate-pass', 'Gate pass', FileCheck2], ['/factory/traceability', 'Traceability', Route],
  ]},
  { label: 'Reports & accounts', icon: BarChart3, items: [
    ['/factory/reports', 'Factory reports', BarChart3], ['/factory/quickbooks', 'QuickBooks sync', Send], ['/factory/audit', 'Audit log', History],
  ]},
  { label: 'Master data & admin', icon: Settings2, items: [
    ['/factory/master/procurement', 'Suppliers & materials', Boxes], ['/factory/master/bom-routings', 'BOM & routings', Route], ['/factory/users', 'Users & roles', ShieldCheck], ['/factory/setup', 'Factory master data', Settings2],
  ]},
];

export default function FactoryShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useSession();
  const location = useLocation();
  const activeGroup = groups.find(g => g.items.some(([to]) => location.pathname === to || location.pathname.startsWith(`${to}/`)))?.label;
  const [open, setOpen] = useState<Record<string, boolean>>(() => activeGroup ? { [activeGroup]: true } : {});
  useEffect(() => { if (activeGroup) setOpen(v => ({ ...v, [activeGroup]: true })); }, [activeGroup]);

  return <div className="min-h-screen bg-[#f2f6fb] text-slate-900">
    <div className="factory-print-header hidden print:flex items-center justify-between border-b-2 border-[#0a5592] pb-3 mb-5">
      <div className="flex items-center gap-3"><img src={COMPANY.logo} alt="Interconverters" className="h-12 w-auto object-contain"/><div><p className="text-lg font-bold text-[#073b6f]">INTERCONVERTERS PVT. LTD.</p><p className="text-xs uppercase tracking-[.18em] text-slate-500">Factory Live · Controlled Document</p></div></div>
      <div className="text-right text-[10px] text-slate-500"><p>Generated from Factory Live</p><p>{new Date().toLocaleString()}</p></div>
    </div>
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#073b6f] via-[#0a5592] to-[#073b6f] text-white shadow-md">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        <Link to="/factory" className="flex items-center gap-3"><span className="flex h-10 w-12 items-center justify-center rounded-lg bg-white p-1 shadow-sm"><img src={COMPANY.logo} alt="Interconverters" className="h-8 w-auto object-contain"/></span><div><p className="text-sm font-bold tracking-wide">INTERCONVERTERS <span className="font-normal text-blue-100">Factory Live</span></p><p className="text-[10px] uppercase tracking-[.18em] text-cyan-300">Manufacturing management system</p></div></Link>
        <div className="flex items-center gap-3"><div className="hidden sm:block text-right"><p className="text-xs font-semibold">{session?.user.email}</p><p className="text-[10px] text-blue-200">Factory user</p></div><button onClick={() => void signOut()} className="p-2 rounded-lg hover:bg-white/10" title="Sign out"><LogOut className="w-4 h-4"/></button></div>
      </div>
    </header>
    <div className="sm:grid sm:grid-cols-[260px_1fr] min-h-[calc(100vh-4rem)]">
      <aside className="bg-gradient-to-b from-[#083d70] to-[#062c50] text-white border-r border-blue-950/30 p-3 sm:sticky sm:top-16 sm:h-[calc(100vh-4rem)] overflow-y-auto">
        <NavLink to="/factory" end className={({isActive})=>`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold mb-1 ${isActive?'bg-blue-500 shadow-md':'hover:bg-white/10'}`}><Home className="w-4 h-4 text-cyan-300"/>Home</NavLink>
        <NavLink to="/factory/overview" className={({isActive})=>`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold mb-2 ${isActive?'bg-blue-500 shadow-md':'hover:bg-white/10'}`}><BarChart3 className="w-4 h-4 text-emerald-300"/>Operations dashboard</NavLink>
        <div className="h-px bg-white/10 my-2"/>
        {groups.map(({label,icon:Icon,items}) => <section key={label} className="mb-1">
          <button type="button" aria-expanded={!!open[label]} onClick={()=>setOpen(v=>({...v,[label]:!v[label]}))} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 ${activeGroup===label?'text-white':'text-blue-100'}`}>
            <Icon className="w-4 h-4 text-cyan-300"/><span className="flex-1 text-left">{label}</span><ChevronDown className={`w-4 h-4 transition-transform ${open[label]?'rotate-180':''}`}/>
          </button>
          {open[label]&&<div className="ml-4 pl-3 border-l border-white/15 space-y-1 py-1">{items.map(([to,label,ItemIcon])=><NavLink key={to} to={to} end className={({isActive})=>`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${isActive?'bg-blue-500 text-white font-bold shadow-sm':'text-blue-100 hover:bg-white/10 hover:text-white'}`}><ItemIcon className="w-3.5 h-3.5"/>{label}</NavLink>)}</div>}
        </section>)}
        <div className="mt-6 p-3 border-t border-white/10 text-[10px] text-blue-200"><p className="font-bold text-white">INTERCONVERTERS</p><p className="mt-1">Factory Live · Integrated Control</p></div>
      </aside>
      <main className="p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
    </div>
  </div>;
}
