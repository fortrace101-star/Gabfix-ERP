import type { ReactNode } from 'react';
import { ArrowUpRight, BriefcaseBusiness, ChevronDown, ClipboardList, Download, Filter, Plus } from 'lucide-react';
import { downloadCsv } from '../lib/csv';
import { money, plain } from '../lib/money';

/** Small shared UI primitives extracted from App.tsx (Phase 0.10 client split). */

export function PageHeader({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; children?: ReactNode }) { return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="header-actions">{children}{action}</div></div>; }

export function Button({ children, onClick, variant = 'primary', icon, disabled }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; icon?: ReactNode; disabled?: boolean }) { return <button className={`button ${variant}`} onClick={onClick} disabled={disabled}>{icon}{children}</button>; }

export function EmptyState({ title = 'Nothing here yet', description = 'Create a record to start building your workspace.' }: { title?: string; description?: string }) { return <div className="empty-state"><div className="empty-icon"><ClipboardList size={22} /></div><strong>{title}</strong><span>{description}</span></div>; }

export function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className={`mini-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }

export function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="filter-select"><Filter size={15} /><select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={14} /></label>; }

export function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button className="quick-action" onClick={onClick}>{icon}<span>{label}</span><Plus size={14} /></button>; }

export function KpiCard({ label, value, trend, detail, icon, tone, down }: { label: string; value: string; trend: string; detail: string; icon: ReactNode; tone: string; down?: boolean }) { return <div className={`kpi-card ${tone}`}><div className="kpi-top"><span>{label}</span><div className="kpi-icon">{icon}</div></div><strong>{value}</strong><div className={`kpi-trend ${down ? 'negative' : ''}`}><span>{trend}</span><small>{detail}</small></div></div>; }

export function AlertRow({ icon, title, detail, tone, onClick }: { icon: ReactNode; title: string; detail: string; tone: string; onClick: () => void }) { return <button className="alert-row" onClick={onClick}><span className={`alert-icon ${tone}`}>{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={15} /></button>; }

export function ReportCard({ icon, title, description, selected, onClick }: { icon: ReactNode; title: string; description: string; selected: boolean; onClick: () => void }) { return <button className={`report-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}><span>{icon}</span><strong>{title}</strong><p>{description}</p><ArrowUpRight size={16} /></button>; }

export function CsvTable({ rows, filename, caption }: { rows: (string | number)[][]; filename: string; caption?: string }) {
  const [head, ...body] = rows;
  return <><div className="table-toolbar"><div>{caption && <h2 className="table-title">{caption}</h2>}<span className="table-caption">{body.length} record{body.length === 1 ? '' : 's'} · exportable to CSV</span></div><button className="more-button" onClick={() => downloadCsv(filename, rows)}><Download size={14} /> Export CSV</button></div><div className="table-wrap"><table><thead><tr>{head.map(cell => <th key={String(cell)}>{cell}</th>)}</tr></thead><tbody>{body.length ? body.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{typeof cell === 'number' ? plain(cell) : cell}</td>)}</tr>) : <tr><td colSpan={head.length}><EmptyState title="Nothing to show yet" /></td></tr>}</tbody></table></div></>;
}

export function RankedList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map(row => Math.abs(row.value)), 1);
  return <div className="division-list">{rows.map((row, index) => <div className="division-row" key={row.label}><div className="division-label"><span className={`division-icon d${index % 4}`}><BriefcaseBusiness size={15} /></span><strong>{row.label}</strong><span className="num">{money(row.value)}</span></div><div className="progress"><i style={{ width: `${Math.max(4, Math.abs(row.value) / max * 100)}%` }} /></div></div>)}</div>;
}
