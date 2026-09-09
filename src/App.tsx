import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

const StudioSelect = lazy(() => import('./pages/StudioSelect'));
const DesignerPage = lazy(() => import('./pages/DesignerPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminDesignDetail = lazy(() => import('./pages/admin/AdminDesignDetail'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminDesignEdit = lazy(() => import('./pages/admin/AdminDesignEdit'));
const FactoryDashboard = lazy(() => import('./factory/FactoryDashboard'));
const StockLedger = lazy(() => import('./factory/StockLedger'));
const FactorySetup = lazy(() => import('./factory/FactorySetup'));
const GoodsReceiving = lazy(() => import('./factory/GoodsReceiving'));
const FactoryHome = lazy(() => import('./factory/FactoryHome'));
const PurchaseRequests = lazy(() => import('./factory/PurchaseRequests'));
const FactoryReports = lazy(() => import('./factory/FactoryReports'));
const GatePass = lazy(() => import('./factory/GatePass'));
const StockRegister = lazy(() => import('./factory/StockRegister'));
const AuditLog = lazy(() => import('./factory/AuditLog'));
const QualityControl = lazy(() => import('./factory/QualityControl'));
const Packing = lazy(() => import('./factory/Packing'));
const Dispatch = lazy(() => import('./factory/Dispatch'));
const Traceability = lazy(() => import('./factory/Traceability'));
const Machines = lazy(() => import('./factory/Machines'));
const CustomerOrders = lazy(() => import('./factory/CustomerOrders'));
const PurchaseOrders = lazy(() => import('./factory/PurchaseOrders'));
const OperationsOverview = lazy(() => import('./factory/OperationsOverview'));
const StockAdjustments = lazy(() => import('./factory/StockAdjustments'));
const StockTransfers = lazy(() => import('./factory/StockTransfers'));
const StockTake = lazy(() => import('./factory/StockTake'));
const QualityAnalytics = lazy(() => import('./factory/QualityAnalytics'));
const Maintenance = lazy(() => import('./factory/Maintenance'));
const BomRoutings = lazy(() => import('./factory/BomRoutings'));
const MaterialPlanning = lazy(() => import('./factory/MaterialPlanning'));
const ProductionPlanning = lazy(() => import('./factory/ProductionPlanning'));
const MaterialIssues = lazy(() => import('./factory/MaterialIssues'));
const DispatchSchedule = lazy(() => import('./factory/DispatchSchedule'));
const FactoryUsers = lazy(() => import('./factory/FactoryUsers'));
const ProcurementMaster = lazy(() => import('./factory/ProcurementMaster'));
const ApprovalInbox = lazy(() => import('./factory/ApprovalInbox'));
const Quotations = lazy(() => import('./factory/QuotationPricing'));
const QuotationPreparation = lazy(() => import('./factory/QuotationPreparation'));
const SampleDevelopment = lazy(() => import('./factory/SampleDevelopment'));
const QuickBooksSync = lazy(() => import('./factory/QuickBooksSync'));
const QuickBooksExport = lazy(() => import('./factory/QuickBooksExport'));
const CustomerCustody = lazy(() => import('./factory/CustomerCustody'));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading Design Studio…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<StudioSelect />} />
          <Route path="/studio/:family" element={<DesignerPage />} />
          <Route path="/studio/:family/:id" element={<DesignerPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/designs/:id" element={<AdminDesignDetail />} />
          <Route path="/admin/designs/:id/edit" element={<AdminDesignEdit />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/factory" element={<FactoryHome />} />
          <Route path="/factory/production" element={<FactoryDashboard />} />
          <Route path="/factory/stock" element={<StockLedger />} />
          <Route path="/factory/setup" element={<FactorySetup />} />
          <Route path="/factory/grn" element={<GoodsReceiving />} />
          <Route path="/factory/purchase-requests" element={<PurchaseRequests />} />
          <Route path="/factory/reports" element={<FactoryReports />} />
          <Route path="/factory/gate-pass" element={<GatePass />} />
          <Route path="/factory/stock/register" element={<StockRegister />} />
          <Route path="/factory/audit" element={<AuditLog />} />
          <Route path="/factory/qc" element={<QualityControl />} />
          <Route path="/factory/packing" element={<Packing />} />
          <Route path="/factory/dispatch" element={<Dispatch />} />
          <Route path="/factory/traceability" element={<Traceability />} />
          <Route path="/factory/machines" element={<Machines />} />
          <Route path="/factory/orders" element={<CustomerOrders />} />
          <Route path="/factory/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/factory/overview" element={<OperationsOverview />} />
          <Route path="/factory/stock/adjustments" element={<StockAdjustments />} />
          <Route path="/factory/stock/transfers" element={<StockTransfers />} />
          <Route path="/factory/stock/customer-custody" element={<CustomerCustody />} />
          <Route path="/factory/stock/take" element={<StockTake />} />
          <Route path="/factory/qc/analytics" element={<QualityAnalytics />} />
          <Route path="/factory/maintenance" element={<Maintenance />} />
          <Route path="/factory/master/bom-routings" element={<BomRoutings />} />
          <Route path="/factory/material-planning" element={<MaterialPlanning />} />
          <Route path="/factory/planning" element={<ProductionPlanning />} />
          <Route path="/factory/material-issues" element={<MaterialIssues />} />
          <Route path="/factory/dispatch/schedule" element={<DispatchSchedule />} />
          <Route path="/factory/users" element={<FactoryUsers />} />
          <Route path="/factory/master/procurement" element={<ProcurementMaster />} />
          <Route path="/factory/approvals" element={<ApprovalInbox />} />
          <Route path="/factory/quotations" element={<Quotations />} />
          <Route path="/factory/quotations/preparation" element={<QuotationPreparation />} />
          <Route path="/factory/samples" element={<SampleDevelopment />} />
          <Route path="/factory/quickbooks" element={<QuickBooksSync />} />
          <Route path="/factory/quickbooks/export" element={<QuickBooksExport />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
