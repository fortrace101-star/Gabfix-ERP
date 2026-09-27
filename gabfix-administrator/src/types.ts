export type View = 'dashboard' | 'jobs' | 'customers' | 'finance' | 'laundry' | 'equipment' | 'inventory' | 'reports' | 'settings';
export type Modal = 'job' | 'customer' | 'expense' | 'service' | 'equipment' | 'equipment-update' | 'job-status' | 'inventory' | 'reorder' | 'laundry-intake' | 'laundry-status' | null;
export type JobStatus = 'Completed' | 'In Progress' | 'Scheduled' | 'Quoted';

export type Customer = { id: string; name: string; company: string; type: string; phone: string; email: string; balance: number; status: string };
export type Service = { id: string; name: string; division: string; method: string; price: number; active: boolean };
export type Job = { id: string; number: string; customerId: string; serviceId: string; date: string; status: JobStatus; revenue: number; cost: number; assignees: string[]; equipmentUsage?: { equipmentId: string; hours: number }[] };
export type Invoice = { id: string; number: string; customerId: string; date: string; due: string; total: number; paid: number; status: string };
export type Expense = { id: string; category: string; description: string; amount: number; date: string; division: string };
export type LaundryOrder = { id: string; number: string; customerId: string; status: string; total: number; paid: number; items: string; received: string; promisedAt?: string | null; readyAt?: string | null; collectedAt?: string | null; jobId?: string | null; weightKg?: number; pieces?: number };
export type Equipment = { id: string; name: string; serialNumber: string; type: string; value: number; bookValue: number; condition: string; nextMaintenance: string; usage: number; purchaseDate?: string | null; cost?: number; salvageValue?: number; usefulLifeMonths?: number | null; depreciationMethod?: string; accumulatedDepreciation?: number; disposedAt?: string | null; custodianEmployeeId?: string | null };
export type DepreciationEntry = { id: number; equipmentId: string; period: string; amount: number; accumulated: number; bookValue: number; createdAt: string };
export type InventoryItem = { id: string; name: string; category: string; unit: string; quantity: number; minimum: number; cost: number };
export type LaundryItem = { id: number; orderId: string; serviceId?: string | null; description: string; qty: number; unit: string; unitPrice: number; amount: number };
export type AppData = { customers: Customer[]; services: Service[]; jobs: Job[]; invoices: Invoice[]; expenses: Expense[]; laundry: LaundryOrder[]; equipment: Equipment[]; inventory: InventoryItem[]; payments?: Payment[]; costCategories?: CostCategory[]; suppliers?: Supplier[]; depreciationEntries?: DepreciationEntry[]; laundryItems?: LaundryItem[] };

export type Payment = { id: string; number: string; direction: string; customerId?: string | null; methodId?: string | null; amount: number; currency: string; reference: string; invoiceId?: string | null; laundryOrderId?: string | null; jobId?: string | null; status: string; receivedAt: string };
export type CostCategory = { id: string; name: string; glAccountCode?: string | null; kind: string };
export type Supplier = { id: string; name: string; phone: string; email: string; notes: string };

/** Workspace identity edited in Settings → Company profile, persisted per browser. */
export type WorkspaceProfile = { companyName: string; tagline: string; phone: string; address: string; currency: string; basis: string; logo: string };
