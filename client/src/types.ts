export type View = 'dashboard' | 'jobs' | 'customers' | 'finance' | 'laundry' | 'equipment' | 'inventory' | 'reports' | 'settings';
export type Modal = 'job' | 'customer' | 'expense' | 'service' | 'equipment' | 'job-status' | null;
export type JobStatus = 'Completed' | 'In Progress' | 'Scheduled' | 'Quoted';

export type Branch = { id: string; name: string; location: string };
export type Customer = { id: string; name: string; company: string; type: string; phone: string; email: string; balance: number; status: string };
export type Service = { id: string; name: string; division: string; method: string; price: number; active: boolean };
export type Job = { id: string; number: string; customerId: string; branchId: string; serviceId: string; date: string; status: JobStatus; revenue: number; cost: number; assignees: string[]; equipmentUsage?: { equipmentId: string; hours: number }[] };
export type Invoice = { id: string; number: string; customerId: string; date: string; due: string; total: number; paid: number; status: string };
export type Expense = { id: string; category: string; description: string; amount: number; branchId: string; date: string; division: string };
export type LaundryOrder = { id: string; number: string; customerId: string; status: string; total: number; paid: number; items: string; received: string };
export type Equipment = { id: string; name: string; serialNumber: string; type: string; branchId: string; value: number; bookValue: number; condition: string; nextMaintenance: string; usage: number };
export type InventoryItem = { id: string; name: string; category: string; unit: string; quantity: number; minimum: number; cost: number; branchId: string };
export type AppData = { branches: Branch[]; customers: Customer[]; services: Service[]; jobs: Job[]; invoices: Invoice[]; expenses: Expense[]; laundry: LaundryOrder[]; equipment: Equipment[]; inventory: InventoryItem[] };
