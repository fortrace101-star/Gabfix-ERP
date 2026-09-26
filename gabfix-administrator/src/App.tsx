import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Download, Droplets, FileText, Filter, Gauge, LayoutDashboard, Menu, Package, Plus, Search, Settings, Sparkles, Upload, Users, Wrench, X,
} from 'lucide-react';
import gabfixLogo from './assets/gabfix-logo.png';
import * as api from './api';
import type { AppData, Customer, Equipment, InventoryItem, Job, JobStatus, LaundryOrder, Modal, View } from './types';
import StatusBadge from '@/components/StatusBadge';
import { useTheme } from '@/hooks/useTheme';

/** Currency code used by every money() call. The Settings profile updates this at runtime. */
let activeCurrency = 'UGX';
const setCurrency = (code: string) => { activeCurrency = code || 'UGX'; };
const money = (value: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: activeCurrency, currencyDisplay: 'code', maximumFractionDigits: 0 }).format(value);
const today = new Date().toISOString().slice(0, 10);

const getStartDate = (period: string): string => {
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case 'This day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'This week':
      start.setDate(now.getDate() - now.getDay());
      break;
    case 'This quarter':
      start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'This year':
      start.setMonth(0, 1);
      break;
    case 'This month':
    default:
      start.setDate(1);
      break;
  }
  return start.toISOString().slice(0, 10);
};

/** The equivalent date window immediately before the selected period, used for real trend figures. */
const previousPeriodWindow = (period: string) => {
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const start = new Date(getStartDate(period));
  const now = new Date();
  const days = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000));
  const previousEnd = new Date(start.getTime() - 86400000);
  const previousStart = new Date(previousEnd.getTime() - days * 86400000);
  return { start: iso(previousStart), end: iso(previousEnd) };
};

const inWindow = (date: string, window: { start: string; end: string }) => date >= window.start && date <= window.end;

/** Percentage change between two totals, or null when there is nothing to compare against. */
const changePercent = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;

const trendText = (value: number | null, suffix = 'vs previous period') =>
  value === null ? `No comparable ${suffix.replace('vs ', '')}` : `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(1)}% ${suffix}`;

/** Keys (YYYY-MM) for the trailing months, oldest first. */
const monthKeys = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
};

const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
const monthName = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const monthKeyOf = (date: string) => (date || '').slice(0, 7);

