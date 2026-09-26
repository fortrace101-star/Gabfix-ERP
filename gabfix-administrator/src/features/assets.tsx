import { useState } from 'react';
import { AlertTriangle, ArrowUpRight, CalendarDays, Package, Plus, Search, Wrench } from 'lucide-react';
import { PageHeader, Button, EmptyState, MiniStat, SelectFilter } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { useWorkspace } from '../app/store';
import { isMaintenanceDue } from '../lib/dates';
import { money } from '../lib/money';

/** Equipment + inventory views (Phase 0.10 client split). */

export function EquipmentView() {
  const { data, setModal, setModalData } = useWorkspace();
  const assets = data.equipment;
  const total = assets.reduce((sum, item) => sum + item.bookValue, 0);
  const maintenanceDue = assets.filter(item => isMaintenanceDue(item.nextMaintenance)).length;
  const accumulated = Math.max(0, assets.reduce((sum, item) => sum + item.value, 0) - total);
  return <><PageHeader eyebrow="Assets" title="Equipment & machines" description="Know what you own, what it costs, and what needs attention." action={<Button icon={<Plus size={17} />} onClick={() => setModal('equipment')}>Add equipment</Button>} /><div className="stat-row"><MiniStat label="Book value" value={money(total)} tone="blue" /><MiniStat label="Assets in service" value={`${assets.length - maintenanceDue}/${assets.length}`} tone="green" /><MiniStat label="Maintenance due" value={String(maintenanceDue)} tone="amber" /><MiniStat label="Accumulated depreciation" value={money(accumulated)} tone="rose" /></div><div className="asset-grid">{assets.map(item => <article className="asset-card" key={item.id}><div className="asset-top"><span className="asset-visual"><Wrench size={22} /></span><button className="more-button" onClick={() => { setModalData(item); setModal('equipment-update'); }}>Update</button></div><span className="eyebrow">{item.type}</span><h3>{item.name}</h3><small className="serial-number">SN: {item.serialNumber}</small><div className="asset-meta"><StatusBadge value={item.condition} /></div><div className="asset-value"><div><small>Current book value</small><strong>{money(item.bookValue)}</strong></div><div><small>Usage</small><strong>{item.usage.toLocaleString()} hrs</strong></div></div><div className="asset-footer"><span><CalendarDays size={13} /> Service due {item.nextMaintenance}</span><ArrowUpRight size={15} /></div></article>)}</div></>;
}

export function InventoryView() {
  const { data, setModal, setModalData, query } = useWorkspace();
  const [itemQuery, setItemQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const term = (itemQuery.trim() || query).trim();
  const items = data.inventory.filter(item => (category === 'All categories' || item.category === category) && `${item.name} ${item.category} ${item.unit}`.toLowerCase().includes(term.toLowerCase()));
  const value = data.inventory.reduce((sum, item) => sum + item.quantity * item.cost, 0);
  return <><PageHeader eyebrow="Inventory" title="Stock & supplies" description="Stay ahead of the materials your teams use every day." action={<Button icon={<Plus size={17} />} onClick={() => setModal('inventory')}>Add stock</Button>}><SelectFilter label="Category" value={category} options={['All categories', ...Array.from(new Set(data.inventory.map(item => item.category))).sort()]} onChange={setCategory} /></PageHeader><div className="inventory-banner"><div className="inventory-banner-icon"><Package size={22} /></div><div><strong>{money(value)}</strong><span>Current inventory value</span></div><div className="inventory-alert"><AlertTriangle size={16} /><span><strong>{data.inventory.filter(item => item.quantity <= item.minimum).length} items</strong> are below minimum stock</span></div><Button variant="secondary" onClick={() => setModal('reorder')}>Stock movement</Button></div><section className="panel table-panel"><div className="table-toolbar"><div><h2 className="table-title">Inventory items</h2><span className="table-caption">Quantities update when materials are consumed on jobs</span></div><div className="inline-search"><Search size={16} /><input placeholder="Search stock" value={itemQuery} onChange={event => setItemQuery(event.target.value)} aria-label="Search stock items" /></div></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Cost / unit</th><th>Stock health</th><th>Action</th></tr></thead><tbody>{items.map(item => { const low = item.quantity <= item.minimum; return <tr key={item.id}><td><div className="person-cell"><span className="table-product"><Package size={16} /></span><span><strong>{item.name}</strong><small>{item.id.toUpperCase()} · {item.unit}</small></span></div></td><td>{item.category}</td><td><strong>{item.quantity} {item.unit}</strong><small>Minimum {item.minimum}</small></td><td>{money(item.cost)}</td><td><span className={`stock-health ${low ? 'low' : 'healthy'}`}><i />{low ? 'Reorder soon' : 'Healthy'}</span></td><td><button className="more-button" onClick={() => { setModalData(item); setModal('reorder'); }}>Adjust</button></td></tr>; })}{!items.length && <tr><td colSpan={7}><EmptyState title="No stock items match" description="Try a different search term or add a new item." /></td></tr>}</tbody></table></div></section></>;
}
