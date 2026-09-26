import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import { useWorkspace } from '../store';
import { isMaintenanceDue } from '../../lib/dates';
import { money } from '../../lib/money';
import type { View } from '../../types';

/** Everything that genuinely needs attention, derived from live records. */
function useAlerts() {
  const { data } = useWorkspace();
  return useMemo(() => {
    const overdue = data.invoices.filter(invoice => invoice.status === 'Overdue');
    const dueMaintenance = data.equipment.filter(item => isMaintenanceDue(item.nextMaintenance));
    const lowStock = data.inventory.filter(item => item.quantity <= item.minimum);
    const readyLaundry = data.laundry.filter(order => order.status === 'Ready');
    const list: { title: string; detail: string; tone: string; icon: ReactNode; view: View }[] = [];
    if (overdue.length) list.push({ title: `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue`, detail: `${money(overdue.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0))} outstanding`, tone: 'rose', icon: <Bell size={16} />, view: 'finance' });
    if (dueMaintenance.length) list.push({ title: `${dueMaintenance.length} machine${dueMaintenance.length > 1 ? 's' : ''} due for service`, detail: dueMaintenance.map(item => item.name).slice(0, 2).join(', '), tone: 'amber', icon: <Bell size={16} />, view: 'equipment' });
    if (lowStock.length) list.push({ title: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} below minimum stock`, detail: lowStock.map(item => item.name).slice(0, 2).join(', '), tone: 'blue', icon: <Bell size={16} />, view: 'inventory' });
    if (readyLaundry.length) list.push({ title: `${readyLaundry.length} laundry order${readyLaundry.length > 1 ? 's' : ''} ready for collection`, detail: readyLaundry.map(order => order.number).slice(0, 2).join(', '), tone: 'green', icon: <Bell size={16} />, view: 'laundry' });
    return list;
  }, [data]);
}

export function Topbar({ setMobileOpen }: { setMobileOpen: (open: boolean) => void }) {
  const { data, view, setView, query, setQuery } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const alerts = useAlerts();

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

  const closePanels = () => { setSearchOpen(false); setNotifOpen(false); };

  // Ctrl/Cmd+K opens the global search from anywhere (desktop-app habit).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') closePanels();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="topbar" onKeyDown={event => { if (event.key === 'Escape') closePanels(); }}>
      <button className="menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="topbar-context"><strong>{view === 'dashboard' ? 'Here is your business at a glance.' : navLabel(view)}</strong></div>
      <div className="topbar-actions">
        <div className={`global-search ${searchOpen ? 'open' : ''}`}>
          <button className="search-trigger" onClick={() => { setSearchOpen(true); searchRef.current?.focus(); }} aria-label="Search your workspace"><Search size={17} /></button>
          <input ref={searchRef} placeholder="Search anything..." value={query} onChange={event => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-label="Search jobs, customers, invoices, stock and equipment" />
          <kbd>⌘ K</kbd>
          {query.trim().length > 1 && <div className="search-panel">{searchResults.length ? searchResults.map(result => <button className="result-row" key={result.id} onClick={() => { setView(result.view); closePanels(); }}><span><strong>{result.label}</strong><small>{result.detail}</small></span><span className="result-kind">{result.kind}</span></button>) : <span className="result-empty">No records match &quot;{query.trim()}&quot;.</span>}</div>}
        </div>
        <button className="icon-button notification" onClick={() => setNotifOpen(open => !open)} aria-label={`Alerts (${alerts.length})`} aria-expanded={notifOpen}><Bell size={18} />{alerts.length > 0 && <span className="notif-count">{alerts.length}</span>}</button>
        {notifOpen && <div className="notif-panel"><h4>Needs attention</h4>{alerts.length ? alerts.map(alert => <button className="notif-row" key={alert.title} onClick={() => { setView(alert.view); setNotifOpen(false); }}>{alert.icon}<span><strong>{alert.title}</strong><small>{alert.detail}</small></span></button>) : <p className="notif-empty">Everything is up to date.</p>}</div>}
        <button className="profile-button" onClick={() => setView('settings')} aria-label="Open workspace settings"><div className="avatar small">GN</div><ChevronDown size={14} /></button>
      </div>
    </header>
  );
}

function navLabel(view: View): string {
  const labels: Record<View, string> = {
    dashboard: 'Dashboard', jobs: 'Jobs & contracts', customers: 'Customers', finance: 'Finance',
    laundry: 'Laundry operations', equipment: 'Equipment', inventory: 'Inventory', reports: 'Reports', settings: 'Settings',
  };
  return labels[view];
}