/** Download rows as a CSV file — used by every Export action in the workspace. */
const exportCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map(row => row.map(cell => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

type WorkspaceProfile = { companyName: string; tagline: string; phone: string; address: string; currency: string; basis: string; logo: string };
const defaultProfile: WorkspaceProfile = { companyName: 'Gabfix Home Solutions', tagline: 'Home Solutions', phone: '+256 772 000 447', address: 'Plot 18, Kira Road, Kampala, Uganda', currency: 'UGX', basis: 'Cash basis', logo: '' };
const PROFILE_KEY = 'gabfix.workspace.profile';
const readProfile = (): WorkspaceProfile => {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? { ...defaultProfile, ...(JSON.parse(raw) as Partial<WorkspaceProfile>) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
};

const emptyData: AppData = { customers: [], services: [], jobs: [], invoices: [], expenses: [], laundry: [], equipment: [], inventory: [] };

const navGroups = [
  { label: 'Workspace', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ id: 'jobs', label: 'Jobs & contracts', icon: ClipboardList }, { id: 'customers', label: 'Customers', icon: Users }] },
  { label: 'Finance', items: [{ id: 'finance', label: 'Finance', icon: CircleDollarSign }] },
  { label: 'Laundry', items: [{ id: 'laundry', label: 'Laundry operations', icon: Droplets }] },
  { label: 'Assets & stock', items: [{ id: 'equipment', label: 'Equipment', icon: Wrench }, { id: 'inventory', label: 'Inventory', icon: Package }] },
  { label: 'Insight', items: [{ id: 'reports', label: 'Reports', icon: BarChart3 }] },
];

function App() {
  useTheme();
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<View>('dashboard');
  const [period, setPeriod] = useState('This month');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [profile, setProfile] = useState<WorkspaceProfile>(() => readProfile());
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [importRef] = useState(() => ({ current: null as HTMLInputElement | null }));
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { let cancelled = false; (async () => { try { const remote = await api.fetchData(); if (!cancelled) setData(remote); } catch { if (!cancelled) setLoadError('Could not reach the database. Is the API server running?'); } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); } }, [toast]);
  useEffect(() => { setCurrency(profile.currency); }, [profile.currency]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
        return;
      }
      if (event.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const periodStart = getStartDate(period);

  const periodJobs = data.jobs.filter(job => job.date >= periodStart);
  const periodExpenses = data.expenses.filter(expense => expense.date >= periodStart);
  const periodLaundry = data.laundry.filter(order => order.received >= periodStart);
  const periodInvoices = data.invoices.filter(inv => inv.date >= periodStart);

  const revenue = periodJobs.filter(job => job.status === 'Completed' || job.status === 'In Progress').reduce((sum, job) => sum + job.revenue, 0) + periodLaundry.reduce((sum, order) => sum + order.paid, 0);
  const expenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const activeJobs = periodJobs.filter(job => job.status !== 'Completed').length; void activeJobs;
  const receivables = periodInvoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);

  /** Real records matching the topbar search, across every module. */
  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [] as { id: string; label: string; detail: string; kind: string; view: View }[];
    const hits: { id: string; label: string; detail: string; kind: string; view: View }[] = [];
    const match = (...values: (string | number | undefined)[]) => values.some(value => String(value ?? '').toLowerCase().includes(term));
    data.jobs.forEach(job => { const customer = data.customers.find(item => item.id === job.customerId); if (match(job.number, customer?.name, customer?.company)) hits.push({ id: `job-${job.id}`, label: job.number, detail: `${customer?.company || customer?.name || 'Customer'} · ${money(job.revenue)} · ${job.status}`, kind: 'Job', view: 'jobs' }); });
    data.customers.forEach(customer => { if (match(customer.name, customer.company, customer.email, customer.phone)) hits.push({ id: `customer-${customer.id}`, label: customer.company || customer.name, detail: `${customer.name} · ${customer.phone}`, kind: 'Customer', view: 'customers' }); });
    data.invoices.forEach(invoice => { const customer = data.customers.find(item => item.id === invoice.customerId); if (match(invoice.number, customer?.name, customer?.company, invoice.status)) hits.push({ id: `invoice-${invoice.id}`, label: invoice.number, detail: `${customer?.company || customer?.name || 'Customer'} · ${money(invoice.total - invoice.paid)} balance`, kind: 'Invoice', view: 'finance' }); });
    data.laundry.forEach(order => { const customer = data.customers.find(item => item.id === order.customerId); if (match(order.number, customer?.name, order.status)) hits.push({ id: `laundry-${order.id}`, label: order.number, detail: `${customer?.name || 'Customer'} · ${order.status}`, kind: 'Laundry', view: 'laundry' }); });
    data.equipment.forEach(item => { if (match(item.name, item.serialNumber, item.type, item.condition)) hits.push({ id: `equipment-${item.id}`, label: item.name, detail: `SN ${item.serialNumber} · ${item.condition}`, kind: 'Equipment', view: 'equipment' }); });
    data.inventory.forEach(item => { if (match(item.name, item.category, item.unit)) hits.push({ id: `stock-${item.id}`, label: item.name, detail: `${item.quantity} ${item.unit} on hand · ${item.category}`, kind: 'Stock', view: 'inventory' }); });
    return hits.slice(0, 8);
  }, [query, data]);

  /** Everything that genuinely needs attention, derived from live records. */
  const alerts = useMemo(() => {
    const overdue = data.invoices.filter(invoice => invoice.status === 'Overdue');
    const dueMaintenance = data.equipment.filter(item => new Date(item.nextMaintenance) <= new Date());
    const lowStock = data.inventory.filter(item => item.quantity <= item.minimum);
    const readyLaundry = data.laundry.filter(order => order.status === 'Ready');
    const list: { title: string; detail: string; tone: string; icon: ReactNode; view: View }[] = [];
    if (overdue.length) list.push({ title: `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue`, detail: `${money(overdue.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0))} outstanding`, tone: 'rose', icon: <Clock3 />, view: 'finance' });
    if (dueMaintenance.length) list.push({ title: `${dueMaintenance.length} machine${dueMaintenance.length > 1 ? 's' : ''} due for service`, detail: dueMaintenance.map(item => item.name).slice(0, 2).join(', '), tone: 'amber', icon: <Wrench />, view: 'equipment' });
    if (lowStock.length) list.push({ title: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} below minimum stock`, detail: lowStock.map(item => item.name).slice(0, 2).join(', '), tone: 'blue', icon: <Package />, view: 'inventory' });
    if (readyLaundry.length) list.push({ title: `${readyLaundry.length} laundry order${readyLaundry.length > 1 ? 's' : ''} ready for collection`, detail: readyLaundry.map(order => order.number).slice(0, 2).join(', '), tone: 'green', icon: <Droplets />, view: 'laundry' });
    return list;
  }, [data]);

  const updateData = (next: AppData) => setData(next);
  const notify = (message: string) => setToast(message);
  const refresh = async () => { try { setData(await api.fetchData()); } catch { notify('Could not refresh data'); } };
  const exportData = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'gabfix-backup.json'; link.click(); URL.revokeObjectURL(url); notify('Backup downloaded'); };
  const importData = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { try { await api.importData(JSON.parse(String(reader.result)) as AppData); await refresh(); notify('Backup restored successfully'); } catch { notify('That backup could not be restored'); } }; reader.readAsText(file); };
  const resetData = async () => { if (!window.confirm('Restore the original Gabfix demo data? This replaces everything in the database.')) return; try { await api.resetData(); await refresh(); notify('Demo data restored'); } catch { notify('Reset failed'); } };
  /** Escape closes the active modal or the open search/alert panels, matching desktop app habits. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); setModal(null); setModalData(null); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const saveProfile = (next: WorkspaceProfile) => { setProfile(next); setCurrency(next.currency); try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); notify('Workspace profile saved'); } catch { notify('Could not save the profile'); } };

  const renderView = () => {
    const props = { data, updateData, notify, setModal, setModalData, query, refresh, setView, profile };
    if (loading) return <div className="empty-state"><strong>Loading your workspace…</strong><span>Fetching records from the database</span></div>;
    if (loadError) return <div className="empty-state"><strong>Cannot reach the database</strong><span>{loadError}</span><Button onClick={refresh}>Retry</Button></div>;
    if (view === 'dashboard') return <Dashboard data={data} period={period} setPeriod={setPeriod} revenue={revenue} expenses={expenses} receivables={receivables} activeJobs={activeJobs} setView={setView} setModal={setModal} setModalData={setModalData} />; void activeJobs;
    if (view === 'jobs') return <JobsView {...props} />;
    if (view === 'customers') return <CustomersView {...props} />;
    if (view === 'finance') return <FinanceView {...props} />;
    if (view === 'laundry') return <LaundryView {...props} />;
    if (view === 'equipment') return <EquipmentView {...props} />;
    if (view === 'inventory') return <InventoryView {...props} />;
    if (view === 'reports') return <ReportsView {...props} />;
    return <SettingsView data={data} updateData={updateData} exportData={exportData} importData={() => importRef.current?.click()} resetData={resetData} notify={notify} setModal={setModal} profile={profile} saveProfile={saveProfile} />;
  };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><img src={profile.logo || gabfixLogo} alt={profile.companyName} /></div><div><strong>{profile.companyName.split(' ')[0]}</strong><span>{profile.tagline}</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      
      <nav>{navGroups.map(group => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(item => { const Icon = item.icon; const overdueInvoices = item.id === 'finance' ? data.invoices.filter(inv => inv.status === 'Overdue').length : 0; const maintenanceCount = item.id === 'equipment' ? data.equipment.filter(e => new Date(e.nextMaintenance) <= new Date()).length : 0; const badgeCount = overdueInvoices || maintenanceCount; return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id as View); setMobileOpen(false); }}><Icon size={17} /><span>{item.label}</span>{badgeCount > 0 && <span className="nav-badge">{badgeCount}</span>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><Sparkles size={18} /><div><strong>Owner workspace</strong><span>Everything is up to date</span></div></div><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><Settings size={17} /><span>Settings</span></button><div className="user-chip"><div className="avatar">GN</div><div><strong>Gabriel N.</strong><span>Owner account</span></div><ChevronDown size={14} /></div></div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className="main-content">
      <header className="topbar"><button className="menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="topbar-context"><strong>{view === 'dashboard' ? 'Here is your business at a glance.' : navGroups.flatMap(group => group.items).find(item => item.id === view)?.label ?? 'Settings'}</strong></div><div className="topbar-actions"><div className={`global-search ${searchOpen ? 'open' : ''}`}><button className="search-trigger" onClick={() => { setSearchOpen(true); searchRef.current?.focus(); }} aria-label="Search your workspace"><Search size={17} /></button><input ref={searchRef} placeholder="Search anything..." value={query} onChange={event => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-label="Search jobs, customers, invoices, stock and equipment" /><kbd>⌘ K</kbd>{query.trim().length > 1 && <div className="search-panel">{searchResults.length ? searchResults.map(result => <button className="result-row" key={result.id} onClick={() => { setView(result.view); setSearchOpen(false); }}><span><strong>{result.label}</strong><small>{result.detail}</small></span><span className="result-kind">{result.kind}</span></button>) : <span className="result-empty">No records match "{query.trim()}".</span>}</div>}</div><button className="icon-button notification" onClick={() => setNotifOpen(open => !open)} aria-label={`Alerts (${alerts.length})`} aria-expanded={notifOpen}><Bell size={18} />{alerts.length > 0 && <span className="notif-count">{alerts.length}</span>}</button>{notifOpen && <div className="notif-panel"><h4>Needs attention</h4>{alerts.length ? alerts.map(alert => <button className="notif-row" key={alert.title} onClick={() => { setView(alert.view); setNotifOpen(false); }}>{alert.icon}<span><strong>{alert.title}</strong><small>{alert.detail}</small></span></button>) : <p className="notif-empty">Everything is up to date.</p>}</div>}<button className="profile-button" onClick={() => setView('settings')} aria-label="Open workspace settings"><div className="avatar small">GN</div><ChevronDown size={14} /></button></div></header>
      <div className="page-content">{renderView()}</div>
    </main>
    {modal && <ModalShell type={modal} data={data} close={() => { setModal(null); setModalData(null); }} notify={notify} modalData={modalData} refresh={refresh} />}
    <input ref={importRef} type="file" accept="application/json" onChange={importData} className="hidden-input" />
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>;
}

function PageHeader({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; children?: ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="header-actions">{children}{action}</div></div>; }
function Button({ children, onClick, variant = 'primary', icon, disabled }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; icon?: ReactNode; disabled?: boolean }) { return <button className={`button ${variant}`} onClick={onClick} disabled={disabled}>{icon}{children}</button>; }
// StatusBadge is now imported from src/components/StatusBadge.tsx (Phase 0b)
function EmptyState({ title = 'Nothing here yet', description = 'Create a record to start building your workspace.' }: { title?: string; description?: string }) { return <div className="empty-state"><div className="empty-icon"><ClipboardList size={22} /></div><strong>{title}</strong><span>{description}</span></div>; }

function Dashboard({ data, period, setPeriod, revenue, expenses, receivables, setView, setModal, setModalData }: { data: AppData; period: string; setPeriod: (value: string) => void; revenue: number; expenses: number; receivables: number; activeJobs: number; setView: (view: View) => void; setModal: (modal: Modal) => void; setModalData: (data: any) => void }) {
  const profit = revenue - expenses;
  const revenueByDivision = data.services.map(service => ({ name: service.division, value: data.jobs.filter(job => job.serviceId === service.id).reduce((sum, job) => sum + job.revenue, 0) })).reduce<{ name: string; value: number }[]>((acc, item) => { const found = acc.find(entry => entry.name === item.name); if (found) found.value += item.value; else acc.push(item); return acc; }, []).sort((a, b) => b.value - a.value);
  const maxDivision = Math.max(...revenueByDivision.map(item => item.value), 1);
  /** Revenue and expense totals for the last six months of real records. */
  const monthKeys = Array.from(new Set([...data.jobs.map(job => job.date.slice(0, 7)), ...data.expenses.map(expense => expense.date.slice(0, 7))])).sort().slice(-6);
  const monthBars = monthKeys.map(key => ({ key, label: new Date(`${key}-01T00:00:00`).toLocaleString('en-GB', { month: 'short' }), revenue: data.jobs.filter(job => job.date.startsWith(key)).reduce((sum, job) => sum + job.revenue, 0), expense: data.expenses.filter(expense => expense.date.startsWith(key)).reduce((sum, expense) => sum + expense.amount, 0) }));
  const barPeak = Math.max(...monthBars.map(month => Math.max(month.revenue, month.expense)), 1);
  const lastMonth = monthBars[monthBars.length - 1] ?? { key: '', label: '', revenue: 0, expense: 0 };
  const previous = monthBars.length > 1 ? monthBars[monthBars.length - 2] : null;
  const change = previous && previous.revenue ? Math.round((lastMonth.revenue - previous.revenue) / previous.revenue * 1000) / 10 : 0;
  const expenseChange = previous && previous.expense ? Math.round((lastMonth.expense - previous.expense) / previous.expense * 1000) / 10 : 0;
  const margin = revenue ? Math.round(profit / revenue * 100) : 0;
  const overdueInvoices = data.invoices.filter(invoice => invoice.status === 'Overdue').length;
  const activeContracts = data.customers.filter(customer => customer.status === 'Active' && data.jobs.some(job => job.customerId === customer.id && job.status !== 'Completed')).length;
  const repeatClients = data.customers.filter(customer => data.jobs.filter(job => job.customerId === customer.id).length + data.laundry.filter(order => order.customerId === customer.id).length > 1).length;
  const alertList = [
    ...(overdueInvoices ? [{ icon: <Clock3 />, title: `${overdueInvoices} invoice${overdueInvoices > 1 ? 's' : ''} overdue`, detail: `${money(data.invoices.filter(invoice => invoice.status === 'Overdue').reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0))} still to collect`, tone: 'rose', view: 'finance' as View }] : []),
    ...(data.equipment.filter(item => new Date(item.nextMaintenance) <= new Date()).length ? [{ icon: <Wrench />, title: `${data.equipment.filter(item => new Date(item.nextMaintenance) <= new Date()).length} machine(s) due for service`, detail: data.equipment.filter(item => new Date(item.nextMaintenance) <= new Date()).map(item => item.name).join(', '), tone: 'amber', view: 'equipment' as View }] : []),
    ...(data.inventory.filter(item => item.quantity <= item.minimum).length ? [{ icon: <Package />, title: `${data.inventory.filter(item => item.quantity <= item.minimum).length} item${data.inventory.filter(item => item.quantity <= item.minimum).length > 1 ? 's' : ''} running low`, detail: data.inventory.filter(item => item.quantity <= item.minimum).map(item => item.name).join(', '), tone: 'blue', view: 'inventory' as View }] : []),
    ...(data.laundry.filter(order => order.status === 'Ready').length ? [{ icon: <Droplets />, title: `${data.laundry.filter(order => order.status === 'Ready').length} laundry order${data.laundry.filter(order => order.status === 'Ready').length > 1 ? 's' : ''} ready`, detail: data.laundry.filter(order => order.status === 'Ready').map(order => order.number).join(', '), tone: 'green', view: 'laundry' as View }] : []),
  ];
  const openJobs = data.jobs.filter(job => job.status !== 'Completed').length;
  const jobsThisMonth = data.jobs.filter(job => job.date.startsWith(lastMonth.key)).length;
  return <>
    <PageHeader eyebrow="Business overview" title="Good morning, Gabriel" description={`${period} performance across your business.`} action={<Button icon={<Plus size={17} />} onClick={() => setModal('job')}>New job</Button>}><div className="period-select"><CalendarDays size={15} /><select value={period} onChange={event => setPeriod(event.target.value)}><option>This day</option><option>This week</option><option>This month</option><option>This quarter</option><option>This year</option></select><ChevronDown size={14} /></div></PageHeader>
    <div className="quick-actions"><QuickAction icon={<ClipboardList />} label="New job" onClick={() => setModal('job')} /><QuickAction icon={<Users />} label="Add customer" onClick={() => setModal('customer')} /><QuickAction icon={<CircleDollarSign />} label="Record expense" onClick={() => setModal('expense')} /><QuickAction icon={<Droplets />} label="Laundry order" onClick={() => setView('laundry')} /><QuickAction icon={<Wrench />} label="Maintenance" onClick={() => setView('equipment')} /></div>
    <div className="kpi-grid"><KpiCard label="Total revenue" value={money(revenue)} trend={`${change >= 0 ? '+' : ''}${change}%`} detail={`vs ${previous?.label ?? 'previous month'}`} icon={<ArrowUpRight />} tone="green" /><KpiCard label="Total expenses" value={money(expenses)} trend={`${expenseChange >= 0 ? '+' : ''}${expenseChange}%`} detail={`vs ${previous?.label ?? 'previous month'}`} icon={<ArrowDownRight />} tone="amber" down /><KpiCard label="Net profit" value={money(profit)} trend={`${margin}%`} detail="margin on revenue" icon={<Activity />} tone="blue" /><KpiCard label="Accounts receivable" value={money(receivables)} trend={`${data.invoices.filter(invoice => invoice.total > invoice.paid).length} open`} detail="awaiting payment" icon={<Clock3 />} tone="rose" /></div>
    <div className="dashboard-grid"><section className="panel revenue-panel"><div className="panel-heading"><div><span className="eyebrow">Performance</span><h2>Revenue overview</h2></div><div className="legend"><span><i className="legend-dot revenue" />Revenue</span><span><i className="legend-dot expense" />Expenses</span></div></div><div className="chart-summary"><strong>{money(revenue)}</strong><span><b>{`${change >= 0 ? '+' : ''}${change}%`}</b> from {previous?.label ?? 'the previous month'}</span></div><div className="bar-chart">{monthBars.length ? monthBars.map(month => <div className="bar-group" key={month.key} title={`${month.label} · ${money(month.revenue)} revenue · ${money(month.expense)} expenses`}><div className="bar-pair"><i className="bar revenue-bar" style={{ height: `${Math.max(4, month.revenue / barPeak * 100)}%` }} /><i className="bar expense-bar" style={{ height: `${Math.max(4, month.expense / barPeak * 100)}%` }} /></div><span>{month.label}</span></div>) : <p className="notif-empty">No jobs or expenses recorded yet.</p>}</div></section><section className="panel division-panel"><div className="panel-heading"><div><span className="eyebrow">Where money comes from</span><h2>Revenue by division</h2></div><button className="more-button" onClick={() => setView('reports')}>View report</button></div><div className="division-list">{revenueByDivision.slice(0, 5).map((item, index) => <div className="division-row" key={item.name}><div className="division-label"><span className={`division-icon d${index}`}><BriefcaseBusiness size={15} /></span><strong>{item.name}</strong><span>{money(item.value)}</span></div><div className="progress"><i style={{ width: `${Math.max(7, item.value / maxDivision * 100)}%` }} /></div></div>)}</div></section></div>
    <div className="dashboard-grid lower-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Live activity</span><h2>Recent jobs</h2></div><button className="more-button" onClick={() => setView('jobs')}>See all jobs <ArrowUpRight size={14} /></button></div><JobTable jobs={data.jobs.slice(0, 4)} data={data} compact setModal={setModal} setModalData={setModalData} /></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Needs attention</span><h2>Business alerts</h2></div><Bell size={17} className="muted-icon" /></div><div className="alert-list">{alertList.length ? alertList.map(alert => <AlertRow key={alert.title} icon={alert.icon} title={alert.title} detail={alert.detail} tone={alert.tone} onClick={() => setView(alert.view)} />) : <div className="notif-empty">Nothing needs attention right now.</div>}</div></section></div>
    <div className="metric-strip"><div><span>Jobs this month</span><strong>{jobsThisMonth}</strong><small><ClipboardList size={13} /> {openJobs} still open</small></div><div><span>Active contracts</span><strong>{activeContracts}</strong><small><Check size={13} /> {data.customers.length} customers</small></div><div><span>Laundry orders</span><strong>{data.laundry.length}</strong><small><Droplets size={13} /> {data.laundry.filter(order => order.status !== 'Collected').length} in progress</small></div><div><span>Equipment value</span><strong>{money(data.equipment.reduce((sum, item) => sum + item.bookValue, 0))}</strong><small><Gauge size={13} /> {repeatClients} repeat clients</small></div></div>
  </>;
}
function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button className="quick-action" onClick={onClick}>{icon}<span>{label}</span><Plus size={14} /></button>; }
function KpiCard({ label, value, trend, detail, icon, tone, down }: { label: string; value: string; trend: string; detail: string; icon: ReactNode; tone: string; down?: boolean }) { return <div className={`kpi-card ${tone}`}><div className="kpi-top"><span>{label}</span><div className="kpi-icon">{icon}</div></div><strong>{value}</strong><div className={`kpi-trend ${down ? 'negative' : ''}`}><span>{trend}</span><small>{detail}</small></div></div>; }
function AlertRow({ icon, title, detail, tone, onClick }: { icon: ReactNode; title: string; detail: string; tone: string; onClick: () => void }) { return <button className="alert-row" onClick={onClick}><span className={`alert-icon ${tone}`}>{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={15} /></button>; }

function JobStatusModal({ job, data, close, notify, refresh }: { job: Job; data: AppData; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [usage, setUsage] = useState<{ [key: string]: string }>(job.equipmentUsage?.reduce((acc, u) => ({ ...acc, [u.equipmentId]: String(u.hours) }), {}) || {});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const equipmentUsage = Object.entries(usage)
      .filter(([, hours]) => hours && Number(hours) > 0)
      .map(([equipmentId, hours]) => ({ equipmentId, hours: Number(hours) }));

    const updatedJobs = data.jobs.map(j => {
      if (j.id === job.id) {
        return { ...j, status, equipmentUsage: status === 'Completed' || status === 'In Progress' ? equipmentUsage : [] };
      }
      return j;
    });

    // Update equipment usage hours if completed
    let updatedEquipment = [...data.equipment];
    if (status === 'Completed') {
      updatedEquipment = updatedEquipment.map(e => {
        const usageEntry = equipmentUsage.find(u => u.equipmentId === e.id);
        if (usageEntry) {
          return { ...e, usage: e.usage + usageEntry.hours };
        }
        return e;
      });
    }

    // Persist both updates via the API, then refresh from the database
    (async () => {
      try {
        await api.updateJob(job.id, { status, equipmentUsage: status === 'Completed' || status === 'In Progress' ? equipmentUsage : [] });
        if (status === 'Completed') {
          for (const entry of equipmentUsage) {
            const machine = data.equipment.find(item => item.id === entry.equipmentId);
            if (machine) await api.updateEquipment(entry.equipmentId, { usage: machine.usage + entry.hours });
          }
        }
        await refresh();
        notify(`Job ${job.number} updated to ${status}`);
      } catch {
        notify('Could not update the job');
      }
      close();
    })();
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <label>
        Status
        <select value={status} onChange={e => setStatus(e.target.value as JobStatus)}>
          <option>Scheduled</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>Quoted</option>
        </select>
      </label>

      {(status === 'In Progress' || status === 'Completed') && (
        <div style={{ marginTop: 20 }}>
          <strong style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>Equipment Usage</strong>
          {data.equipment.map(e => (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, alignSelf: 'center' }}>{e.name} ({e.serialNumber})</span>
              <input
                type="number"
                placeholder="Hours"
                value={usage[e.id] || ''}
                onChange={ev => setUsage({ ...usage, [e.id]: ev.target.value })}
                style={{ height: 32, border: '1px solid #dde6df', borderRadius: 6, padding: '0 8px', fontSize: 11 }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: 20 }}>
        <button type="button" className="button ghost" onClick={close}>Cancel</button>
        <button type="submit" className="button primary">Update Job</button>
      </div>
    </form>
  );
}

function JobsView({ data, setModal, setModalData, query }: { data: AppData; setModal: (modal: Modal) => void; setModalData: (data: any) => void; query: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');

  const filtered = data.jobs.filter(job => {
    if (!`${job.number} ${data.customers.find(c => c.id === job.customerId)?.name}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter !== 'All' && job.status !== statusFilter) return false;

    const pStatus = getPaymentStatus(job, data);
    if (paymentFilter !== 'All') {
      if (paymentFilter === 'Paid' && !pStatus.startsWith('Paid')) return false;
      if (paymentFilter === 'Unpaid' && pStatus !== 'Unpaid') return false;
      if (paymentFilter === 'Partial' && !pStatus.startsWith('Partial')) return false;
    }
    return true;
  });

  const getCount = (status: string) => {
    return data.jobs.filter(job => status === 'All' || job.status === status).length;
  };

  return <><PageHeader eyebrow="Operations" title="Jobs & contracts" description="Track delivery, job costing, and the work that moves Gabfix forward." action={<Button icon={<Plus size={17} />} onClick={() => setModal('job')}>New job</Button>} /><div className="stat-row"><MiniStat label="Open jobs" value={String(data.jobs.filter(job => job.status !== 'Completed').length)} tone="blue" /><MiniStat label="Completed this month" value={String(data.jobs.filter(job => job.status === 'Completed').length)} tone="green" /><MiniStat label="Quoted value" value={money(data.jobs.filter(job => job.status === 'Quoted').reduce((sum, job) => sum + job.revenue, 0))} tone="amber" /><MiniStat label="Average margin" value={`${filtered.length ? Math.round(filtered.reduce((sum, job) => sum + (job.revenue ? (job.revenue - job.cost) / job.revenue : 0), 0) / filtered.length * 100) : 0}%`} tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All jobs <b>{getCount('All')}</b></button><button className={statusFilter === 'Scheduled' ? 'selected' : ''} onClick={() => setStatusFilter('Scheduled')}>Scheduled <b>{getCount('Scheduled')}</b></button><button className={statusFilter === 'In Progress' ? 'selected' : ''} onClick={() => setStatusFilter('In Progress')}>In Progress <b>{getCount('In Progress')}</b></button><button className={statusFilter === 'Completed' ? 'selected' : ''} onClick={() => setStatusFilter('Completed')}>Completed <b>{getCount('Completed')}</b></button><button className={statusFilter === 'Quoted' ? 'selected' : ''} onClick={() => setStatusFilter('Quoted')}>Quoted <b>{getCount('Quoted')}</b></button></div><div className="filter-group"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="payment-filter"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option></select></div></div><JobTable jobs={filtered} data={data} setModal={setModal} setModalData={setModalData} /></section></>; }
