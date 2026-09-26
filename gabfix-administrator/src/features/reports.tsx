import { useState } from 'react';
import { ArrowUpRight, BarChart3, BriefcaseBusiness, Download, Droplets } from 'lucide-react';
import { PageHeader, Button, CsvTable, MiniStat, RankedList, ReportCard, SelectFilter } from '../components/ui';
import { useWorkspace } from '../app/store';
import { money } from '../lib/money';
import { downloadCsv } from '../lib/csv';

/** Reports view (Phase 0.10 client split). */

export function ReportsView() {
  const { data, setView } = useWorkspace();
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
