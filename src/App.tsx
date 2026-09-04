import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Download, Droplets, FileText, Filter, Gauge, LayoutDashboard, Menu, Package, Plus, Search, Settings, Sparkles, Upload, Users, Wrench, X,
} from 'lucide-react';
import gabfixLogo from './assets/gabfix-logo.png';

type View = 'dashboard' | 'jobs' | 'customers' | 'finance' | 'laundry' | 'equipment' | 'inventory' | 'reports' | 'settings';
type Modal = 'job' | 'laundry' | 'customer' | 'expense' | 'service' | 'equipment' | 'job-status' | null;
type JobStatus = 'Completed' | 'In Progress' | 'Scheduled' | 'Quoted';

type Customer = { id: string; name: string; company: string; type: string; phone: string; email: string; balance: number; status: string };
type Service = { id: string; name: string; division: string; method: string; price: number; active: boolean };
type Job = { id: string; number: string; customerId: string; serviceId: string; date: string; status: JobStatus; revenue: number; cost: number; assignees: string[]; equipmentUsage?: { equipmentId: string; hours: number }[] };
type Invoice = { id: string; number: string; customerId: string; date: string; due: string; total: number; paid: number; status: string };
type Expense = { id: string; category: string; description: string; amount: number; date: string; division: string };
type LaundryOrder = { id: string; number: string; customerId: string; status: string; total: number; paid: number; items: string; received: string };
type Equipment = { id: string; name: string; serialNumber: string; type: string; value: number; bookValue: number; condition: string; nextMaintenance: string; usage: number };
type InventoryItem = { id: string; name: string; category: string; unit: string; quantity: number; minimum: number; cost: number };
type AppData = { customers: Customer[]; services: Service[]; jobs: Job[]; invoices: Invoice[]; expenses: Expense[]; laundry: LaundryOrder[]; equipment: Equipment[]; inventory: InventoryItem[] };

const money = (value: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(value).replace('USh', 'UGX');
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

const seedData: AppData = {
  customers: [
    { id: 'c1', name: 'Sarah Namuli', company: '', type: 'Residential', phone: '+256 772 441 208', email: 'sarah@example.com', balance: 0, status: 'Active' },
    { id: 'c2', name: 'ABC Offices Ltd', company: 'ABC Offices Ltd', type: 'Corporate Client', phone: '+256 701 820 445', email: 'admin@abcoffices.ug', balance: 1250000, status: 'Active' },
    { id: 'c3', name: 'Mirembe Properties', company: 'Mirembe Properties', type: 'Property Manager', phone: '+256 759 114 801', email: 'hello@mirembe.ug', balance: 760000, status: 'Active' },
    { id: 'c4', name: 'David Kato', company: '', type: 'Residential', phone: '+256 788 210 117', email: 'david@example.com', balance: 0, status: 'Active' },
    { id: 'c5', name: 'Greenfield Academy', company: 'Greenfield Academy', type: 'Institution', phone: '+256 704 556 233', email: 'finance@greenfield.ug', balance: 2180000, status: 'Active' },
    { id: 'c6', name: 'Nakasero Apartments', company: 'Nakasero Apartments', type: 'Corporate Client', phone: '+256 778 100 440', email: 'manager@nakasero.ug', balance: 0, status: 'Active' },
    { id: 'c7', name: 'James Okello', company: '', type: 'Walk-in Customer', phone: '+256 753 993 200', email: 'james@example.com', balance: 85000, status: 'Active' },
    { id: 'c8', name: 'Lakeside Restaurant', company: 'Lakeside Restaurant', type: 'Business', phone: '+256 700 002 341', email: 'accounts@lakeside.ug', balance: 430000, status: 'Active' },
  ],
  services: [
    { id: 's1', name: 'House Cleaning', division: 'Cleaning Services', method: 'Fixed price', price: 180000, active: true },
    { id: 's2', name: 'Deep Cleaning', division: 'Cleaning Services', method: 'Fixed price', price: 420000, active: true },
    { id: 's3', name: 'Office Cleaning Contract', division: 'Contract Cleaning', method: 'Per visit', price: 650000, active: true },
    { id: 's4', name: 'Car Detailing', division: 'Vehicle Services', method: 'Per vehicle', price: 220000, active: true },
    { id: 's5', name: 'Electrical Repair', division: 'Home Solutions', method: 'Per hour', price: 120000, active: true },
    { id: 's6', name: 'Plumbing', division: 'Home Solutions', method: 'Custom quotation', price: 250000, active: true },
    { id: 's7', name: 'AC Cleaning', division: 'Home Solutions', method: 'Per machine', price: 150000, active: true },
    { id: 's8', name: 'Laundry per KG', division: 'Laundry', method: 'Per kilogram', price: 5000, active: true },
    { id: 's9', name: 'Laundry per Item', division: 'Laundry', method: 'Per item', price: 3000, active: true },
    { id: 's10', name: 'Ironing', division: 'Laundry', method: 'Per item', price: 1000, active: true },
    { id: 's11', name: 'Carpet Cleaning', division: 'Cleaning Services', method: 'Per square meter', price: 12000, active: true },
    { id: 's12', name: 'Post Construction Cleaning', division: 'Cleaning Services', method: 'Custom quotation', price: 800000, active: true },
  ],
  jobs: [
    { id: 'j1', number: 'JOB-00142', customerId: 'c2', serviceId: 's3', date: '2026-09-03', status: 'In Progress', revenue: 650000, cost: 280000, assignees: ['Moses K.', 'Agnes N.'] },
    { id: 'j2', number: 'JOB-00141', customerId: 'c1', serviceId: 's2', date: '2026-09-03', status: 'Completed', revenue: 420000, cost: 135000, assignees: ['Sarah A.'] },
    { id: 'j3', number: 'JOB-00140', customerId: 'c5', serviceId: 's7', date: '2026-09-02', status: 'Scheduled', revenue: 450000, cost: 95000, assignees: ['John O.'] },
    { id: 'j4', number: 'JOB-00139', customerId: 'c4', serviceId: 's4', date: '2026-09-02', status: 'Completed', revenue: 220000, cost: 70000, assignees: ['Peter L.'] },
    { id: 'j5', number: 'JOB-00138', customerId: 'c3', serviceId: 's5', date: '2026-09-01', status: 'Completed', revenue: 540000, cost: 260000, assignees: ['David T.'] },
    { id: 'j6', number: 'JOB-00137', customerId: 'c8', serviceId: 's6', date: '2026-08-31', status: 'Quoted', revenue: 780000, cost: 320000, assignees: [] },
  ],
  invoices: [
    { id: 'i1', number: 'INV-00098', customerId: 'c2', date: '2026-08-30', due: '2026-09-06', total: 3250000, paid: 2000000, status: 'Partially Paid' },
    { id: 'i2', number: 'INV-00097', customerId: 'c5', date: '2026-08-18', due: '2026-09-01', total: 2180000, paid: 0, status: 'Overdue' },
    { id: 'i3', number: 'INV-00096', customerId: 'c3', date: '2026-08-28', due: '2026-09-11', total: 1760000, paid: 1000000, status: 'Partially Paid' },
    { id: 'i4', number: 'INV-00095', customerId: 'c1', date: '2026-08-26', due: '2026-08-30', total: 420000, paid: 420000, status: 'Paid' },
    { id: 'i5', number: 'INV-00094', customerId: 'c4', date: '2026-08-25', due: '2026-08-25', total: 220000, paid: 220000, status: 'Paid' },
  ],
  expenses: [
    { id: 'e1', category: 'Payroll', description: 'August field team payroll', amount: 4800000, date: '2026-08-30', division: 'Company overhead' },
    { id: 'e2', category: 'Supplies', description: 'Cleaning chemicals & PPE', amount: 1120000, date: '2026-09-01', division: 'Cleaning Services' },
    { id: 'e3', category: 'Fuel', description: 'Field vehicles fuel', amount: 680000, date: '2026-09-02', division: 'Company overhead' },
    { id: 'e4', category: 'Repairs', description: 'Washer drain pump replacement', amount: 350000, date: '2026-08-29', division: 'Laundry' },
    { id: 'e5', category: 'Rent', description: 'September workspace rent', amount: 1800000, date: '2026-09-01', division: 'Company overhead' },
    { id: 'e6', category: 'Utilities', description: 'Water and electricity', amount: 940000, date: '2026-08-28', division: 'Laundry' },
  ],
  laundry: [
    { id: 'l1', number: 'LDY-00216', customerId: 'c7', status: 'Ready', total: 85000, paid: 50000, items: '10kg wash + iron', received: '2026-09-03' },
    { id: 'l2', number: 'LDY-00215', customerId: 'c1', status: 'Washing', total: 125000, paid: 125000, items: 'Blankets, shirts, duvet', received: '2026-09-02' },
    { id: 'l3', number: 'LDY-00214', customerId: 'c4', status: 'Collected', total: 64000, paid: 64000, items: '16kg wash', received: '2026-09-01' },
    { id: 'l4', number: 'LDY-00213', customerId: 'c6', status: 'Drying', total: 210000, paid: 0, items: 'Hotel linen bundle', received: '2026-09-03' },
  ],
  equipment: [
    { id: 'a1', name: 'Industrial Washer WM-003', serialNumber: 'WM-2021-001', type: 'Washing machine', value: 10000000, bookValue: 8500000, condition: 'Good', nextMaintenance: '2026-09-10', usage: 384 },
    { id: 'a2', name: 'Commercial Dryer DR-002', serialNumber: 'DR-2022-014', type: 'Dryer', value: 7600000, bookValue: 6200000, condition: 'Good', nextMaintenance: '2026-09-18', usage: 292 },
    { id: 'a3', name: 'Toyota Hiace UBD 442K', serialNumber: 'UBD-442K', type: 'Vehicle', value: 48000000, bookValue: 35600000, condition: 'Good', nextMaintenance: '2026-09-06', usage: 12840 },
    { id: 'a4', name: 'Karcher Pressure Washer', serialNumber: 'KPW-339-X', type: 'Pressure washer', value: 4200000, bookValue: 3400000, condition: 'Maintenance due', nextMaintenance: '2026-09-03', usage: 118 },
    { id: 'a5', name: 'Industrial Ironing Press', serialNumber: 'IIP-880', type: 'Ironing machine', value: 5300000, bookValue: 4900000, condition: 'Good', nextMaintenance: '2026-10-01', usage: 164 },
  ],
  inventory: [
    { id: 'inv1', name: 'Laundry detergent', category: 'Laundry supplies', unit: 'kg', quantity: 18, minimum: 25, cost: 14500 },
    { id: 'inv2', name: 'Fabric softener', category: 'Laundry supplies', unit: 'litre', quantity: 42, minimum: 20, cost: 12000 },
    { id: 'inv3', name: 'Disinfectant', category: 'Cleaning supplies', unit: 'litre', quantity: 64, minimum: 30, cost: 8500 },
    { id: 'inv4', name: 'Microfiber cloths', category: 'Cleaning supplies', unit: 'pack', quantity: 11, minimum: 15, cost: 22000 },
    { id: 'inv5', name: 'Car shampoo', category: 'Detailing materials', unit: 'litre', quantity: 36, minimum: 12, cost: 18000 },
    { id: 'inv6', name: 'Plumbing fittings', category: 'Repair materials', unit: 'box', quantity: 8, minimum: 5, cost: 95000 },
  ],
};

const navGroups = [
  { label: 'Workspace', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ id: 'jobs', label: 'Jobs & contracts', icon: ClipboardList }, { id: 'customers', label: 'Customers', icon: Users }] },
  { label: 'Finance', items: [{ id: 'finance', label: 'Finance', icon: CircleDollarSign }] },
  { label: 'Laundry', items: [{ id: 'laundry', label: 'Laundry operations', icon: Droplets }] },
  { label: 'Assets & stock', items: [{ id: 'equipment', label: 'Equipment', icon: Wrench }, { id: 'inventory', label: 'Inventory', icon: Package }] },
  { label: 'Insight', items: [{ id: 'reports', label: 'Reports', icon: BarChart3 }] },
];