function getPaymentStatus(job: Job, data: AppData) {
  const customerInvoices = data.invoices.filter(inv => inv.customerId === job.customerId);
  const totalDue = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.paid, 0);

  if (totalDue === 0) return 'Unpaid';
  if (totalPaid >= totalDue) return 'Paid';
  const balance = totalDue - totalPaid;
  return `Partial (${money(balance)} pending)`;
}

function JobTable({ jobs, data, setModal, setModalData }: { jobs: Job[]; data: AppData; compact?: boolean; setModal?: (modal: Modal) => void; setModalData?: (data: any) => void }) { return <div className="table-wrap"><table><thead><tr><th>Job</th><th>Status</th><th>Customer</th><th>Service</th><th>Revenue</th><th>Payment Status</th>{setModal && <th>Action</th>}</tr></thead><tbody>{jobs.length ? jobs.map(job => { const customer = data.customers.find(item => item.id === job.customerId); const service = data.services.find(item => item.id === job.serviceId); const paymentStatus = getPaymentStatus(job, data); return <tr key={job.id}><td><strong className="linkish">{job.number}</strong><small>{job.date}</small></td><td><StatusBadge value={job.status} /></td><td><strong>{customer?.company || customer?.name}</strong><small>{customer?.type}</small></td><td>{service?.name}<small>{service?.division}</small></td><td><strong>{money(job.revenue)}</strong><small className="profit-text">{Math.round((job.revenue - job.cost) / job.revenue * 100)}% margin</small></td><td><StatusBadge value={paymentStatus} /></td>{setModal && <td><button className="more-button" onClick={() => { setModal?.('job-status'); setModalData?.(job); }}>Update</button></td>}</tr>; }) : <tr><td colSpan={7}><EmptyState title="No jobs match" /></td></tr>}</tbody></table></div>; }
function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }
function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="filter-select"><Filter size={15} /><select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={14} /></label>; }
function plain(value: number) { return new Intl.NumberFormat('en-UG').format(Math.round(value)); }
function toCsv(rows: (string | number)[][]) { return rows.map(row => row.map(cell => { const value = String(cell ?? ''); return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value; }).join(',')).join('\r\n'); }
function downloadCsv(filename: string, rows: (string | number)[][]) { const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = `${filename}.csv`; link.click(); URL.revokeObjectURL(url); }
function CsvTable({ rows, filename, caption }: { rows: (string | number)[][]; filename: string; caption?: string }) {
  const [head, ...body] = rows;
  return <><div className="table-toolbar"><div>{caption && <h2 className="table-title">{caption}</h2>}<span className="table-caption">{body.length} record{body.length === 1 ? '' : 's'} · exportable to CSV</span></div><button className="more-button" onClick={() => downloadCsv(filename, rows)}><Download size={14} /> Export CSV</button></div><div className="table-wrap"><table><thead><tr>{head.map(cell => <th key={String(cell)}>{cell}</th>)}</tr></thead><tbody>{body.length ? body.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{typeof cell === 'number' ? plain(cell) : cell}</td>)}</tr>) : <tr><td colSpan={head.length}><EmptyState title="Nothing to show yet" /></td></tr>}</tbody></table></div></>;
}
function RankedList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map(row => Math.abs(row.value)), 1);
  return <div className="division-list">{rows.map((row, index) => <div className="division-row" key={row.label}><div className="division-label"><span className={`division-icon d${index % 4}`}><BriefcaseBusiness size={15} /></span><strong>{row.label}</strong><span className="num">{money(row.value)}</span></div><div className="progress"><i style={{ width: `${Math.max(4, Math.abs(row.value) / max * 100)}%` }} /></div></div>)}</div>;
}

