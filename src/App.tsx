import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

const StudioSelect = lazy(() => import('./pages/StudioSelect'));
const DesignerPage = lazy(() => import('./pages/DesignerPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminDesignDetail = lazy(() => import('./pages/admin/AdminDesignDetail'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

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
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
