import { useState, type FormEvent } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui';
import { useWorkspace, today } from '../app/store';
import { money } from '../lib/money';
import * as api from '../api';
import type { AppData, Equipment, InventoryItem, Job, JobStatus, LaundryOrder } from '../types';

/** Every workspace modal (Phase 0.10 client split): create forms + record update dialogs. */

const MODAL_TITLES: Record<string, string> = { job: 'Create a new job', customer: 'Add a customer', expense: 'Record an expense', service: 'Add a service', equipment: 'Add equipment', 'equipment-update': 'Update equipment', inventory: 'Add a stock item', reorder: 'Record stock movement', 'job-status': 'Update job status', 'laundry-intake': 'New laundry intake', 'laundry-status': 'Update laundry status' };

export function ModalShell() {
  const { modal, setModal, setModalData, modalData, data, notify, refresh } = useWorkspace();
  const close = () => { setModal(null); setModalData(null); };
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div className="modal"><div className="modal-header"><div><span className="eyebrow">Gabfix workspace</span><h2>{modal ? MODAL_TITLES[modal] : ''}</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div>{modal === 'job' && <JobForm data={data} close={close} notify={notify} refresh={refresh} />}{modal === 'customer' && <CustomerForm close={close} notify={notify} refresh={refresh} />}{modal === 'expense' && <ExpenseForm close={close} notify={notify} refresh={refresh} />}{modal === 'service' && <ServiceForm close={close} notify={notify} refresh={refresh} />}{modal === 'equipment' && <EquipmentForm close={close} notify={notify} refresh={refresh} />}{Boolean(modalData) && modal === 'job-status' && <JobStatusModal job={modalData as Job} data={data} close={close} notify={notify} refresh={refresh} />}{modal === 'inventory' && <InventoryForm close={close} notify={notify} refresh={refresh} />}{Boolean(modalData) && modal === 'equipment-update' && <EquipmentUpdateModal equipment={modalData as Equipment} data={data} close={close} notify={notify} refresh={refresh} />}{Boolean(modalData) && modal === 'reorder' && <StockMovementModal item={modalData as InventoryItem} close={close} notify={notify} refresh={refresh} />}{modal === 'laundry-intake' && <LaundryIntakeForm data={data} close={close} notify={notify} refresh={refresh} />}{Boolean(modalData) && modal === 'laundry-status' && <LaundryStatusModal order={modalData as LaundryOrder} close={close} notify={notify} refresh={refresh} />}</div></div>;
}

