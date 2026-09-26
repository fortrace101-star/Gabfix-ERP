import { BarChart3, ChevronDown, ClipboardList, CircleDollarSign, Droplets, LayoutDashboard, Package, Settings, Sparkles, Users, Wrench, X } from 'lucide-react';
import gabfixLogo from '../../assets/gabfix-logo.png';
import { useWorkspace } from '../store';
import { isMaintenanceDue } from '../../lib/dates';
import type { View } from '../../types';

const navGroups = [
  { label: 'Workspace', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operations', items: [{ id: 'jobs', label: 'Jobs & contracts', icon: ClipboardList }, { id: 'customers', label: 'Customers', icon: Users }] },
  { label: 'Finance', items: [{ id: 'finance', label: 'Finance', icon: CircleDollarSign }] },
  { label: 'Laundry', items: [{ id: 'laundry', label: 'Laundry operations', icon: Droplets }] },
  { label: 'Assets & stock', items: [{ id: 'equipment', label: 'Equipment', icon: Wrench }, { id: 'inventory', label: 'Inventory', icon: Package }] },
  { label: 'Insight', items: [{ id: 'reports', label: 'Reports', icon: BarChart3 }] },
];

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const { data, view, setView, profile } = useWorkspace();
  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><img src={profile.logo || gabfixLogo} alt={profile.companyName} /></div><div><strong>{profile.companyName.split(' ')[0]}</strong><span>{profile.tagline}</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <nav>{navGroups.map(group => <div className="nav-group" key={group.label}><span className="nav-label">{group.label}</span>{group.items.map(item => { const Icon = item.icon; const overdueInvoices = item.id === 'finance' ? data.invoices.filter(inv => inv.status === 'Overdue').length : 0; const maintenanceCount = item.id === 'equipment' ? data.equipment.filter(e => isMaintenanceDue(e.nextMaintenance)).length : 0; const badgeCount = overdueInvoices || maintenanceCount; return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id as View); setMobileOpen(false); }}><Icon size={17} /><span>{item.label}</span>{badgeCount > 0 && <span className="nav-badge">{badgeCount}</span>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><Sparkles size={18} /><div><strong>Owner workspace</strong><span>Everything is up to date</span></div></div><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><Settings size={17} /><span>Settings</span></button><div className="user-chip"><div className="avatar">GN</div><div><strong>Gabriel N.</strong><span>Owner account</span></div><ChevronDown size={14} /></div></div>
    </aside>
  );
}
