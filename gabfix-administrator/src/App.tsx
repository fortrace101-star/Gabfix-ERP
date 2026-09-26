import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from './app/store';
import { useRealtimeRefresh } from './app/realtime';
import { Sidebar } from './app/layout/Sidebar';
import { Topbar } from './app/layout/Topbar';
import { Dashboard } from './features/dashboard';
import { JobsView } from './features/jobs';
import { CustomersView } from './features/customers';
import { FinanceView } from './features/finance';
import { LaundryView } from './features/laundry';
import { EquipmentView, InventoryView } from './features/assets';
import { ReportsView } from './features/reports';
import { SettingsView } from './features/settings';
import { ModalShell } from './features/modals';
import { Button } from './components/ui';
import type { View } from './types';

/**
 * Workspace shell (Phase 0.10 client split): routing, providers and layout.
 * Screens live in src/features, shared UI in src/components, helpers in
 * src/lib, and the data/UI state in src/app/store.tsx. The URL mirrors the
 * active view so deep links such as /jobs or /reports open the right screen.
 */

const VALID_VIEWS: View[] = ['dashboard', 'jobs', 'customers', 'finance', 'laundry', 'equipment', 'inventory', 'reports', 'settings'];

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function WorkspaceShell() {
  const { view: routeView } = useParams();
  const { view, setView, loading, loadError, refresh, toast } = useWorkspace();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  useRealtimeRefresh();

  // URL → view: a deep link like /jobs selects the view; unknown paths fall
  // back to the dashboard.
  useEffect(() => {
    if (routeView && VALID_VIEWS.includes(routeView as View)) {
      if (routeView !== view) setView(routeView as View);
      return;
    }
    navigate('/dashboard', { replace: true });
  }, [routeView, view, setView, navigate]);

  // view → URL: sidebar and in-page navigation keep the address bar in sync.
  useEffect(() => {
    if (view !== routeView) navigate(`/${view}`);
  }, [view, routeView, navigate]);

  const renderView = () => {
    if (loading) return <div className="empty-state"><strong>Loading your workspace…</strong><span>Fetching records from the database</span></div>;
    if (loadError) return <div className="empty-state"><strong>Cannot reach the database</strong><span>{loadError}</span><Button onClick={() => void refresh()}>Retry</Button></div>;
    if (view === 'dashboard') return <Dashboard />;
    if (view === 'jobs') return <JobsView />;
    if (view === 'customers') return <CustomersView />;
    if (view === 'finance') return <FinanceView />;
    if (view === 'laundry') return <LaundryView />;
    if (view === 'equipment') return <EquipmentView />;
    if (view === 'inventory') return <InventoryView />;
    if (view === 'reports') return <ReportsView />;
    return <SettingsView />;
  };

  return <div className="app-shell">
    <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className="main-content">
      <Topbar setMobileOpen={setMobileOpen} />
      <div className="page-content">{renderView()}</div>
    </main>
    <ModalShell />
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<WorkspaceShell />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
