import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BarChart3, Boxes, ClipboardList, Factory, FileCheck2, History, Home, LogOut, PackageCheck, PackageOpen, Route, Send, Settings2, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { useSession } from '../auth/useSession';
import { COMPANY } from '../lib/constants';

export default function FactoryShell({ children }: { children: ReactNode }) {
  const { session, signOut } = useSession();
  const nav = [{ to: '/factory', label: 'Home', icon: Home }, { to: '/factory/overview', label: 'Dashboard', icon: BarChart3 }, { to: '/factory/approvals', label: 'Approval inbox', icon: FileCheck2 }, { to: '/factory/quotations', label: 'Quotations', icon: FileCheck2 }, { to: '/factory/samples', label: 'Sample development', icon: PackageCheck }, { to: '/factory/orders', label: 'Orders', icon: ClipboardList }, { to: '/factory/machines', label: 'Machines', icon: Factory }, { to: '/factory/maintenance', label: 'Maintenance', icon: Settings2 }, { to: '/factory/planning', label: 'Production planning', icon: ClipboardList }, { to: '/factory/production', label: 'Production', icon: ClipboardList }, { to: '/factory/material-planning', label: 'Material planning', icon: Boxes }, { to: '/factory/material-issues', label: 'Material issues', icon: PackageOpen }, { to: '/factory/qc', label: 'Quality control', icon: ShieldCheck }, { to: '/factory/qc/analytics', label: 'Quality analytics', icon: BarChart3 }, { to: '/factory/packing', label: 'Packing & finished', icon: PackageCheck }, { to: '/factory/dispatch/schedule', label: 'Dispatch schedule', icon: Truck }, { to: '/factory/dispatch', label: 'Dispatch', icon: Send }, { to: '/factory/traceability', label: 'Traceability', icon: Route }, { to: '/factory/grn', label: 'Goods receiving', icon: Truck }, { to: '/factory/purchase-requests', label: 'Purchase requests', icon: ShoppingCart }, { to: '/factory/purchase-orders', label: 'Purchase orders', icon: ClipboardList }, { to: '/factory/gate-pass', label: 'Gate pass', icon: FileCheck2 }, { to: '/factory/stock', label: 'Stock ledger', icon: PackageOpen }, { to: '/factory/stock/register', label: 'Stock register', icon: ClipboardList }, { to: '/factory/stock/adjustments', label: 'Stock adjustments', icon: Settings2 }, { to: '/factory/stock/transfers', label: 'Stock transfers', icon: Route }, { to: '/factory/stock/take', label: 'Stock take', icon: ClipboardList }, { to: '/factory/master/procurement', label: 'Suppliers & materials', icon: Boxes }, { to: '/factory/master/bom-routings', label: 'BOM & routings', icon: Route }, { to: '/factory/reports', label: 'Reports', icon: BarChart3 }, { to: '/factory/audit', label: 'Audit log', icon: History }, { to: '/factory/users', label: 'Users & roles', icon: ShieldCheck }, { to: '/factory/setup', label: 'Setup', icon: Settings2 }];
  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="bg-slate-950 text-white sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/factory" className="flex items-center gap-3"><img src={COMPANY.logo} alt="" className="h-7"/><div><p className="text-sm font-bold">Factory Live</p><p className="text-[10px] uppercase tracking-[.2em] text-emerald-400">Core transactions</p></div></Link>
        <div className="flex items-center gap-3"><span className="hidden sm:block text-xs text-slate-400">{session?.user.email}</span><button onClick={() => void signOut()} className="p-2 rounded-lg hover:bg-white/10" title="Sign out"><LogOut className="w-4 h-4"/></button></div>
      </div>
    </header>
    <div className="max-w-[1500px] mx-auto sm:grid sm:grid-cols-[220px_1fr] min-h-[calc(100vh-4rem)]">
      <aside className="bg-white border-r border-slate-200 p-3 flex sm:flex-col gap-2 overflow-x-auto">
        {nav.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to==='/factory'} className={({isActive})=>`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${isActive?'bg-brand-50 text-brand-700':'text-slate-600 hover:bg-slate-50'}`}><Icon className="w-4 h-4"/>{label}</NavLink>)}
        <div className="hidden sm:block mt-auto p-3 rounded-xl bg-slate-50 text-xs text-slate-500"><ClipboardList className="w-4 h-4 mb-2 text-slate-400"/>Phase 1 vertical slice</div>
      </aside>
      <main className="p-4 sm:p-8 min-w-0">{children}</main>
    </div>
  </div>;
}
