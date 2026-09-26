import { useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { PageHeader, Button, EmptyState, MiniStat, SelectFilter } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { useWorkspace, today } from '../app/store';
import { money } from '../lib/money';
import { downloadCsv } from '../lib/csv';

/** Customers view (Phase 0.10 client split). */

export function CustomersView() {
  const { data, setModal, query } = useWorkspace();
  const [term, setTerm] = useState('');
  const [type, setType] = useState('All types');
  const types = ['All types', ...Array.from(new Set(data.customers.map(item => item.type))).sort()];
  const activity = (customer: { id: string }) => data.jobs.filter(job => job.customerId === customer.id).length + data.laundry.filter(order => order.customerId === customer.id).length;
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