function CustomersView({ data, setModal, query }: { data: AppData; setModal: (modal: Modal) => void; query: string }) {
  const [term, setTerm] = useState('');
  const [type, setType] = useState('All types');
  const types = ['All types', ...Array.from(new Set(data.customers.map(item => item.type))).sort()];
  const activity = (customer: Customer) => data.jobs.filter(job => job.customerId === customer.id).length + data.laundry.filter(order => order.customerId === customer.id).length;
  const customers = data.customers.filter(customer => {
    const haystack = `${customer.name} ${customer.company} ${customer.email} ${customer.phone}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase()) && haystack.includes(term.trim().toLowerCase()) && (type === 'All types' || customer.type === type);
  });
  const repeat = data.customers.filter(customer => activity(customer) > 1).length;
  const month = today.slice(0, 7);
  const activeThisMonth = data.customers.filter(customer => data.jobs.some(job => job.customerId === customer.id && job.date.startsWith(month))).length;
  const rows: (string | number)[][] = [['Customer', 'Company', 'Type', 'Phone', 'Email', 'Jobs & orders', 'Outstanding', 'Status']];
  customers.forEach(customer => rows.push([customer.name, customer.company, customer.type, customer.phone, customer.email, activity(customer), Math.round(customer.balance), customer.status]));
  return <><PageHeader eyebrow="Relationships" title="Customers" description="A clear view of every relationship, balance, and service history." action={<Button icon={<Plus size={17} />} onClick={() => setModal('customer')}>Add customer</Button>}><div className="filter-group"><div className="inline-search"><Search size={16} /><input placeholder="Filter customers" value={term} onChange={event => setTerm(event.target.value)} aria-label="Filter customers by name, company, email or phone" /></div><SelectFilter label="Customer type" value={type} options={types} onChange={setType} /></div></PageHeader><div className="stat-row"><MiniStat label="Total customers" value={String(data.customers.length)} tone="blue" /><MiniStat label="Active this month" value={String(activeThisMonth)} tone="green" /><MiniStat label="Customer balance" value={money(data.customers.reduce((sum, item) => sum + item.balance, 0))} tone="amber" /><MiniStat label="Repeat rate" value={`${data.customers.length ? Math.round(repeat / data.customers.length * 100) : 0}%`} tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div><h2 className="table-title">All customers</h2><span className="table-caption">Showing {customers.length} of {data.customers.length} records</span></div><button className="more-button" onClick={() => downloadCsv('gabfix-customers', rows)}><Download size={14} /> Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Type</th><th>Contact</th><th>Jobs</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{customers.length ? customers.map(customer => <tr key={customer.id}><td><div className="person-cell"><div className="avatar colored">{customer.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div><span><strong>{customer.company || customer.name}</strong><small>{customer.company ? customer.name : 'Individual customer'}</small></span></div></td><td>{customer.type}</td><td><strong>{customer.phone}</strong><small>{customer.email}</small></td><td>{activity(customer)}</td><td><strong className={customer.balance ? 'balance-text' : ''}>{money(customer.balance)}</strong></td><td><StatusBadge value={customer.status} /></td></tr>) : <tr><td colSpan={6}><EmptyState title="No customers match" description="Try a different name, company, email, or customer type." /></td></tr>}</tbody></table></div></section></>;
}

function LaundryTable({ orders, data }: { orders: LaundryOrder[]; data: AppData }) {
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Customer</th><th>Items & service</th><th>Received</th><th>Total</th><th>Payment Status</th></tr></thead><tbody>{orders.length ? orders.map(order => {
    const paymentStatus = getLaundryPaymentStatus(order);
    return <tr key={order.id}><td><strong className="linkish">{order.number}</strong><small>{order.received}</small></td><td><StatusBadge value={order.status} /></td><td><strong>{data.customers.find(customer => customer.id === order.customerId)?.name}</strong><small>{data.customers.find(customer => customer.id === order.customerId)?.type}</small></td><td><strong>{order.items}</strong><small>Machine wash & finish</small></td><td>{order.received}</td><td><strong>{money(order.total)}</strong><small className="profit-text">{order.total - order.paid ? `${money(order.total - order.paid)} balance` : 'Paid in full'}</small></td><td><StatusBadge value={paymentStatus} /></td></tr>;
  }) : <tr><td colSpan={7}><EmptyState title="No orders match" /></td></tr>}</tbody></table></div>;
}

function FinanceView({ data, setModal }: { data: AppData; setModal: (modal: Modal) => void }) {
  const [month, setMonth] = useState('All months');
  const months = ['All months', ...Array.from(new Set([...data.invoices.map(invoice => invoice.date.slice(0, 7)), ...data.expenses.map(expense => expense.date.slice(0, 7))])).sort().reverse()];
  const scope = month === 'All months' ? 'All recorded months' : new Date(`${month}-01T00:00:00`).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const invoices = data.invoices.filter(invoice => month === 'All months' || invoice.date.startsWith(month));
  const expenses = data.expenses.filter(expense => month === 'All months' || expense.date.startsWith(month));
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);
  const received = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const paidOut = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cash = received - paidOut;
  const cashSeries = months.filter(item => item !== 'All months').slice().reverse().slice(-8).map(key => ({ key, label: new Date(`${key}-01T00:00:00`).toLocaleString('en-GB', { month: 'short' }), received: data.invoices.filter(invoice => invoice.date.startsWith(key)).reduce((sum, invoice) => sum + invoice.paid, 0) }));
  const cashPeak = Math.max(...cashSeries.map(item => item.received), 1);
  const oldestDue = invoices.filter(invoice => invoice.total > invoice.paid).map(invoice => invoice.due).sort()[0];
  const exportReceivables = () => downloadCsv('gabfix-receivables', [['Invoice', 'Customer', 'Due date', 'Amount', 'Balance', 'Status'], ...invoices.map(invoice => { const customer = data.customers.find(item => item.id === invoice.customerId); return [invoice.number, customer?.company || customer?.name || 'Customer', invoice.due, Math.round(invoice.total), Math.round(invoice.total - invoice.paid), invoice.status]; })]);
  return <><PageHeader eyebrow="Finance" title="Money in, money out" description="Track your financial health without losing the operational context." action={<Button icon={<Plus size={17} />} onClick={() => setModal('expense')}>Record expense</Button>}><SelectFilter label="Statement period" value={month} options={months} onChange={setMonth} /></PageHeader><div className="finance-hero"><div><span className="eyebrow">Cash basis · {scope}</span><h2>{money(cash)}</h2><p>Invoices collected minus expenses recorded{oldestDue ? ` · oldest unpaid invoice due ${oldestDue}` : ''}</p></div><div className="cash-bars">{cashSeries.map(item => <span key={item.key} style={{ height: `${Math.max(6, item.received / cashPeak * 100)}%` }} title={`${item.label}: ${money(item.received)} collected`} />)}</div></div><div className="stat-row"><MiniStat label="Revenue received" value={money(received)} tone="green" /><MiniStat label="Expenses paid" value={money(paidOut)} tone="amber" /><MiniStat label="Receivables" value={money(outstanding)} tone="rose" /><MiniStat label="Invoices in period" value={String(invoices.length)} tone="blue" /></div><div className="dashboard-grid lower-grid"><section className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">Accounts receivable</span><h2>Outstanding invoices</h2></div><button className="more-button" onClick={exportReceivables}><Download size={14} /> Export receivables</button></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>{invoices.length ? invoices.map(invoice => <tr key={invoice.id}><td><strong className="linkish">{invoice.number}</strong><small>{invoice.date}</small></td><td>{data.customers.find(customer => customer.id === invoice.customerId)?.company || data.customers.find(customer => customer.id === invoice.customerId)?.name}</td><td>{invoice.due}</td><td>{money(invoice.total)}</td><td><strong>{money(invoice.total - invoice.paid)}</strong></td><td><StatusBadge value={invoice.status} /></td></tr>) : <tr><td colSpan={6}><EmptyState title="No invoices in this period" description="Choose another statement period." /></td></tr>}</tbody></table></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Expense control</span><h2>Recent expenses</h2></div><button className="more-button" onClick={() => setModal('expense')}>Add</button></div><div className="expense-list">{data.expenses.slice(0, 5).map(expense => <div className="expense-row" key={expense.id}><span className="expense-icon"><CircleDollarSign size={16} /></span><span><strong>{expense.category}</strong><small>{expense.description}</small></span><strong>{money(expense.amount)}</strong></div>)}</div></section></div></>; }

function getLaundryPaymentStatus(order: LaundryOrder) {
  if (order.paid >= order.total) return 'Paid';
  if (order.paid === 0) return 'Unpaid';
  const balance = order.total - order.paid;
  return `Partial (${money(balance)} pending)`;
}

function LaundryView({ data, setModal, setModalData, setView, query }: { data: AppData; setModal: (modal: Modal) => void; setModalData: (data: any) => void; setView: (view: View) => void; query: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [receivedMonth, setReceivedMonth] = useState<string>('All months');
  const scoped = data.laundry;
  const revenue = scoped.reduce((sum, order) => sum + order.total, 0);
  const receivedMonths = ['All months', ...Array.from(new Set(data.laundry.map(order => monthKeyOf(order.received)).filter(Boolean))).sort().reverse().map(monthName)];
  const ordersThisMonth = scoped.filter(order => monthKeyOf(order.received) === monthKeyOf(today)).length;
  const collected = scoped.reduce((sum, order) => sum + order.paid, 0);
  const collectedRate = revenue ? Math.round(collected / revenue * 100) : 0;
  const inProgress = scoped.filter(order => order.status !== 'Collected').length;
  const inProgressRate = scoped.length ? Math.round(inProgress / scoped.length * 100) : 0;
  const monthLabel = monthName(monthKeyOf(today));
  const readyCount = scoped.filter(order => order.status === 'Ready').length;
  const outstandingBalance = scoped.reduce((sum, order) => sum + order.total - order.paid, 0);

  const filtered = scoped.filter(order => {
    if (!`${order.number} ${data.customers.find(c => c.id === order.customerId)?.name}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter !== 'All' && order.status !== statusFilter) return false;

    if (receivedMonth !== 'All months' && monthName(monthKeyOf(order.received)) !== receivedMonth) return false;

    const pStatus = getLaundryPaymentStatus(order);
    if (paymentFilter !== 'All') {
      if (paymentFilter === 'Paid' && !pStatus.startsWith('Paid')) return false;
      if (paymentFilter === 'Unpaid' && pStatus !== 'Unpaid') return false;
      if (paymentFilter === 'Partial' && !pStatus.startsWith('Partial')) return false;
    }
    return true;
  });

  const getCount = (status: string) => {
    return scoped.filter(order => status === 'All' || order.status === status).length;
  };

  return <><PageHeader eyebrow="Laundry division" title="Laundry operations" description="From drop-off to collection, keep every order and machine moving." action={<Button icon={<Plus size={17} />} onClick={() => setModal('job')}>New laundry order</Button>} /><div className="laundry-hero"><div className="laundry-copy"><span className="eyebrow">{monthLabel} performance</span><h2>Clean work. Clear numbers.</h2><p>Your laundry division has processed <strong>{ordersThisMonth} order{ordersThisMonth === 1 ? '' : 's'}</strong> in {monthLabel} and collected <strong>{collectedRate}%</strong> of the {money(revenue)} billed.</p><div className="laundry-actions"><Button onClick={() => setModal('job')} icon={<Plus size={16} />}>New order</Button><Button variant="secondary" onClick={() => setView('equipment')}>Machine usage</Button></div></div><div className="laundry-orbit"><Droplets size={42} /><span>{inProgressRate}%</span><small>orders in progress</small></div></div><div className="stat-row"><MiniStat label={`Orders in ${monthLabel}`} value={String(ordersThisMonth)} tone="blue" /><MiniStat label="Laundry revenue" value={money(revenue)} tone="green" /><MiniStat label="Ready for collection" value={String(readyCount)} tone="amber" /><MiniStat label="Unpaid balances" value={money(outstandingBalance)} tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All orders <b>{getCount('All')}</b></button><button className={statusFilter === 'Washing' ? 'selected' : ''} onClick={() => setStatusFilter('Washing')}>Washing <b>{getCount('Washing')}</b></button><button className={statusFilter === 'Drying' ? 'selected' : ''} onClick={() => setStatusFilter('Drying')}>Drying <b>{getCount('Drying')}</b></button><button className={statusFilter === 'Ready' ? 'selected' : ''} onClick={() => setStatusFilter('Ready')}>Ready <b>{getCount('Ready')}</b></button><button className={statusFilter === 'Collected' ? 'selected' : ''} onClick={() => setStatusFilter('Collected')}>Collected <b>{getCount('Collected')}</b></button></div><div className="filter-group"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="payment-filter"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option></select></div></div><LaundryTable orders={filtered} data={data} /></section></>; }