function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('gabfix-data');
    return saved ? JSON.parse(saved) as AppData : seedData;
  });
  const [view, setView] = useState<View>('dashboard');
  const [period, setPeriod] = useState('This month');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('gabfix-data', JSON.stringify(data)); }, [data]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); } }, [toast]);

  const periodStart = getStartDate(period);

  const periodJobs = data.jobs.filter(job => job.date >= periodStart);
  const periodExpenses = data.expenses.filter(expense => expense.date >= periodStart);
  const periodLaundry = data.laundry.filter(order => order.received >= periodStart);
  const periodInvoices = data.invoices.filter(inv => inv.date >= periodStart);

  const revenue = periodJobs.filter(job => job.status === 'Completed' || job.status === 'In Progress').reduce((sum, job) => sum + job.revenue, 0) + periodLaundry.reduce((sum, order) => sum + order.paid, 0);
  const expenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const activeJobs = periodJobs.filter(job => job.status !== 'Completed').length; void activeJobs;
  const receivables = periodInvoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);

  const updateData = (next: AppData) => setData(next);
  const notify = (message: string) => setToast(message);
  const exportData = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'gabfix-backup.json'; link.click(); URL.revokeObjectURL(url); notify('Backup downloaded'); };
  const importData = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { updateData(JSON.parse(String(reader.result)) as AppData); notify('Backup restored successfully'); } catch { notify('That backup could not be read'); } }; reader.readAsText(file); };
  const resetData = () => { if (window.confirm('Restore the original Gabfix demo data?')) { updateData(seedData); notify('Demo data restored'); } };

  const renderView = () => {
    const props = { data, updateData, notify, setModal, setModalData, query };
    if (view === 'dashboard') return <Dashboard data={data} period={period} setPeriod={setPeriod} revenue={revenue} expenses={expenses} receivables={receivables} activeJobs={activeJobs} setView={setView} setModal={setModal} setModalData={setModalData} />; void activeJobs;
    if (view === 'jobs') return <JobsView {...props} />;
    if (view === 'customers') return <CustomersView {...props} />;
    if (view === 'finance') return <FinanceView {...props} />;
    if (view === 'laundry') return <LaundryView {...props} />;
    if (view === 'equipment') return <EquipmentView {...props} />;
    if (view === 'inventory') return <InventoryView {...props} />;
    if (view === 'reports') return <ReportsView {...props} revenue={revenue} expenses={expenses} />;
    return <SettingsView data={data} updateData={updateData} exportData={exportData} importData={() => importRef.current?.click()} resetData={resetData} notify={notify} setModal={setModal} />;
  };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><img src={gabfixLogo} alt="Gabfix" /></div><div><strong>Gabfix</strong><span>Home Solutions</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      
      <nav>{navGroups.map(group => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(item => { const Icon = item.icon; const overdueInvoices = item.id === 'finance' ? data.invoices.filter(inv => inv.status === 'Overdue').length : 0; const maintenanceCount = item.id === 'equipment' ? data.equipment.filter(e => new Date(e.nextMaintenance) <= new Date()).length : 0; const badgeCount = overdueInvoices || maintenanceCount; return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id as View); setMobileOpen(false); }}><Icon size={17} /><span>{item.label}</span>{badgeCount > 0 && <span className="nav-badge">{badgeCount}</span>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><Sparkles size={18} /><div><strong>Owner workspace</strong><span>Everything is up to date</span></div></div><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><Settings size={17} /><span>Settings</span></button><div className="user-chip"><div className="avatar">GN</div><div><strong>Gabriel N.</strong><span>Owner account</span></div><ChevronDown size={14} /></div></div>
    </aside>
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className="main-content">
      <header className="topbar"><button className="menu-trigger" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="topbar-context"><strong>{view === 'dashboard' ? 'Here is your business at a glance.' : navGroups.flatMap(group => group.items).find(item => item.id === view)?.label ?? 'Settings'}</strong></div><div className="topbar-actions"><div className="global-search"><Search size={17} /><input placeholder="Search anything..." value={query} onChange={event => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div><button className="icon-button notification"><Bell size={18} /><i /></button><button className="profile-button"><div className="avatar small">GN</div><ChevronDown size={14} /></button></div></header>
      <div className="page-content" key={view}><div className="page-enter">{renderView()}</div></div>
    </main>
    {modal && <ModalShell type={modal} data={data} updateData={updateData} close={() => { setModal(null); setModalData(null); }} notify={notify} modalData={modalData} />}
    <input ref={importRef} type="file" accept="application/json" onChange={importData} className="hidden-input" />
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>;
}

function PageHeader({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; children?: ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="header-actions">{children}{action}</div></div>; }
function Button({ children, onClick, variant = 'primary', icon }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; icon?: ReactNode }) { return <button className={`button ${variant}`} onClick={onClick}>{icon}{children}</button>; }
function StatusBadge({ value }: { value: string }) { const v = value.toLowerCase(); const tone = v.includes('partially') ? 'warning' : (v.includes('paid') && !v.includes('unpaid')) || value === 'Completed' || value === 'Ready' || value === 'Good' ? 'success' : v.includes('overdue') || v.includes('due') || value === 'Cancelled' || v.includes('unpaid') ? 'danger' : value === 'In Progress' || value === 'Washing' || value === 'Drying' ? 'info' : 'warning'; return <span className={`status ${tone}`}><i />{value}</span>; }
function EmptyState({ title = 'Nothing here yet', description = 'Create a record to start building your workspace.' }: { title?: string; description?: string }) { return <div className="empty-state"><div className="empty-icon"><ClipboardList size={22} /></div><strong>{title}</strong><span>{description}</span></div>; }

function Dashboard({ data, period, setPeriod, revenue, expenses, receivables, setView, setModal, setModalData }: { data: AppData; period: string; setPeriod: (value: string) => void; revenue: number; expenses: number; receivables: number; activeJobs: number; setView: (view: View) => void; setModal: (modal: Modal) => void; setModalData: (data: any) => void }) {
  const profit = revenue - expenses;
  const revenueByDivision = data.services.map(service => ({ name: service.division, value: data.jobs.filter(job => job.serviceId === service.id).reduce((sum, job) => sum + job.revenue, 0) })).reduce<{ name: string; value: number }[]>((acc, item) => { const found = acc.find(entry => entry.name === item.name); if (found) found.value += item.value; else acc.push(item); return acc; }, []).sort((a, b) => b.value - a.value);
  const maxDivision = Math.max(...revenueByDivision.map(item => item.value), 1);
  const monthBars = [55, 62, 48, 72, 65, 80, 67, 86, 74, 93, 82, 96];
  return <>
    <PageHeader eyebrow="Business overview" title="Good morning, Gabriel" description={`${period} performance across your business.`} action={<Button icon={<Plus size={17} />} onClick={() => setModal('job')}>New job</Button>}><div className="period-select"><CalendarDays size={15} /><select value={period} onChange={event => setPeriod(event.target.value)}><option>This day</option><option>This week</option><option>This month</option><option>This quarter</option><option>This year</option></select><ChevronDown size={14} /></div></PageHeader>
    <div className="quick-actions"><QuickAction icon={<ClipboardList />} label="New job" onClick={() => setModal('job')} /><QuickAction icon={<Users />} label="Add customer" onClick={() => setModal('customer')} /><QuickAction icon={<CircleDollarSign />} label="Record expense" onClick={() => setModal('expense')} /><QuickAction icon={<Droplets />} label="Laundry order" onClick={() => setView('laundry')} /><QuickAction icon={<Wrench />} label="Maintenance" onClick={() => setView('equipment')} /></div>
    <div className="kpi-grid"><KpiCard label="Total revenue" value={money(revenue)} trend="12.8%" detail="vs last month" icon={<ArrowUpRight />} tone="green" /><KpiCard label="Total expenses" value={money(expenses)} trend="4.6%" detail="vs last month" icon={<ArrowDownRight />} tone="amber" down /><KpiCard label="Net profit" value={money(profit)} trend="18.2%" detail="healthy margin" icon={<Activity />} tone="blue" /><KpiCard label="Accounts receivable" value={money(receivables)} trend="8 invoices" detail="awaiting payment" icon={<Clock3 />} tone="rose" /></div>
    <div className="dashboard-grid"><section className="panel revenue-panel"><div className="panel-heading"><div><span className="eyebrow">Performance</span><h2>Revenue overview</h2></div><div className="legend"><span><i className="legend-dot revenue" />Revenue</span><span><i className="legend-dot expense" />Expenses</span></div></div><div className="chart-summary"><strong>{money(revenue)}</strong><span><b>+12.8%</b> from previous period</span></div><div className="bar-chart">{monthBars.map((height, index) => <div className="bar-group" key={index}><div className="bar-pair"><i className="bar revenue-bar" style={{ height: `${height}%` }} /><i className="bar expense-bar" style={{ height: `${Math.max(22, height * .57)}%` }} /></div><span>{['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][index]}</span></div>)}</div></section><section className="panel division-panel"><div className="panel-heading"><div><span className="eyebrow">Where money comes from</span><h2>Revenue by division</h2></div><button className="more-button" onClick={() => setView('reports')}>View report</button></div><div className="division-list">{revenueByDivision.slice(0, 5).map((item, index) => <div className="division-row" key={item.name}><div className="division-label"><span className={`division-icon d${index}`}><BriefcaseBusiness size={15} /></span><strong>{item.name}</strong><span>{money(item.value)}</span></div><div className="progress"><i style={{ width: `${Math.max(7, item.value / maxDivision * 100)}%` }} /></div></div>)}</div></section></div>
    <div className="dashboard-grid lower-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Live activity</span><h2>Recent jobs</h2></div><button className="more-button" onClick={() => setView('jobs')}>See all jobs <ArrowUpRight size={14} /></button></div><JobTable jobs={data.jobs.slice(0, 4)} data={data} compact setModal={setModal} setModalData={setModalData} /></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Needs attention</span><h2>Business alerts</h2></div><Bell size={17} className="muted-icon" /></div><div className="alert-list"><AlertRow icon={<Clock3 />} title="3 invoices are overdue" detail={`${money(receivables)} outstanding`} tone="rose" onClick={() => setView('finance')} /><AlertRow icon={<Wrench />} title="Maintenance due today" detail="Karcher Pressure Washer" tone="amber" onClick={() => setView('equipment')} /><AlertRow icon={<Package />} title="2 items running low" detail="Laundry detergent, microfiber cloths" tone="blue" onClick={() => setView('inventory')} /><AlertRow icon={<Droplets />} title="Laundry order ready" detail="LDY-00216 · James Okello" tone="green" onClick={() => setView('laundry')} /></div></section></div>
    <div className="metric-strip"><div><span>Jobs this month</span><strong>{data.jobs.length}</strong><small><ArrowUpRight size={13} /> 16% vs August</small></div><div><span>Active contracts</span><strong>8</strong><small><Check size={13} /> 2 renew this month</small></div><div><span>Laundry orders</span><strong>{data.laundry.length}</strong><small><ArrowUpRight size={13} /> 24% vs August</small></div><div><span>Equipment value</span><strong>{money(data.equipment.reduce((sum, item) => sum + item.bookValue, 0))}</strong><small><Gauge size={13} /> 92% in service</small></div></div>
  </>;
}
function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button className="quick-action" onClick={onClick}>{icon}<span>{label}</span><Plus size={14} /></button>; }
function KpiCard({ label, value, trend, detail, icon, tone, down }: { label: string; value: string; trend: string; detail: string; icon: ReactNode; tone: string; down?: boolean }) { return <div className={`kpi-card ${tone}`}><div className="kpi-top"><span>{label}</span><div className="kpi-icon">{icon}</div></div><strong>{value}</strong><div className={`kpi-trend ${down ? 'negative' : ''}`}><span>{trend}</span><small>{detail}</small></div></div>; }
function AlertRow({ icon, title, detail, tone, onClick }: { icon: ReactNode; title: string; detail: string; tone: string; onClick: () => void }) { return <button className="alert-row" onClick={onClick}><span className={`alert-icon ${tone}`}>{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={15} /></button>; }

function JobStatusModal({ job, data, updateData, close, notify }: { job: Job; data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) {
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

    updateData({ ...data, jobs: updatedJobs, equipment: updatedEquipment });
    close();
    notify(`Job ${job.number} updated to ${status}`);
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
    return data.jobs.filter(job => status === 'All' ? true : job.status === status).length;
  };

  return <><PageHeader eyebrow="Operations" title="Jobs & contracts" description="Track delivery, job costing, and the work that moves Gabfix forward." action={<Button icon={<Plus size={17} />} onClick={() => setModal('job')}>New job</Button>}></PageHeader><div className="stat-row"><MiniStat label="Open jobs" value={String(data.jobs.filter(job => job.status !== 'Completed').length)} tone="blue" /><MiniStat label="Completed this month" value={String(data.jobs.filter(job => job.status === 'Completed').length)} tone="green" /><MiniStat label="Quoted value" value={money(data.jobs.filter(job => job.status === 'Quoted').reduce((sum, job) => sum + job.revenue, 0))} tone="amber" /><MiniStat label="Average margin" value="48.6%" tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All jobs <b>{getCount('All')}</b></button><button className={statusFilter === 'Scheduled' ? 'selected' : ''} onClick={() => setStatusFilter('Scheduled')}>Scheduled <b>{getCount('Scheduled')}</b></button><button className={statusFilter === 'In Progress' ? 'selected' : ''} onClick={() => setStatusFilter('In Progress')}>In Progress <b>{getCount('In Progress')}</b></button><button className={statusFilter === 'Completed' ? 'selected' : ''} onClick={() => setStatusFilter('Completed')}>Completed <b>{getCount('Completed')}</b></button><button className={statusFilter === 'Quoted' ? 'selected' : ''} onClick={() => setStatusFilter('Quoted')}>Quoted <b>{getCount('Quoted')}</b></button></div><div className="filter-group"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="payment-filter"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option></select><button className="icon-button"><Filter size={16} /></button></div></div><JobTable jobs={filtered} data={data} setModal={setModal} setModalData={setModalData} /></section></>; }
function getPaymentStatus(job: Job, data: AppData) {
  const customerInvoices = data.invoices.filter(inv => inv.customerId === job.customerId);
  const totalDue = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.paid, 0);

  if (totalDue === 0) return 'Unpaid';
  if (totalPaid >= totalDue) return 'Paid';
  const balance = totalDue - totalPaid;
  return `Partial (${money(balance)} pending)`;
}

function JobTable({ jobs, data, setModal, setModalData }: { jobs: Job[]; data: AppData; compact?: boolean; setModal?: (modal: Modal) => void; setModalData?: (data: any) => void }) { return <div className="table-wrap"><table><thead><tr><th>Job</th><th>Status</th><th>Customer</th><th>Service</th><th>Revenue</th><th>Payment Status</th>{setModal && <th>Action</th>}</tr></thead><tbody>{jobs.length ? jobs.map(job => { const customer = data.customers.find(item => item.id === job.customerId); const service = data.services.find(item => item.id === job.serviceId); const paymentStatus = getPaymentStatus(job, data); return <tr key={job.id}><td><strong className="linkish">{job.number}</strong><small>{job.date}</small></td><td><StatusBadge value={job.status} /></td><td><strong>{customer?.company || customer?.name}</strong><small>{customer?.type}</small></td><td>{service?.name}<small>{service?.division}</small></td><td><strong>{money(job.revenue)}</strong><small className="profit-text">{Math.round((job.revenue - job.cost) / job.revenue * 100)}% margin</small></td><td><StatusBadge value={paymentStatus} /></td>{setModal && <td><button className="more-button" onClick={() => { setModal('job-status'); setModalData(job); }}>Update</button></td>}</tr>; }) : <tr><td colSpan={7}><EmptyState title="No jobs match" /></td></tr>}</tbody></table></div>; }
function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }
function FilterButton({ label }: { label: string }) { return <button className="filter-button"><Filter size={15} />{label}<ChevronDown size={14} /></button>; }

function CustomersView({ data, setModal, query }: { data: AppData; setModal: (modal: Modal) => void; query: string }) { const customers = data.customers.filter(item => `${item.name} ${item.company} ${item.email}`.toLowerCase().includes(query.toLowerCase())); return <><PageHeader eyebrow="Relationships" title="Customers" description="A clear view of every relationship, balance, and service history." action={<Button icon={<Plus size={17} />} onClick={() => setModal('customer')}>Add customer</Button>}><div className="inline-search"><Search size={16} /><input placeholder="Filter customers" /></div></PageHeader><div className="stat-row"><MiniStat label="Total customers" value={String(data.customers.length)} tone="blue" /><MiniStat label="Active this month" value="24" tone="green" /><MiniStat label="Customer balance" value={money(data.customers.reduce((sum, item) => sum + item.balance, 0))} tone="amber" /><MiniStat label="Repeat rate" value="72%" tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div><h2 className="table-title">All customers</h2><span className="table-caption">Your customer directory and account status</span></div><button className="more-button"><Download size={14} /> Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Type</th><th>Contact</th><th>Jobs</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td><div className="person-cell"><div className="avatar colored">{customer.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div><span><strong>{customer.company || customer.name}</strong><small>{customer.company ? customer.name : 'Individual customer'}</small></span></div></td><td>{customer.type}</td><td><strong>{customer.phone}</strong><small>{customer.email}</small></td><td>{data.jobs.filter(job => job.customerId === customer.id).length + data.laundry.filter(order => order.customerId === customer.id).length}</td><td><strong className={customer.balance ? 'balance-text' : ''}>{money(customer.balance)}</strong></td><td><StatusBadge value={customer.status} /></td></tr>)}</tbody></table></div></section></>; }

function LaundryTable({ orders, data }: { orders: LaundryOrder[]; data: AppData }) {
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Customer</th><th>Items & service</th><th>Received</th><th>Total</th><th>Payment Status</th></tr></thead><tbody>{orders.length ? orders.map(order => {
    const paymentStatus = getLaundryPaymentStatus(order);
    return <tr key={order.id}><td><strong className="linkish">{order.number}</strong><small>{order.received}</small></td><td><StatusBadge value={order.status} /></td><td><strong>{data.customers.find(customer => customer.id === order.customerId)?.name}</strong><small>{data.customers.find(customer => customer.id === order.customerId)?.type}</small></td><td><strong>{order.items}</strong><small>Machine wash & finish</small></td><td>{order.received}</td><td><strong>{money(order.total)}</strong><small className="profit-text">{order.total - order.paid ? `${money(order.total - order.paid)} balance` : 'Paid in full'}</small></td><td><StatusBadge value={paymentStatus} /></td></tr>;
  }) : <tr><td colSpan={7}><EmptyState title="No orders match" /></td></tr>}</tbody></table></div>;
}

function FinanceView({ data, setModal }: { data: AppData; setModal: (modal: Modal) => void }) { const outstanding = data.invoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0); return <><PageHeader eyebrow="Finance" title="Money in, money out" description="Track your financial health without losing the operational context." action={<Button icon={<Plus size={17} />} onClick={() => setModal('expense')}>Record expense</Button>}><FilterButton label="September 2026" /></PageHeader><div className="finance-hero"><div><span className="eyebrow">Cash basis · September 2026</span><h2>{money(17480000)}</h2><p>Available cash balance <span className="positive">+14.2%</span> vs last month</p></div><div className="cash-bars"><span style={{ height: '42%' }} /><span style={{ height: '55%' }} /><span style={{ height: '48%' }} /><span style={{ height: '71%' }} /><span style={{ height: '62%' }} /><span style={{ height: '88%' }} /><span style={{ height: '78%' }} /><span style={{ height: '96%' }} /></div></div><div className="stat-row"><MiniStat label="Revenue received" value={money(8980000)} tone="green" /><MiniStat label="Expenses paid" value={money(4720000)} tone="amber" /><MiniStat label="Receivables" value={money(outstanding)} tone="rose" /><MiniStat label="Invoices this month" value="16" tone="blue" /></div><div className="dashboard-grid lower-grid"><section className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">Accounts receivable</span><h2>Outstanding invoices</h2></div><button className="more-button">View aging report</button></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>{data.invoices.map(invoice => <tr key={invoice.id}><td><strong className="linkish">{invoice.number}</strong><small>{invoice.date}</small></td><td>{data.customers.find(customer => customer.id === invoice.customerId)?.company || data.customers.find(customer => customer.id === invoice.customerId)?.name}</td><td>{invoice.due}</td><td>{money(invoice.total)}</td><td><strong>{money(invoice.total - invoice.paid)}</strong></td><td><StatusBadge value={invoice.status} /></td></tr>)}</tbody></table></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Expense control</span><h2>Recent expenses</h2></div><button className="more-button" onClick={() => setModal('expense')}>Add</button></div><div className="expense-list">{data.expenses.slice(0, 5).map(expense => <div className="expense-row" key={expense.id}><span className="expense-icon"><CircleDollarSign size={16} /></span><span><strong>{expense.category}</strong><small>{expense.description}</small></span><strong>{money(expense.amount)}</strong></div>)}</div></section></div></>; }

function getLaundryPaymentStatus(order: LaundryOrder) {
  if (order.paid >= order.total) return 'Paid';
  if (order.paid === 0) return 'Unpaid';
  const balance = order.total - order.paid;
  return `Partial (${money(balance)} pending)`;
}

function LaundryView({ data, setModal, query }: { data: AppData; setModal: (modal: Modal) => void; query: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const revenue = data.laundry.reduce((sum, order) => sum + order.total, 0);

  const filtered = data.laundry.filter(order => {
    if (!`${order.number} ${data.customers.find(c => c.id === order.customerId)?.name}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter !== 'All' && order.status !== statusFilter) return false;

    const pStatus = getLaundryPaymentStatus(order);
    if (paymentFilter !== 'All') {
      if (paymentFilter === 'Paid' && !pStatus.startsWith('Paid')) return false;
      if (paymentFilter === 'Unpaid' && pStatus !== 'Unpaid') return false;
      if (paymentFilter === 'Partial' && !pStatus.startsWith('Partial')) return false;
    }
    return true;
  });

  const getCount = (status: string) => {
    return data.laundry.filter(order => status === 'All' || order.status === status).length;
  };

  return <><PageHeader eyebrow="Laundry division" title="Laundry operations" description="From drop-off to collection, keep every order and machine moving." action={<Button icon={<Plus size={17} />} onClick={() => setModal('laundry')}>New laundry order</Button>}></PageHeader><div className="laundry-hero"><div className="laundry-copy"><span className="eyebrow">September performance</span><h2>Clean work. Clear numbers.</h2><p>Your laundry division has processed <strong>{data.laundry.length + 38} orders</strong> this month with a <strong>41.8% gross margin</strong>.</p><div className="laundry-actions"><Button onClick={() => setModal('laundry')} icon={<Plus size={16} />}>New order</Button><Button variant="secondary" onClick={() => {}}>Machine usage</Button></div></div><div className="laundry-orbit"><Droplets size={42} /><span>82%</span><small>capacity used</small></div></div><div className="stat-row"><MiniStat label="Orders this month" value="42" tone="blue" /><MiniStat label="Laundry revenue" value={money(revenue + 1860000)} tone="green" /><MiniStat label="Ready for collection" value={String(data.laundry.filter(order => order.status === 'Ready').length)} tone="amber" /><MiniStat label="Unpaid balances" value={money(data.laundry.reduce((sum, order) => sum + order.total - order.paid, 0))} tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All orders <b>{getCount('All')}</b></button><button className={statusFilter === 'Washing' ? 'selected' : ''} onClick={() => setStatusFilter('Washing')}>Washing <b>{getCount('Washing')}</b></button><button className={statusFilter === 'Drying' ? 'selected' : ''} onClick={() => setStatusFilter('Drying')}>Drying <b>{getCount('Drying')}</b></button><button className={statusFilter === 'Ready' ? 'selected' : ''} onClick={() => setStatusFilter('Ready')}>Ready <b>{getCount('Ready')}</b></button><button className={statusFilter === 'Collected' ? 'selected' : ''} onClick={() => setStatusFilter('Collected')}>Collected <b>{getCount('Collected')}</b></button></div><div className="filter-group"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="payment-filter"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option></select><button className="icon-button"><Filter size={16} /></button></div></div><LaundryTable orders={filtered} data={data} /></section></>; }

function EquipmentView({ data, setModal }: { data: AppData; setModal: (modal: Modal) => void }) { const total = data.equipment.reduce((sum, item) => sum + item.bookValue, 0); const maintenanceDue = data.equipment.filter(item => new Date(item.nextMaintenance) <= new Date()).length; return <><PageHeader eyebrow="Assets" title="Equipment & machines" description="Know what you own, what it costs, and what needs attention." action={<Button icon={<Plus size={17} />} onClick={() => setModal('equipment')}>Add equipment</Button>}></PageHeader><div className="stat-row"><MiniStat label="Book value" value={money(total)} tone="blue" /><MiniStat label="Assets in service" value={`${data.equipment.length - maintenanceDue}/${data.equipment.length}`} tone="green" /><MiniStat label="Maintenance due" value={String(maintenanceDue)} tone="amber" /><MiniStat label="Monthly depreciation" value={money(486000)} tone="rose" /></div><div className="asset-grid">{data.equipment.map(item => <article className="asset-card" key={item.id}><div className="asset-top"><span className="asset-visual"><Wrench size={22} /></span><button className="more-button">•••</button></div><span className="eyebrow">{item.type}</span><h3>{item.name}</h3><small className="serial-number">SN: {item.serialNumber}</small><div className="asset-meta"><span><StatusBadge value={item.condition} /></span></div><div className="asset-value"><div><small>Current book value</small><strong>{money(item.bookValue)}</strong></div><div><small>Usage</small><strong>{item.usage.toLocaleString()} hrs</strong></div></div><div className="asset-footer"><span><CalendarDays size={13} /> Service due {item.nextMaintenance}</span><ArrowUpRight size={15} /></div></article>)}</div></>; }

function InventoryView({ data }: { data: AppData }) { const value = data.inventory.reduce((sum, item) => sum + item.quantity * item.cost, 0); return <><PageHeader eyebrow="Inventory" title="Stock & supplies" description="Stay ahead of the materials your teams use every day." action={<Button icon={<Plus size={17} />}>Add stock</Button>} /><div className="inventory-banner"><div className="inventory-banner-icon"><Package size={22} /></div><div><strong>{money(value)}</strong><span>Current inventory value</span></div><div className="inventory-alert"><AlertTriangle size={16} /><span><strong>{data.inventory.filter(item => item.quantity <= item.minimum).length} items</strong> are below minimum stock</span></div><Button variant="secondary">Stock movement</Button></div><section className="panel table-panel"><div className="table-toolbar"><div><h2 className="table-title">Inventory items</h2><span className="table-caption">Quantities update when materials are consumed on jobs</span></div><div className="inline-search"><Search size={16} /><input placeholder="Search stock" /></div></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Cost / unit</th><th>Stock health</th></tr></thead><tbody>{data.inventory.map(item => { const low = item.quantity <= item.minimum; return <tr key={item.id}><td><div className="person-cell"><span className="table-product"><Package size={16} /></span><span><strong>{item.name}</strong><small>{item.id.toUpperCase()} · {item.unit}</small></span></div></td><td>{item.category}</td><td><strong>{item.quantity} {item.unit}</strong><small>Minimum {item.minimum}</small></td><td>{money(item.cost)}</td><td><span className={`stock-health ${low ? 'low' : 'healthy'}`}><i />{low ? 'Reorder soon' : 'Healthy'}</span></td></tr>; })}</tbody></table></div></section></>; }

function ReportsView({ data, revenue, expenses }: { data: AppData; revenue: number; expenses: number }) { const divisions = data.services.map(service => ({ name: service.division, revenue: data.jobs.filter(job => job.serviceId === service.id).reduce((sum, job) => sum + job.revenue, 0) })).reduce<{ name: string; revenue: number }[]>((acc, item) => { const found = acc.find(row => row.name === item.name); if (found) found.revenue += item.revenue; else acc.push(item); return acc; }, []).sort((a, b) => b.revenue - a.revenue); return <><PageHeader eyebrow="Business intelligence" title="Reports that answer why" description="See the performance behind every service and job." action={<Button variant="secondary" icon={<Download size={16} />}>Export report</Button>}><FilterButton label="September 2026" /></PageHeader><div className="report-cards"><ReportCard icon={<BarChart3 />} title="Profit & loss" description="Revenue, direct costs, and operating expenses." /><ReportCard icon={<Building2 />} title="Business performance" description="Compare revenue, expenses, and margins." /><ReportCard icon={<BriefcaseBusiness />} title="Job profitability" description="Find the work creating the best return." /><ReportCard icon={<Droplets />} title="Laundry performance" description="Orders, machines, and consumables." /></div><div className="dashboard-grid lower-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Management view</span><h2>Profit & loss</h2></div><span className="basis-badge">Cash basis</span></div><div className="pl-list"><div><span>Revenue</span><strong className="positive">{money(revenue)}</strong></div><div><span>Direct costs</span><strong>{money(3420000)}</strong></div><div><span>Gross profit</span><strong className="positive">{money(revenue - 3420000)}</strong></div><div><span>Operating expenses</span><strong>{money(expenses)}</strong></div><div className="pl-total"><span>Net profit</span><strong>{money(revenue - 3420000 - expenses)}</strong></div></div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Profit drivers</span><h2>Division performance</h2></div></div><div className="division-list report-list">{divisions.map((division, index) => <div className="division-row" key={division.name}><div className="division-label"><span className={`division-icon d${index}`}><BriefcaseBusiness size={15} /></span><strong>{division.name}</strong><span>{money(division.revenue)}</span></div><div className="progress"><i style={{ width: `${Math.max(8, division.revenue / Math.max(...divisions.map(item => item.revenue), 1) * 100)}%` }} /></div></div>)}</div></section></div></>; }
function ReportCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) { return <button className="report-card"><span>{icon}</span><strong>{title}</strong><p>{description}</p><ArrowUpRight size={16} /></button>; }

function SettingsView({ data, exportData, importData, resetData, setModal }: { data: AppData; updateData: (data: AppData) => void; exportData: () => void; importData: () => void; resetData: () => void; notify: (message: string) => void; setModal: (modal: Modal) => void }) { return <><PageHeader eyebrow="Workspace controls" title="Settings" description="Configure Gabfix for the way your business operates." action={<Button icon={<Plus size={17} />} onClick={() => setModal('service')}>Add service</Button>} /><div className="settings-layout"><aside className="settings-nav"><button className="active">Company profile</button><button>Services & pricing <b>{data.services.length}</b></button><button>Business divisions</button><button>Payment methods</button><button>Data & backup</button></aside><div className="settings-content"><section className="panel settings-card"><div className="settings-title">                <div className="company-logo"><img src={gabfixLogo} alt="Gabfix logo" /></div>
<div><h2>Gabfix Home Solutions</h2><p>Company profile and workspace identity</p></div><button className="more-button">Change logo</button></div><div className="form-grid"><label>Company name<input value="Gabfix Home Solutions" readOnly /></label><label>Default currency<select defaultValue="UGX"><option>UGX — Ugandan Shilling</option><option>USD — US Dollar</option></select></label><label>Phone number<input value="+256 772 000 447" readOnly /></label><label>Accounting basis<select defaultValue="Cash basis"><option>Cash basis</option><option>Accrual basis</option></select></label><label className="full">Business address<input value="Plot 18, Kira Road, Kampala, Uganda" readOnly /></label></div><div className="settings-footer"><span>Changes are saved automatically in this browser.</span><Button variant="secondary">Save changes</Button></div></section><section className="panel settings-card"><div className="panel-heading"><div><span className="eyebrow">Data management</span><h2>Backup & restore</h2><p>Keep a portable copy of your Gabfix workspace.</p></div><FileText size={20} className="muted-icon" /></div><div className="backup-actions"><button onClick={exportData}><Download size={17} /><span><strong>Export backup</strong><small>Download all records as JSON</small></span><ArrowUpRight size={15} /></button><button onClick={importData}><Upload size={17} /><span><strong>Import backup</strong><small>Restore a previous workspace</small></span><ArrowUpRight size={15} /></button><button onClick={resetData}><Activity size={17} /><span><strong>Reset demo data</strong><small>Restore the original example records</small></span><ArrowUpRight size={15} /></button></div></section><div className="future-note"><Sparkles size={18} /><div><strong>Built for your next stage</strong><p>Gabfix currently stores data in this browser. Its records are organized behind a clean data layer so a shared online database can be connected when your team is ready.</p></div></div></div></div></>; }

function ModalShell({ type, data, updateData, close, notify, modalData }: { type: Modal; data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void; modalData?: any }) { const titles: Record<string, string> = { job: 'Create a new job', laundry: 'New laundry order', customer: 'Add a customer', expense: 'Record an expense', service: 'Add a service', equipment: 'Add equipment', 'job-status': 'Update job status' }; return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div className="modal"><div className="modal-header"><div><span className="eyebrow">Gabfix workspace</span><h2>{type ? titles[type] : ''}</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div>{type === 'job' && <JobForm data={data} updateData={updateData} close={close} notify={notify} />}{type === 'laundry' && <LaundryOrderForm data={data} updateData={updateData} close={close} notify={notify} />}{type === 'customer' && <CustomerForm data={data} updateData={updateData} close={close} notify={notify} />}{type === 'expense' && <ExpenseForm data={data} updateData={updateData} close={close} notify={notify} />}{type === 'service' && <ServiceForm data={data} updateData={updateData} close={close} notify={notify} />}{type === 'equipment' && <EquipmentForm data={data} updateData={updateData} close={close} notify={notify} />}{modalData && type === 'job-status' && <JobStatusModal job={modalData} data={data} updateData={updateData} close={close} notify={notify} />}</div></div>; }
function JobForm({ data, updateData, close, notify }: { data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) { const [isNewClient, setIsNewClient] = useState(false); const [form, setForm] = useState({ customerId: data.customers[0].id, serviceId: data.services[0].id, date: today, revenue: String(data.services[0].price), status: 'Scheduled' as JobStatus }); const [client, setClient] = useState({ name: '', company: '', phone: '', email: '', type: 'Residential' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const updateClient = (key: string, value: string) => setClient(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); let customerId = form.customerId; if (isNewClient) { if (!client.name.trim() || !client.phone.trim()) return; const newCustomer: Customer = { id: `c${Date.now()}`, name: client.name, company: client.company, type: client.type, phone: client.phone, email: client.email, balance: 0, status: 'Active' }; updateData({ ...data, customers: [newCustomer, ...data.customers] }); customerId = newCustomer.id; notify('New customer registered'); } const job: Job = { id: `j${Date.now()}`, number: `JOB-${String(data.jobs.length + 143).padStart(5, '0')}`, customerId, serviceId: form.serviceId, date: form.date, status: form.status, revenue: Number(form.revenue), cost: Math.round(Number(form.revenue) * .36), assignees: [] }; updateData({ ...data, jobs: [job, ...data.jobs] }); notify('Job created successfully'); close(); }; return <form onSubmit={submit} className="modal-form"><div className="modal-section"><span className="modal-section-label">Client Information</span><div className="form-grid"><label>Client<select value={isNewClient ? '__new__' : form.customerId} onChange={event => { if (event.target.value === '__new__') { setIsNewClient(true); } else { setIsNewClient(false); update('customerId', event.target.value); } }}><option value="__new__">+ New client</option>{data.customers.map(item => <option key={item.id} value={item.id}>{item.company || item.name}</option>)}</select></label>{isNewClient && <label className="full" style={{gridColumn:'1/-1'}}><span style={{fontSize:10,color:'#666666',display:'block',marginBottom:6}}>New client details</span></label>}{isNewClient && <label>Full name<input required placeholder="e.g. Amina Nakato" value={client.name} onChange={event => updateClient('name', event.target.value)} /></label>}{isNewClient && <label>Client type<select value={client.type} onChange={event => updateClient('type', event.target.value)}><option>Residential</option><option>Business</option><option>Corporate Client</option><option>Property Manager</option><option>Walk-in Customer</option></select></label>}{isNewClient && <label>Phone number<input required placeholder="+256 ..." value={client.phone} onChange={event => updateClient('phone', event.target.value)} /></label>}{isNewClient && <label>Email address<input type="email" placeholder="name@example.com" value={client.email} onChange={event => updateClient('email', event.target.value)} /></label>}</div></div><div className="modal-section"><span className="modal-section-label">Job Details</span><div className="form-grid"><label>Service<select value={form.serviceId} onChange={event => { const service = data.services.find(item => item.id === event.target.value); update('serviceId', event.target.value); update('revenue', String(service?.price ?? 0)); }}>{data.services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Scheduled date<input type="date" value={form.date} onChange={event => update('date', event.target.value)} /></label><label>Estimated revenue<input type="number" min="0" value={form.revenue} onChange={event => update('revenue', event.target.value)} /></label><label>Status<select value={form.status} onChange={event => update('status', event.target.value)}><option>Scheduled</option><option>Quoted</option><option>In Progress</option><option>Completed</option></select></label></div></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Create job</Button></div></form>; }
function CustomerForm({ data, updateData, close, notify }: { data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) { const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', type: 'Residential' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name.trim() || !form.phone.trim()) return; updateData({ ...data, customers: [{ ...form, id: `c${Date.now()}`, balance: 0, status: 'Active' }, ...data.customers] }); notify('Customer added successfully'); close(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Full name<input required placeholder="e.g. Amina Nakato" value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Customer type<select value={form.type} onChange={event => update('type', event.target.value)}><option>Residential</option><option>Business</option><option>Corporate Client</option><option>Property Manager</option><option>Walk-in Customer</option></select></label><label>Company (optional)<input placeholder="Company name" value={form.company} onChange={event => update('company', event.target.value)} /></label><label>Phone number<input required placeholder="+256 ..." value={form.phone} onChange={event => update('phone', event.target.value)} /></label><label>Email address<input type="email" placeholder="name@example.com" value={form.email} onChange={event => update('email', event.target.value)} /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Save customer</Button></div></form>; }
function ExpenseForm({ data, updateData, close, notify }: { data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) { const [form, setForm] = useState({ category: 'Supplies', description: '', amount: '', division: 'Company overhead' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); if (!form.description.trim() || !form.amount) return; updateData({ ...data, expenses: [{ ...form, id: `e${Date.now()}`, amount: Number(form.amount), date: today }, ...data.expenses] }); notify('Expense recorded'); close(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label>Amount<input required type="number" min="0" placeholder="0" value={form.amount} onChange={event => update('amount', event.target.value)} /></label><label>Category<select value={form.category} onChange={event => update('category', event.target.value)}><option>Supplies</option><option>Payroll</option><option>Fuel</option><option>Repairs</option><option>Rent</option><option>Utilities</option><option>Marketing</option><option>Other</option></select></label><label className="full">Description<input required placeholder="What was this expense for?" value={form.description} onChange={event => update('description', event.target.value)} /></label><label>Business division<select value={form.division} onChange={event => update('division', event.target.value)}><option>Company overhead</option><option>Cleaning Services</option><option>Home Solutions</option><option>Laundry</option><option>Vehicle Services</option></select></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Record expense</Button></div></form>; }
function ServiceForm({ data, updateData, close, notify }: { data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) { const [form, setForm] = useState({ name: '', division: 'Other Services', method: 'Fixed price', price: '' }); const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value })); const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; updateData({ ...data, services: [{ ...form, id: `s${Date.now()}`, price: Number(form.price) || 0, active: true }, ...data.services] }); notify('Service added to your catalog'); close(); }; return <form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Service name<input required placeholder="e.g. Generator installation" value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Business division<select value={form.division} onChange={event => update('division', event.target.value)}><option>Cleaning Services</option><option>Contract Cleaning</option><option>Home Solutions</option><option>Vehicle Services</option><option>Laundry</option><option>Other Services</option></select></label><label>Pricing method<select value={form.method} onChange={event => update('method', event.target.value)}><option>Fixed price</option><option>Per hour</option><option>Per item</option><option>Per kilogram</option><option>Per visit</option><option>Custom quotation</option></select></label><label>Default price<input type="number" min="0" value={form.price} onChange={event => update('price', event.target.value)} placeholder="0" /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Add service</Button></div></form>; }

function LaundryOrderForm({ data, updateData, close, notify }: { data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) {
  const [isNewClient, setIsNewClient] = useState(false);
  const [form, setForm] = useState({ customerId: data.customers[0]?.id || '', status: 'Washing', total: '', paid: '' });
  const [client, setClient] = useState({ name: '', company: '', phone: '', email: '', type: 'Walk-in Customer' });
  const [items, setItems] = useState([{ name: '', qty: '1', unit: 'kg', price: '' }]);

  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const updateClient = (key: string, value: string) => setClient(previous => ({ ...previous, [key]: value }));

  const addItem = () => setItems(previous => [...previous, { name: '', qty: '1', unit: 'kg', price: '' }]);
  const removeItem = (index: number) => setItems(previous => previous.filter((_, i) => i !== index));
  const updateItem = (index: number, key: string, value: string) => setItems(previous => previous.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const computedTotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price) || 0), 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let customerId = form.customerId;
    if (isNewClient) {
      if (!client.name.trim() || !client.phone.trim()) return;
      const newCustomer: Customer = { id: `c${Date.now()}`, name: client.name, company: client.company, type: client.type, phone: client.phone, email: client.email, balance: 0, status: 'Active' };
      updateData({ ...data, customers: [newCustomer, ...data.customers] });
      customerId = newCustomer.id;
      notify('New customer registered');
    }
    const itemList = items.filter(item => item.name.trim()).map(item => `${item.qty} ${item.unit} ${item.name}`).join(', ');
    const total = Number(form.total) || computedTotal;
    const order: LaundryOrder = {
      id: `l${Date.now()}`,
      number: `LDY-${String(data.laundry.length + 217).padStart(5, '0')}`,
      customerId,
      status: form.status,
      total,
      paid: Number(form.paid) || 0,
      items: itemList || 'Laundry service',
      received: today
    };
    updateData({ ...data, laundry: [order, ...data.laundry] });
    notify('Laundry order created');
    close();
  };

  return (
    <form onSubmit={submit} className="modal-form">
      <div className="modal-section">
        <span className="modal-section-label">Client Information</span>
        <div className="form-grid">
          <label>Client<select value={isNewClient ? '__new__' : form.customerId} onChange={event => { if (event.target.value === '__new__') { setIsNewClient(true); } else { setIsNewClient(false); update('customerId', event.target.value); } }}><option value="__new__">+ New client</option>{data.customers.map(item => <option key={item.id} value={item.id}>{item.company || item.name}</option>)}</select></label>
          {isNewClient && <label className="full" style={{gridColumn:'1/-1'}}><span style={{fontSize:10,color:'#666666',display:'block',marginBottom:6}}>New client details</span></label>}
          {isNewClient && <label>Full name<input required placeholder="e.g. Amina Nakato" value={client.name} onChange={event => updateClient('name', event.target.value)} /></label>}
          {isNewClient && <label>Client type<select value={client.type} onChange={event => updateClient('type', event.target.value)}><option>Residential</option><option>Business</option><option>Corporate Client</option><option>Property Manager</option><option>Walk-in Customer</option></select></label>}
          {isNewClient && <label>Phone number<input required placeholder="+256 ..." value={client.phone} onChange={event => updateClient('phone', event.target.value)} /></label>}
          {isNewClient && <label>Email address<input type="email" placeholder="name@example.com" value={client.email} onChange={event => updateClient('email', event.target.value)} /></label>}
        </div>
      </div>
      <div className="modal-section">
        <span className="modal-section-label">Laundry Items</span>
        <div className="laundry-items-list">
          {items.map((item, index) => (
            <div key={index} className="laundry-item-row">
              <input placeholder="Item name" value={item.name} onChange={event => updateItem(index, 'name', event.target.value)} style={{flex:2}} required />
              <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={event => updateItem(index, 'qty', event.target.value)} style={{flex:'0 0 60px'}} required />
              <select value={item.unit} onChange={event => updateItem(index, 'unit', event.target.value)} style={{flex:'0 0 70px'}}>
                <option>kg</option><option>piece</option><option>set</option><option>blanket</option><option>pair</option>
              </select>
              <input type="number" min="0" placeholder="Price" value={item.price} onChange={event => updateItem(index, 'price', event.target.value)} style={{flex:1}} />
              {items.length > 1 && <button type="button" className="icon-button laundry-item-remove" onClick={() => removeItem(index)}><X size={14} /></button>}
            </div>
          ))}
        </div>
        <button type="button" className="more-button" onClick={addItem} style={{marginTop:8}}><Plus size={14} /> Add item</button>
        {computedTotal > 0 && <div className="laundry-total-preview"><span>Subtotal</span><strong>{money(computedTotal)}</strong></div>}
        <div className="form-grid" style={{marginTop:12}}>
          <label>Status<select value={form.status} onChange={event => update('status', event.target.value)}><option>Washing</option><option>Drying</option><option>Ready</option></select></label>
          <label>Total amount<input type="number" min="0" value={form.total || computedTotal || ''} onChange={event => update('total', event.target.value)} placeholder={String(computedTotal)} /></label>
          <label>Amount paid<input type="number" min="0" value={form.paid} onChange={event => update('paid', event.target.value)} placeholder="0" /></label>
        </div>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button icon={<Check size={16} />}>Create order</Button>
      </div>
    </form>
  );
}

function EquipmentForm({ data, updateData, close, notify }: { data: AppData; updateData: (data: AppData) => void; close: () => void; notify: (message: string) => void }) {
  const [form, setForm] = useState({ name: '', serialNumber: '', type: 'Washing machine', value: '', bookValue: '' });
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.serialNumber.trim() || !form.value) return;
    const equipment: Equipment = {
      id: `a${Date.now()}`,
      name: form.name,
      serialNumber: form.serialNumber,
      type: form.type,
      value: Number(form.value),
      bookValue: Number(form.bookValue) || Number(form.value),
      condition: 'Good',
      nextMaintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      usage: 0
    };
    updateData({ ...data, equipment: [equipment, ...data.equipment] });
    notify('Equipment added successfully');
    close();
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

export default App;
