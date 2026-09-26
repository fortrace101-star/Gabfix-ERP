import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Droplets, Gauge, Package, Plus, Users, Wrench } from 'lucide-react';
import { PageHeader, Button, KpiCard, QuickAction, AlertRow } from '../components/ui';
import { JobTable } from './jobs';
import { useWorkspace } from '../app/store';
import { isMaintenanceDue, periodStart } from '../lib/dates';
import { money } from '../lib/money';
import type { View } from '../types';

/** Dashboard view (Phase 0.10 client split) — period KPIs come from the workspace cache. */

export function Dashboard() {
  const { data, setView, setModal, setModalData } = useWorkspace();
  const [period, setPeriod] = useState('This month');

  const periodStart_ = periodStart(period);
  const periodJobs = data.jobs.filter(job => job.date >= periodStart_);
  const periodExpenses = data.expenses.filter(expense => expense.date >= periodStart_);
  const periodLaundry = data.laundry.filter(order => order.received >= periodStart_);
  const periodInvoices = data.invoices.filter(inv => inv.date >= periodStart_);

  const revenue = periodJobs.filter(job => job.status === 'Completed' || job.status === 'In Progress').reduce((sum, job) => sum + job.revenue, 0) + periodLaundry.reduce((sum, order) => sum + order.paid, 0);
  const expenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const receivables = periodInvoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);

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
    ...(data.equipment.filter(item => isMaintenanceDue(item.nextMaintenance)).length ? [{ icon: <Wrench />, title: `${data.equipment.filter(item => isMaintenanceDue(item.nextMaintenance)).length} machine(s) due for service`, detail: data.equipment.filter(item => isMaintenanceDue(item.nextMaintenance)).map(item => item.name).join(', '), tone: 'amber', view: 'equipment' as View }] : []),
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