function EquipmentView({ data, setModal, setModalData }: { data: AppData; setModal: (modal: Modal) => void; setModalData: (data: any) => void }) { const assets = data.equipment; const total = assets.reduce((sum, item) => sum + item.bookValue, 0); const maintenanceDue = assets.filter(item => new Date(item.nextMaintenance) <= new Date()).length; const accumulated = Math.max(0, assets.reduce((sum, item) => sum + item.value, 0) - total); return <><PageHeader eyebrow="Assets" title="Equipment & machines" description="Know what you own, what it costs, and what needs attention." action={<Button icon={<Plus size={17} />} onClick={() => setModal('equipment')}>Add equipment</Button>} /><div className="stat-row"><MiniStat label="Book value" value={money(total)} tone="blue" /><MiniStat label="Assets in service" value={`${assets.length - maintenanceDue}/${assets.length}`} tone="green" /><MiniStat label="Maintenance due" value={String(maintenanceDue)} tone="amber" /><MiniStat label="Accumulated depreciation" value={money(accumulated)} tone="rose" /></div><div className="asset-grid">{assets.map(item => <article className="asset-card" key={item.id}><div className="asset-top"><span className="asset-visual"><Wrench size={22} /></span><button className="more-button" onClick={() => { setModalData(item); setModal('equipment-update'); }}>Update</button></div><span className="eyebrow">{item.type}</span><h3>{item.name}</h3><small className="serial-number">SN: {item.serialNumber}</small><div className="asset-meta"><StatusBadge value={item.condition} /></div><div className="asset-value"><div><small>Current book value</small><strong>{money(item.bookValue)}</strong></div><div><small>Usage</small><strong>{item.usage.toLocaleString()} hrs</strong></div></div><div className="asset-footer"><span><CalendarDays size={13} /> Service due {item.nextMaintenance}</span><ArrowUpRight size={15} /></div></article>)}</div></>; }

