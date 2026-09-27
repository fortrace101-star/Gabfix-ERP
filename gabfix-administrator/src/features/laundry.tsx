import { useState } from 'react';
import { Droplets, Plus } from 'lucide-react';
import { PageHeader, Button, EmptyState, MiniStat } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { useWorkspace, today } from '../app/store';
import { money } from '../lib/money';
import { monthKeyOf, monthName } from '../lib/format';
import type { AppData, LaundryOrder } from '../types';

/** Compact timeline under an order's number: received → promised → ready → collected. */
function LaundryTimeline({ order }: { order: LaundryOrder }) {
  const stamps: [string, string | null | undefined][] = [
    ['In', order.received],
    ['Due', order.promisedAt],
    ['Ready', order.readyAt],
    ['Out', order.collectedAt],
  ];
  return <small className="laundry-timeline">{stamps.filter(([, value]) => value).map(([label, value]) => `${label} ${value}`).join(' · ') || order.received}</small>;
}

/** Laundry operations view (Phase 0.10 client split). */

function getLaundryPaymentStatus(order: LaundryOrder) {
  if (order.paid >= order.total) return 'Paid';
  if (order.paid === 0) return 'Unpaid';
  const balance = order.total - order.paid;
  return `Partial (${money(balance)} pending)`;
}

export function LaundryTable({ orders, data }: { orders: LaundryOrder[]; data: AppData }) {
  const { setModal, setModalData } = useWorkspace();
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Customer</th><th>Items & service</th><th>Timeline</th><th>Total</th><th>Payment Status</th><th></th></tr></thead><tbody>{orders.length ? orders.map(order => {
    const paymentStatus = getLaundryPaymentStatus(order);
    return <tr key={order.id}><td><strong className="linkish">{order.number}</strong><small>{order.received}</small></td><td><StatusBadge value={order.status} /></td><td><strong>{data.customers.find(customer => customer.id === order.customerId)?.name}</strong><small>{data.customers.find(customer => customer.id === order.customerId)?.type}</small></td><td><strong>{order.items || '—'}</strong><small>{[order.weightKg ? `${order.weightKg} kg` : '', order.pieces ? `${order.pieces} pcs` : ''].filter(Boolean).join(' · ') || 'Machine wash & finish'}</small></td><td><LaundryTimeline order={order} /></td><td><strong>{money(order.total)}</strong><small className="profit-text">{order.total - order.paid ? `${money(order.total - order.paid)} balance` : 'Paid in full'}</small></td><td><StatusBadge value={paymentStatus} /></td><td><button className="more-button" onClick={() => { setModalData(order); setModal('laundry-status'); }}>Status</button></td></tr>;
  }) : <tr><td colSpan={8}><EmptyState title="No orders match" /></td></tr>}</tbody></table></div>;
}

export function LaundryView() {
  const { data, setModal, setModalData, setView, query } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const scoped = data.laundry;
  const revenue = scoped.reduce((sum, order) => sum + order.total, 0);
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

  return <><PageHeader eyebrow="Laundry division" title="Laundry operations" description="From drop-off to collection, keep every order and machine moving." action={<Button icon={<Plus size={17} />} onClick={() => setModal('laundry-intake')}>New laundry order</Button>} /><div className="laundry-hero"><div className="laundry-copy"><span className="eyebrow">{monthLabel} performance</span><h2>Clean work. Clear numbers.</h2><p>Your laundry division has processed <strong>{ordersThisMonth} order{ordersThisMonth === 1 ? '' : 's'}</strong> in {monthLabel} and collected <strong>{collectedRate}%</strong> of the {money(revenue)} billed.</p><div className="laundry-actions"><Button onClick={() => setModal('laundry-intake')} icon={<Plus size={16} />}>New order</Button><Button variant="secondary" onClick={() => setView('equipment')}>Machine usage</Button></div></div><div className="laundry-orbit"><Droplets size={42} /><span>{inProgressRate}%</span><small>orders in progress</small></div></div><div className="stat-row"><MiniStat label={`Orders in ${monthLabel}`} value={String(ordersThisMonth)} tone="blue" /><MiniStat label="Laundry revenue" value={money(revenue)} tone="green" /><MiniStat label="Ready for collection" value={String(readyCount)} tone="amber" /><MiniStat label="Unpaid balances" value={money(outstandingBalance)} tone="rose" /></div><section className="panel table-panel"><div className="table-toolbar"><div className="tabs"><button className={statusFilter === 'All' ? 'selected' : ''} onClick={() => setStatusFilter('All')}>All orders <b>{getCount('All')}</b></button><button className={statusFilter === 'Washing' ? 'selected' : ''} onClick={() => setStatusFilter('Washing')}>Washing <b>{getCount('Washing')}</b></button><button className={statusFilter === 'Drying' ? 'selected' : ''} onClick={() => setStatusFilter('Drying')}>Drying <b>{getCount('Drying')}</b></button><button className={statusFilter === 'Ready' ? 'selected' : ''} onClick={() => setStatusFilter('Ready')}>Ready <b>{getCount('Ready')}</b></button><button className={statusFilter === 'Collected' ? 'selected' : ''} onClick={() => setStatusFilter('Collected')}>Collected <b>{getCount('Collected')}</b></button></div><div className="filter-group"><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="payment-filter"><option value="All">All Payment Statuses</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Partial">Partial</option></select></div></div><LaundryTable orders={filtered} data={data} /></section></>;
}
