import type { AppData } from './types';

const request = async (path: string, options?: RequestInit) => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
};

/** Load the whole workspace from the backend (PostgreSQL). */
export const fetchData = (): Promise<AppData> => request('/api/data');

export const createCustomer = (customer: Record<string, unknown>) =>
  request('/api/customers', { method: 'POST', body: JSON.stringify(customer) });

export const createJob = (job: Record<string, unknown>) =>
  request('/api/jobs', { method: 'POST', body: JSON.stringify(job) });

export const updateJob = (id: string, patch: Record<string, unknown>) =>
  request(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const createExpense = (expense: Record<string, unknown>) =>
  request('/api/expenses', { method: 'POST', body: JSON.stringify(expense) });

export const createService = (service: Record<string, unknown>) =>
  request('/api/services', { method: 'POST', body: JSON.stringify(service) });

export const createEquipment = (equipment: Record<string, unknown>) =>
  request('/api/equipment', { method: 'POST', body: JSON.stringify(equipment) });

export const updateEquipment = (id: string, patch: Record<string, unknown>) =>
  request(`/api/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const createInventory = (item: Record<string, unknown>) =>
  request('/api/inventory', { method: 'POST', body: JSON.stringify(item) });

export const updateInventory = (id: string, patch: Record<string, unknown>) =>
  request(`/api/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

/** Replace all database records with a full backup payload. */
export const importData = (payload: AppData) =>
  request('/api/import', { method: 'POST', body: JSON.stringify(payload) });

/** Wipe the database and restore the original demo data. */
export const resetData = () => request('/api/reset', { method: 'POST' });