function InventoryView({ data, setModal, setModalData, query }: { data: AppData; setModal: (modal: Modal) => void; setModalData: (data: any) => void; query: string }) { const [itemQuery, setItemQuery] = useState(''); const [category, setCategory] = useState('All categories'); const term = (itemQuery.trim() || query).trim(); const items = data.inventory.filter(item => (category === 'All categories' || item.category === category) && `${item.name} ${item.category} ${item.unit}`.toLowerCase().includes(term.toLowerCase())); const value = data.inventory.reduce((sum, item) => sum + item.quantity * item.cost, 0); return <><PageHeader eyebrow="Inventory" title="Stock & supplies" description="Stay ahead of the materials your teams use every day." action={<Button icon={<Plus size={17} />} onClick={() => setModal('inventory')}>Add stock</Button>}><SelectFilter label="Category" value={category} options={['All categories', ...Array.from(new Set(data.inventory.map(item => item.category))).sort()]} onChange={setCategory} /></PageHeader><div className="inventory-banner"><div className="inventory-banner-icon"><Package size={22} /></div><div><strong>{money(value)}</strong><span>Current inventory value</span></div><div className="inventory-alert"><AlertTriangle size={16} /><span><strong>{data.inventory.filter(item => item.quantity <= item.minimum).length} items</strong> are below minimum stock</span></div><Button variant="secondary" onClick={() => setModal('reorder')}>Stock movement</Button></div><section className="panel table-panel"><div className="table-toolbar"><div><h2 className="table-title">Inventory items</h2><span className="table-caption">Quantities update when materials are consumed on jobs</span></div><div className="inline-search"><Search size={16} /><input placeholder="Search stock" value={itemQuery} onChange={event => setItemQuery(event.target.value)} aria-label="Search stock items" /></div></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Cost / unit</th><th>Stock health</th><th>Action</th></tr></thead><tbody>{items.map(item => { const low = item.quantity <= item.minimum; return <tr key={item.id}><td><div className="person-cell"><span className="table-product"><Package size={16} /></span><span><strong>{item.name}</strong><small>{item.id.toUpperCase()} · {item.unit}</small></span></div></td><td>{item.category}</td><td><strong>{item.quantity} {item.unit}</strong><small>Minimum {item.minimum}</small></td><td>{money(item.cost)}</td><td><span className={`stock-health ${low ? 'low' : 'healthy'}`}><i />{low ? 'Reorder soon' : 'Healthy'}</span></td><td><button className="more-button" onClick={() => { setModalData(item); setModal('reorder'); }}>Adjust</button></td></tr>; })}{!items.length && <tr><td colSpan={7}><EmptyState title="No stock items match" description="Try a different search term or add a new item." /></td></tr>}</tbody></table></div></section></>; }

