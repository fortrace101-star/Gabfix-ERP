import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader, Button, EmptyState, MiniStat } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { useWorkspace } from '../app/store';
import { money } from '../lib/money';
import type { AppData, Job, Modal } from '../types';

/** Jobs & contracts view (Phase 0.10 client split) — shared JobTable is reused by the dashboard. */

export function JobsView() {
  const { data, setModal, setModalData, query } = useWorkspace();
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

  return <><PageHeader eyebrow="Operations" title="Jobs & contracts" description="Track delivery, job costing, and the work that moves Gabfix forward." action={<Button icon={<Plus size={17} />} onClick={() => setModal('job')}>New job</Button>} /><div className="stat-row"><MiniStat label="Open jobs" value={String(data.jobs.filter(job => job.status !== 'Completed').length)} tone="blue" /><MiniStat label="Completed this month" value={String(data.jobs.filter(job => job.status === 'Completed').length)} tone="green" /><MiniStat label="Quoted value" value={money(data.jobs.filter(job => job.status === 'Quoted').reduce((sum, job) => sum + job.revenue, 0))} tone="amber" /><MiniStat label="Average margin" value={`${filtered.length ? Math.round(filtered.reduce((sum, job) => sum + (job.revenue ? (job.revenue - job.cost) / job.revenue : 0), 0) / filtered.length * 100) : 0}%`} tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All jobs <b>{getCount('All')}</b></button><button className={statusFilter === 'Scheduled' ? 'selected' : ''} onClick={() => setStatusFilter('Scheduled')}>Scheduled <b>{getCount('Scheduled')}</b></button><button className={statusFilter === 'In Progress' ? 'selected' : ''} onClick={() => setStatusFilter('In Progress')}>In Progress <b>{getCount('In Progress')}</b></button><button className={statusFilter === 'Completed' ? 'selected' : ''} onClick={() => setStatusFilter('Completed')}>Completed <b>{getCount('Completed')}</b></button><button className={statusFilter === 'Quoted' ? 'selected' : ''} onClick={() => setStatusFilter('Quoted')}>Quoted <b>{getCount('Quoted')}</b></button></div><div className="filter-group"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="payment-filter"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option></select></div></div><JobTable jobs={filtered} data={data} setModal={setModal} setModalData={setModalData} /></section></>;
}

function getPaymentStatus(job: Job, data: AppData) {
  const customerInvoices = data.invoices.filter(inv => inv.customerId === job.customerId);
  const totalDue = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.paid, 0);

  if (totalDue === 0) return 'Unpaid';
  if (totalPaid >= totalDue) return 'Paid';
  const balance = totalDue - totalPaid;
  return `Partial (${money(balance)} pending)`;
}

export function JobTable({ jobs, data, setModal, setModalData }: { jobs: Job[]; data: AppData; compact?: boolean; setModal?: (modal: Modal) => void; setModalData?: (data: unknown) => void }) { return <div className="table-wrap"><table><thead><tr><th>Job</th><th>Status</th><th>Customer</th><th>Service</th><th>Revenue</th><th>Payment Status</th>{setModal && <th>Action</th>}</tr></thead><tbody>{jobs.length ? jobs.map(job => { const customer = data.customers.find(item => item.id === job.customerId); const service = data.services.find(item => item.id === job.serviceId); const paymentStatus = getPaymentStatus(job, data); return <tr key={job.id}><td><strong className="linkish">{job.number}</strong><small>{job.date}</small></td><td><StatusBadge value={job.status} /></td><td><strong>{customer?.company || customer?.name}</strong><small>{customer?.type}</small></td><td>{service?.name}<small>{service?.division}</small></td><td><strong>{money(job.revenue)}</strong><small className="profit-text">{Math.round((job.revenue - job.cost) / job.revenue * 100)}% margin</small></td><td><StatusBadge value={paymentStatus} /></td>{setModal && <td><button className="more-button" onClick={() => { setModal?.('job-status'); setModalData?.(job); }}>Update</button></td>}</tr>; }) : <tr><td colSpan={7}><EmptyState title="No jobs match" /></td></tr>}</tbody></table></div>; }