function JobStatusModal({ job, data, close, notify, refresh }: { job: Job; data: AppData; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [usage, setUsage] = useState<{ [key: string]: string }>(job.equipmentUsage?.reduce((acc, u) => ({ ...acc, [u.equipmentId]: String(u.hours) }), {}) || {});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const equipmentUsage = Object.entries(usage)
      .filter(([, hours]) => hours && Number(hours) > 0)
      .map(([equipmentId, hours]) => ({ equipmentId, hours: Number(hours) }));

    // Persist the update via the API, then refresh from the database
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
  void data;
  return (<form onSubmit={submit} className="modal-form"><div className="form-grid"><label className="full">Asset<strong>{equipment.name}</strong><small>SN: {equipment.serialNumber} · {equipment.type}</small></label><label>Book value (UGX)<input type="number" min="0" value={form.bookValue} onChange={event => update('bookValue', event.target.value)} /></label><label>Condition<select value={form.condition} onChange={event => update('condition', event.target.value)}><option>Good</option><option>Fair</option><option>Poor</option><option>Out of service</option></select></label><label>Usage (hours)<input type="number" min="0" value={form.usage} onChange={event => update('usage', event.target.value)} /></label><label>Service due<input type="date" value={form.nextMaintenance} onChange={event => update('nextMaintenance', event.target.value)} /></label></div><div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button icon={<Check size={16} />}>Save changes</Button></div></form>);
}

/** Laundry intake (Phase 1e): customer, promise, weight/pieces and priced lines. */
function LaundryIntakeForm({ data, close, notify, refresh }: { data: AppData; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ customerId: data.customers[0]?.id ?? '', promisedAt: '', weightKg: '', pieces: '', items: '' });
  const [lines, setLines] = useState<{ description: string; qty: string; unitPrice: string }[]>([{ description: '', qty: '1', unitPrice: '' }]);
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const updateLine = (index: number, key: string, value: string) => setLines(previous => previous.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  const addLine = () => setLines(previous => [...previous, { description: '', qty: '1', unitPrice: '' }]);
  const removeLine = (index: number) => setLines(previous => (previous.length > 1 ? previous.filter((_, i) => i !== index) : previous));
  const total = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.customerId) return;
    (async () => {
      try {
        await api.createLaundryIntake({
          customerId: form.customerId,
          promisedAt: form.promisedAt || undefined,
          weightKg: form.weightKg || undefined,
          pieces: form.pieces || undefined,
          items: form.items || undefined,
          lines: lines
            .filter(line => Number(line.qty) > 0 && Number(line.unitPrice) > 0)
            .map(line => ({ description: line.description || undefined, qty: Number(line.qty), unitPrice: Number(line.unitPrice) })),
        });
        await refresh();
        notify('Laundry intake recorded');
      } catch {
        notify('Could not record the intake');
      }
      close();
    })();
  };
  return <form onSubmit={submit} className="modal-form">
    <div className="form-grid">
      <label className="full">Customer
        <select required value={form.customerId} onChange={event => update('customerId', event.target.value)}>
          {data.customers.map(item => <option key={item.id} value={item.id}>{item.company || item.name}</option>)}
        </select>
      </label>
      <label>Promised date<input type="date" value={form.promisedAt} onChange={event => update('promisedAt', event.target.value)} /></label>
      <label>Weight (kg)<input type="number" min="0" step="0.1" placeholder="e.g. 8.5" value={form.weightKg} onChange={event => update('weightKg', event.target.value)} /></label>
      <label>Pieces<input type="number" min="0" step="1" placeholder="e.g. 22" value={form.pieces} onChange={event => update('pieces', event.target.value)} /></label>
      <label className="full">Intake note<input placeholder="e.g. 10kg wash + iron" value={form.items} onChange={event => update('items', event.target.value)} /></label>
    </div>
    <div className="full" style={{ marginTop: 12 }}>
      <strong>Priced lines</strong>
      {lines.map((line, index) => <div key={index} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input style={{ flex: 2 }} placeholder="Description" value={line.description} onChange={event => updateLine(index, 'description', event.target.value)} aria-label="Line description" />
        <input style={{ flex: 1 }} type="number" min="0" step="0.1" placeholder="Qty" value={line.qty} onChange={event => updateLine(index, 'qty', event.target.value)} aria-label="Line quantity" />
        <input style={{ flex: 1 }} type="number" min="0" placeholder="Unit price" value={line.unitPrice} onChange={event => updateLine(index, 'unitPrice', event.target.value)} aria-label="Line unit price" />
        <button type="button" className="icon-button" onClick={() => removeLine(index)} aria-label="Remove line" disabled={lines.length === 1}><Trash2 size={15} /></button>
      </div>)}
      <button type="button" className="linkish" style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer' }} onClick={addLine}><Plus size={14} /> Add line</button>
      <div style={{ marginTop: 8 }}><strong>Total: {money(total)}</strong></div>
    </div>
    <div className="modal-actions">
      <Button variant="secondary" onClick={close}>Cancel</Button>
      <Button icon={<Check size={16} />}>Record intake</Button>
    </div>
  </form>;
}

/** Laundry status move (Phase 1e): the server stamps ready/collected, never the client. */
function LaundryStatusModal({ order, close, notify, refresh }: { order: LaundryOrder; close: () => void; notify: (message: string) => void; refresh: () => Promise<void> }) {
  const STAGES = ['Received', 'Washing', 'Drying', 'Ready', 'Collected'];
  const [status, setStatus] = useState(order.status);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    (async () => {
      try {
        await api.updateLaundryStatus(order.id, status);
        await refresh();
        notify(`Order ${order.number} moved to ${status}`);
      } catch {
        notify('Could not update the order');
      }
      close();
    })();
  };
  return <form onSubmit={submit} className="modal-form">
    <div className="form-grid">
      <label className="full">Fulfilment stage
        <select value={status} onChange={event => setStatus(event.target.value)}>
          {STAGES.map(stage => <option key={stage}>{stage}</option>)}
        </select>
      </label>
    </div>
    <p style={{ margin: '8px 0 0' }}><small>Ready and Collected are stamped automatically when you move the order — the timeline cannot be backdated.</small></p>
    <div className="modal-actions">
      <Button variant="secondary" onClick={close}>Cancel</Button>
      <Button icon={<Check size={16} />}>Save status</Button>
    </div>
  </form>;
}