function ReportsView({ data, setView }: { data: AppData; setView: (view: View) => void }) {
  const [month, setMonth] = useState('All months');
  const [report, setReport] = useState('Profit & loss');
  const months = ['All months', ...Array.from(new Set([...data.jobs.map(job => job.date.slice(0, 7)), ...data.expenses.map(expense => expense.date.slice(0, 7))])).sort().reverse()];
  const scopeJobs = data.jobs.filter(job => month === 'All months' || job.date.startsWith(month));
  const scopeExpenses = data.expenses.filter(expense => month === 'All months' || expense.date.startsWith(month));
  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  const revenue = total(scopeJobs.map(job => job.revenue));
  const directCosts = total(scopeJobs.map(job => job.cost));
  const grossProfit = revenue - directCosts;
  const operating = total(scopeExpenses.map(expense => expense.amount));
  const netProfit = grossProfit - operating;
  const share = (value: number) => revenue ? `${Math.round(value / revenue * 100)}%` : '0%';
  const scope = month === 'All months' ? 'All recorded months' : new Date(`${month}-01T00:00:00`).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const plRows: (string | number)[][] = [['Line', 'Amount', 'Share of revenue'], ['Revenue', Math.round(revenue), share(revenue)], ['Direct costs', Math.round(directCosts), share(directCosts)], ['Gross profit', Math.round(grossProfit), share(grossProfit)], ['Operating expenses', Math.round(operating), share(operating)], ['Net profit', Math.round(netProfit), share(netProfit)]];
  const jobRows: (string | number)[][] = [['Job', 'Customer', 'Service', 'Status', 'Revenue', 'Cost', 'Profit', 'Margin']];
  scopeJobs.slice().sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost)).forEach(job => { const customer = data.customers.find(item => item.id === job.customerId); const service = data.services.find(item => item.id === job.serviceId); jobRows.push([job.number, customer?.company || customer?.name || 'Customer', service?.name ?? 'Service', job.status, Math.round(job.revenue), Math.round(job.cost), Math.round(job.revenue - job.cost), job.revenue ? `${Math.round((job.revenue - job.cost) / job.revenue * 100)}%` : '0%']); });
  const orders = data.laundry.filter(order => month === 'All months' || order.received.startsWith(month));
  const laundryRevenue = total(orders.map(order => order.total));
  const laundryCollected = total(orders.map(order => order.paid));
  const laundryRows: (string | number)[][] = [['Order', 'Customer', 'Status', 'Received', 'Total', 'Paid', 'Balance']];
  orders.forEach(order => { const customer = data.customers.find(item => item.id === order.customerId); laundryRows.push([order.number, customer?.name || 'Customer', order.status, order.received, Math.round(order.total), Math.round(order.paid), Math.round(order.total - order.paid)]); });
  const divisionRows: (string | number)[][] = [['Division', 'Services', 'Jobs', 'Revenue', 'Direct costs', 'Gross profit']];
  Array.from(new Set(data.services.map(service => service.division))).sort().forEach(division => { const ids = data.services.filter(service => service.division === division).map(service => service.id); const jobs = scopeJobs.filter(job => ids.includes(job.serviceId)); const costs = total(jobs.map(job => job.cost)); const earned = total(jobs.map(job => job.revenue)); divisionRows.push([division, ids.length, jobs.length, Math.round(earned), Math.round(costs), Math.round(earned - costs)]); });
  const exportReport = () => downloadCsv(`gabfix-${report.toLowerCase().replace(/[^a-z]+/g, '-')}`, report === 'Profit & loss' ? plRows : report === 'Job profitability' ? jobRows : laundryRows);
  return <><PageHeader eyebrow="Business intelligence" title="Reports that answer why" description="Every figure is calculated from your own records — pick a period to narrow it down." action={<Button variant="secondary" icon={<Download size={16} />} onClick={exportReport}>Export {report}</Button>}><SelectFilter label="Reporting period" value={month} options={months} onChange={setMonth} /></PageHeader><div className="report-cards">{[{ icon: <BarChart3 />, title: 'Profit & loss', description: 'Revenue, direct costs, and operating expenses.' }, { icon: <BriefcaseBusiness />, title: 'Job profitability', description: 'Find the work creating the best return.' }, { icon: <Droplets />, title: 'Laundry performance', description: 'Orders, collections, and balances.' }].map(card => <ReportCard key={card.title} icon={card.icon} title={card.title} description={card.description} selected={report === card.title} onClick={() => setReport(card.title)} />)}</div><div className="stat-row"><MiniStat label="Revenue" value={money(revenue)} tone="blue" /><MiniStat label="Direct costs" value={money(directCosts)} tone="amber" /><MiniStat label="Gross profit" value={money(grossProfit)} tone="green" /><MiniStat label="Net profit" value={money(netProfit)} tone={netProfit >= 0 ? 'blue' : 'rose'} /></div><div className="dashboard-grid lower-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">{scope}</span><h2>{report}</h2></div><button className="more-button" onClick={() => setView('finance')}>Open finance <ArrowUpRight size={14} /></button></div>{report === 'Profit & loss' && <div className="pl-list"><div><span>Revenue</span><strong className="positive">{money(revenue)}</strong></div><div><span>Direct costs</span><strong>{money(directCosts)}</strong></div><div><span>Gross profit</span><strong className="positive">{money(grossProfit)}</strong><small>{share(grossProfit)} of revenue</small></div><div><span>Operating expenses</span><strong>{money(operating)}</strong></div><div className="pl-total"><span>Net profit</span><strong>{money(netProfit)}</strong></div></div>}{report === 'Laundry performance' && <div className="pl-list"><div><span>Orders recorded</span><strong>{orders.length}</strong></div><div><span>Laundry revenue</span><strong className="positive">{money(laundryRevenue)}</strong></div><div><span>Collected</span><strong>{money(laundryCollected)}</strong></div><div className="pl-total"><span>Still to collect</span><strong>{money(laundryRevenue - laundryCollected)}</strong></div></div>}{report === 'Job profitability' && <CsvTable rows={jobRows} filename="gabfix-job-profitability" />}</section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Where money comes from</span><h2>Revenue by division</h2></div><button className="more-button" onClick={() => setView('dashboard')}>Dashboard <ArrowUpRight size={14} /></button></div><RankedList rows={divisionRows.slice(1).map(row => ({ label: String(row[0]), value: Number(row[5]) }))} /><CsvTable rows={divisionRows} filename="gabfix-division-performance" /></section></div></>;
}
function ReportCard({ icon, title, description, selected, onClick }: { icon: ReactNode; title: string; description: string; selected: boolean; onClick: () => void }) { return <button className={`report-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}><span>{icon}</span><strong>{title}</strong><p>{description}</p><ArrowUpRight size={16} /></button>; }
function SettingsView({ data, exportData, importData, resetData, setModal, profile, saveProfile }: { data: AppData; updateData: (data: AppData) => void; exportData: () => void; importData: () => void; resetData: () => void; notify: (message: string) => void; setModal: (modal: Modal) => void; profile: WorkspaceProfile; saveProfile: (next: WorkspaceProfile) => void }) {
  const [draft, setDraft] = useState<WorkspaceProfile>(profile);
  const [section, setSection] = useState('Company profile');
  const logoRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setDraft(profile); }, [profile]);
  const update = (key: keyof WorkspaceProfile, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const pickLogo = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => update('logo', String(reader.result)); reader.readAsDataURL(file); event.target.value = ''; };
  const divisions = Array.from(new Set(data.services.map(service => service.division))).sort();
  const divisionRevenue = (division: string) => { const ids = data.services.filter(service => service.division === division).map(service => service.id); return data.jobs.filter(job => ids.includes(job.serviceId)).reduce((sum, job) => sum + job.revenue, 0); };
  const sections: { label: string; count?: number }[] = [{ label: 'Company profile' }, { label: 'Services & pricing', count: data.services.length }, { label: 'Business divisions', count: divisions.length }, { label: 'Payment methods', count: data.invoices.length }, { label: 'Data & backup' }];
  const serviceRows: (string | number)[][] = [['Service', 'Division', 'Pricing method', 'Default price', 'Jobs', 'Revenue']];
  data.services.forEach(service => { const jobs = data.jobs.filter(job => job.serviceId === service.id); serviceRows.push([service.name, service.division, service.method, service.price, jobs.length, Math.round(jobs.reduce((sum, job) => sum + job.revenue, 0))]); });
  const divisionRows: (string | number)[][] = [['Division', 'Services', 'Revenue']];
  divisions.forEach(division => divisionRows.push([division, data.services.filter(service => service.division === division).length, Math.round(divisionRevenue(division))]));
  return <><PageHeader eyebrow="Workspace controls" title="Settings" description="Configure Gabfix for the way your business operates." action={<Button icon={<Plus size={17} />} onClick={() => setModal('service')}>Add service</Button>} /><div className="settings-layout"><aside className="settings-nav">{sections.map(item => <button key={item.label} className={section === item.label ? 'active' : ''} aria-pressed={section === item.label} onClick={() => setSection(item.label)}>{item.label}{item.count !== undefined && <b>{item.count}</b>}</button>)}</aside><div className="settings-content">{section === 'Company profile' && <section className="panel settings-card"><div className="settings-title">                <div className="company-logo"><img src={gabfixLogo} alt="Gabfix logo" /></div>
<div><h2>{draft.companyName}</h2><p>{draft.tagline} · workspace identity</p></div><button className="more-button" onClick={() => logoRef.current?.click()}>Change logo</button></div><input ref={logoRef} type="file" accept="image/*" className="hidden-input" onChange={pickLogo} /><div className="form-grid"><label>Company name<input value={draft.companyName} onChange={event => update('companyName', event.target.value)} /></label><label>Sidebar tagline<input value={draft.tagline} onChange={event => update('tagline', event.target.value)} /></label><label>Default currency<select value={draft.currency} onChange={event => update('currency', event.target.value)}><option value="UGX">UGX — Ugandan Shilling</option><option value="USD">USD — US Dollar</option><option value="KES">KES — Kenyan Shilling</option></select></label><label>Phone number<input value={draft.phone} onChange={event => update('phone', event.target.value)} /></label><label>Accounting basis<select value={draft.basis} onChange={event => update('basis', event.target.value)}><option>Cash basis</option><option>Accrual basis</option></select></label><label className="full">Business address<input value={draft.address} onChange={event => update('address', event.target.value)} /></label></div><div className="settings-footer"><span>Saved in this browser — your currency applies to every amount shown.</span><Button variant="secondary" onClick={() => saveProfile(draft)} icon={<Check size={16} />}>Save changes</Button></div></section>}{section === 'Services & pricing' && <section className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">Catalog</span><h2>Services &amp; pricing</h2><p>Every service you sell, with the work and revenue behind it.</p></div><Button variant="secondary" onClick={() => setModal('service')} icon={<Plus size={16} />}>Add service</Button></div><CsvTable rows={serviceRows} filename="gabfix-services" /></section>}{section === 'Business divisions' && <section className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">Structure</span><h2>Business divisions</h2><p>Divisions are created when a service is assigned to them.</p></div><Button variant="secondary" onClick={() => setModal('service')} icon={<Plus size={16} />}>Add service</Button></div><CsvTable rows={divisionRows} filename="gabfix-divisions" /></section>}{section === 'Payment methods' && <section className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">How you get paid</span><h2>Payment methods</h2><p>Gabfix tracks what is invoiced, what has been collected, and what is still owed.</p></div><FileText size={20} className="muted-icon" /></div><div className="stat-row"><MiniStat label="Invoices raised" value={String(data.invoices.length)} tone="blue" /><MiniStat label="Invoiced total" value={money(data.invoices.reduce((sum, invoice) => sum + invoice.total, 0))} tone="green" /><MiniStat label="Collected" value={money(data.invoices.reduce((sum, invoice) => sum + invoice.paid, 0))} tone="amber" /><MiniStat label="Still owed" value={money(data.invoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0))} tone="rose" /></div><CsvTable rows={[['Invoice', 'Customer', 'Issued', 'Due', 'Total', 'Paid', 'Balance', 'Status'], ...data.invoices.map(invoice => { const customer = data.customers.find(item => item.id === invoice.customerId); return [invoice.number, customer?.company || customer?.name || '', invoice.date, invoice.due, Math.round(invoice.total), Math.round(invoice.paid), Math.round(invoice.total - invoice.paid), invoice.status]; })]} filename="gabfix-payments" /></section>}{section === 'Data & backup' && <section className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">Data management</span><h2>Backup &amp; restore</h2><p>Keep a portable copy of your Gabfix workspace.</p></div><FileText size={20} className="muted-icon" /></div><div className="backup-actions"><button onClick={exportData}><Download size={17} /><span><strong>Export backup</strong><small>Download all records as JSON</small></span><ArrowUpRight size={15} /></button><button onClick={importData}><Upload size={17} /><span><strong>Import backup</strong><small>Restore a previous workspace</small></span><ArrowUpRight size={15} /></button><button onClick={resetData}><Activity size={17} /><span><strong>Reset demo data</strong><small>Restore the original example records</small></span><ArrowUpRight size={15} /></button></div></section>}<div className="future-note"><Sparkles size={18} /><div><strong>Built for your next stage</strong><p>Your records are stored in PostgreSQL and served through the Gabfix API — safe to share across your team and included in every backup.</p></div></div></div></div></>; }

function ModalShell({ type, data, close, notify, modalData, refresh }: { type: Modal; data: AppData; close: () => void; notify: (message: string) => void; modalData?: any; refresh: () => Promise<void> }) { const titles: Record<string, string> = { job: 'Create a new job', customer: 'Add a customer', expense: 'Record an expense', service: 'Add a service', equipment: 'Add equipment', 'equipment-update': 'Update equipment', inventory: 'Add a stock item', reorder: 'Record stock movement', 'job-status': 'Update job status' }; return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div className="modal"><div className="modal-header"><div><span className="eyebrow">Gabfix workspace</span><h2>{type ? titles[type] : ''}</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div>{type === 'job' && <JobForm data={data} close={close} notify={notify} refresh={refresh} />}{type === 'customer' && <CustomerForm close={close} notify={notify} refresh={refresh} />}{type === 'expense' && <ExpenseForm close={close} notify={notify} refresh={refresh} />}{type === 'service' && <ServiceForm close={close} notify={notify} refresh={refresh} />}{type === 'equipment' && <EquipmentForm close={close} notify={notify} refresh={refresh} />}{modalData && type === 'job-status' && <JobStatusModal job={modalData} data={data} close={close} notify={notify} refresh={refresh} />}{type === 'inventory' && <InventoryForm close={close} notify={notify} refresh={refresh} />}{modalData && type === 'equipment-update' && <EquipmentUpdateModal equipment={modalData} data={data} close={close} notify={notify} refresh={refresh} />}{modalData && type === 'reorder' && <StockMovementModal item={modalData} close={close} notify={notify} refresh={refresh} />}</div></div>; }
function JobForm({ data, close, notify, refresh }: { data: AppData; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) { const [form, setForm] = useState({ customerId: data.customers[0].id, serviceId: data.services[0].id, date: today, revenue: String(data.services[0].price), status: 'Scheduled' as JobStatus }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); (async () => { try { await api.createJob({ customerId: form.customerId, serviceId: form.serviceId, date: form.date, status: form.status, revenue: Number(form.revenue), cost: Math.round(Number(form.revenue) * .36), assignees: [] }); await refresh(); notify('Job created successfully'); } catch { notify('Could not create the job'); } close(); })(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label>Customer<select value={form.customerId} onChange={event => update('customerId', event.target.value)}>{data.customers.map(item => <option key={item.id} value={item.id}>{item.company || item.name}</option>)}</select></label><label>Service<select value={form.serviceId} onChange={event => { const service = data.services.find(item => item.id === event.target.value); update('serviceId', event.target.value); update('revenue', String(service?.price ?? 0)); }}>{data.services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Scheduled date<input type="date" value={form.date} onChange={event => update('date', event.target.value)} /></label><label>Estimated revenue<input type="number" min="0" value={form.revenue} onChange={event => update('revenue', event.target.value)} /></label><label>Status<select value={form.status} onChange={event => update('status', event.target.value)}><option>Scheduled</option><option>Quoted</option><option>In Progress</option><option>Completed</option></select></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Create job</Button></div></form>; }
function CustomerForm({ close, notify, refresh }: { close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) { const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', type: 'Residential' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name.trim() || !form.phone.trim()) return; (async () => { try { await api.createCustomer({ ...form, balance: 0, status: 'Active' }); await refresh(); notify('Customer added successfully'); } catch { notify('Could not add the customer'); } close(); })(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Full name<input required placeholder="e.g. Amina Nakato" value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Customer type<select value={form.type} onChange={event => update('type', event.target.value)}><option>Residential</option><option>Business</option><option>Corporate Client</option><option>Property Manager</option><option>Walk-in Customer</option></select></label><label>Company (optional)<input placeholder="Company name" value={form.company} onChange={event => update('company', event.target.value)} /></label><label>Phone number<input required placeholder="+256 ..." value={form.phone} onChange={event => update('phone', event.target.value)} /></label><label>Email address<input type="email" placeholder="name@example.com" value={form.email} onChange={event => update('email', event.target.value)} /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Save customer</Button></div></form>; }
function ExpenseForm({ close, notify, refresh }: { close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) { const [form, setForm] = useState({ category: 'Supplies', description: '', amount: '', division: 'Company overhead' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); if (!form.description.trim() || !form.amount) return; (async () => { try { await api.createExpense({ category: form.category, description: form.description, amount: Number(form.amount), division: form.division, date: today }); await refresh(); notify('Expense recorded'); } catch { notify('Could not record the expense'); } close(); })(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label>Amount<input required type="number" min="0" placeholder="0" value={form.amount} onChange={event => update('amount', event.target.value)} /></label><label>Category<select value={form.category} onChange={event => update('category', event.target.value)}><option>Supplies</option><option>Payroll</option><option>Fuel</option><option>Repairs</option><option>Rent</option><option>Utilities</option><option>Marketing</option><option>Other</option></select></label><label className="full">Description<input required placeholder="What was this expense for?" value={form.description} onChange={event => update('description', event.target.value)} /></label><label>Business division<select value={form.division} onChange={event => update('division', event.target.value)}><option>Company overhead</option><option>Cleaning Services</option><option>Home Solutions</option><option>Laundry</option><option>Vehicle Services</option></select></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Record expense</Button></div></form>; }
function ServiceForm({ close, notify, refresh }: { close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) { const [form, setForm] = useState({ name: '', division: 'Other Services', method: 'Fixed price', price: '' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; (async () => { try { await api.createService({ name: form.name, division: form.division, method: form.method, price: Number(form.price) || 0, active: true }); await refresh(); notify('Service added to your catalog'); } catch { notify('Could not add the service'); } close(); })(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Service name<input required placeholder="e.g. Generator installation" value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Business division<select value={form.division} onChange={event => update('division', event.target.value)}><option>Cleaning Services</option><option>Contract Cleaning</option><option>Home Solutions</option><option>Vehicle Services</option><option>Laundry</option><option>Other Services</option></select></label><label>Pricing method<select value={form.method} onChange={event => update('method', event.target.value)}><option>Fixed price</option><option>Per hour</option><option>Per item</option><option>Per kilogram</option><option>Per visit</option><option>Custom quotation</option></select></label><label>Default price<input type="number" min="0" value={form.price} onChange={event => update('price', event.target.value)} placeholder="0" /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Add service</Button></div></form>; }

function EquipmentForm({ close, notify, refresh }: { close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', serialNumber: '', type: 'Washing machine', value: '', bookValue: '' });
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.serialNumber.trim() || !form.value) return;
    (async () => {
      try {
        await api.createEquipment({
          name: form.name,
          serialNumber: form.serialNumber,
          type: form.type,
          value: Number(form.value),
          bookValue: Number(form.bookValue) || Number(form.value),
        });
        await refresh();
        notify('Equipment added successfully');
      } catch {
        notify('Could not add the equipment');
      }
      close();
    })();
  };

  return (
    <form onSubmit={submit} className="modal-form">
      <div className="form-grid">
        <label className="full">Equipment name<input required placeholder="e.g. Karcher Pressure Washer" value={form.name} onChange={event => update('name', event.target.value)} /></label>
        <label className="full">Serial number<input required placeholder="Unique identifier for tracking" value={form.serialNumber} onChange={event => update('serialNumber', event.target.value)} /></label>
        <label>Equipment type<select value={form.type} onChange={event => update('type', event.target.value)}><option>Washing machine</option><option>Dryer</option><option>Vehicle</option><option>Pressure washer</option><option>Ironing machine</option></select></label>
        <label>Purchase value (UGX)<input type="number" min="0" required value={form.value} onChange={event => update('value', event.target.value)} placeholder="0" /></label>
        <label>Current book value (UGX)<input type="number" min="0" value={form.bookValue} onChange={event => update('bookValue', event.target.value)} placeholder="Same as purchase value" /></label>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button icon={<Check size={16} />}>Add equipment</Button>
      </div>
    </form>
  );
}

function InventoryForm({ close, notify, refresh }: { close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', category: 'Supplies', unit: 'unit', quantity: '', minimum: '', cost: '' });
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.quantity) return;
    (async () => {
      try {
        await api.createInventory({ name: form.name, category: form.category, unit: form.unit || 'unit', quantity: Number(form.quantity), minimum: Number(form.minimum), cost: Number(form.cost) });
        await refresh();
        notify('Stock item added to your inventory');
      } catch { notify('Could not add the stock item'); }
      close();
    })();
  };
  return (<form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Item name<input required placeholder="e.g. Laundry detergent" value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Category<select value={form.category} onChange={event => update('category', event.target.value)}><option>Supplies</option><option>Equipment parts</option><option>Materials</option><option>Office</option><option>Other</option></select></label><label>Unit<select value={form.unit} onChange={event => update('unit', event.target.value)}><option>unit</option><option>kg</option><option>liter</option><option>pack</option><option>box</option></select></label><label>Quantity<input required type="number" min="0" value={form.quantity} onChange={event => update('quantity', event.target.value)} placeholder="On hand" /></label><label>Minimum level<input type="number" min="0" value={form.minimum} onChange={event => update('minimum', event.target.value)} placeholder="Reorder point" /></label><label>Cost per unit (UGX)<input type="number" min="0" value={form.cost} onChange={event => update('cost', event.target.value)} placeholder="0" /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Add to inventory</Button></div></form>);
}

function StockMovementModal({ item, close, notify, refresh }: { item: InventoryItem; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ change: '', note: '' });
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const delta = Number(form.change);
  const next = item.quantity + delta;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isNaN(delta) || delta === 0 || next < 0) return;
    (async () => {
      try {
        await api.updateInventory(item.id, { quantity: next });
        await refresh();
        notify(delta > 0 ? `+${delta} ${item.unit} added to ${item.name}` : `${Math.abs(delta)} ${item.unit} removed from ${item.name}`);
      } catch { notify('Could not record the stock movement'); }
      close();
    })();
  };
  return (<form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Item<strong>{item.name}</strong><small>{item.id.toUpperCase()} · {item.unit}</small></label><label>Adjustment<input type="number" min={-item.quantity} value={form.change} onChange={event => update('change', event.target.value)} placeholder={`e.g. -${item.minimum}`} aria-label="Quantity change (+/-) for this item" />{next >= 0 ? <small>New total: <strong>{next} {item.unit}</strong></small> : <small className="error-text">Not enough stock on hand</small>}</label><label className="full">Note<input placeholder="e.g. Restocked from supplier" value={form.note} onChange={event => update('note', event.target.value)} /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />} disabled={isNaN(delta) || delta === 0 || next < 0}>Save movement</Button></div></form>);
}

function EquipmentUpdateModal({ equipment, data, close, notify, refresh }: { equipment: Equipment; data: AppData; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ bookValue: String(equipment.bookValue), condition: equipment.condition, usage: String(equipment.usage), nextMaintenance: equipment.nextMaintenance });
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    (async () => {
      try {
        await api.updateEquipment(equipment.id, { bookValue: Number(form.bookValue), condition: form.condition, usage: Number(form.usage), nextMaintenance: form.nextMaintenance });
        await refresh();
        notify('Equipment record updated');
      } catch { notify('Could not update the equipment'); }
      close();
    })();
  };
    return (<form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Asset<strong>{equipment.name}</strong><small>SN: {equipment.serialNumber} · {equipment.type}</small></label><label>Book value (UGX)<input type="number" min="0" value={form.bookValue} onChange={event => update('bookValue', event.target.value)} /></label><label>Condition<select value={form.condition} onChange={event => update('condition', event.target.value)}><option>Good</option><option>Fair</option><option>Poor</option><option>Out of service</option></select></label><label>Usage (hours)<input type="number" min="0" value={form.usage} onChange={event => update('usage', event.target.value)} /></label><label>Service due<input type="date" value={form.nextMaintenance} onChange={event => update('nextMaintenance', event.target.value)} /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Save changes</Button></div></form>);
}

export default App;


