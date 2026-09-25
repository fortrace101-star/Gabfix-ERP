/**
 * Table metadata for the generic write layer.
 *
 * A table only accepts the columns listed here, so unknown or misspelled fields
 * are dropped instead of reaching the database. Narrow, per-field validation
 * replaces this in Phase 0.7 (per-route zod schemas).
 */
export const TABLE_COLUMNS: Record<string, string[]> = {
  branches: ['name', 'location'],
  customers: ['name', 'company', 'type', 'phone', 'email', 'balance', 'status'],
  jobs: ['number', 'customer_id', 'branch_id', 'service_id', 'date', 'status', 'revenue', 'cost', 'assignees', 'equipment_usage'],
  invoices: ['number', 'customer_id', 'date', 'due', 'total', 'paid', 'status'],
  expenses: ['category', 'description', 'amount', 'branch_id', 'date', 'division'],
  laundry_orders: ['number', 'customer_id', 'status', 'total', 'paid', 'items', 'received'],
  services: ['name', 'division', 'method', 'price', 'active'],
  equipment: ['name', 'serial_number', 'type', 'branch_id', 'value', 'book_value', 'condition', 'next_maintenance', 'usage'],
  inventory_items: ['name', 'category', 'unit', 'quantity', 'minimum', 'cost', 'branch_id'],
};

// Columns stored as JSONB must be stringified before reaching the pg driver.
export const JSONB_COLUMNS = new Set(['equipment_usage']);

/** Table load order for a full workspace replace (parents before children). */
export const TABLE_ORDER: [table: string, dataKey: string][] = [
  ['branches', 'branches'],
  ['customers', 'customers'],
  ['services', 'services'],
  ['jobs', 'jobs'],
  ['invoices', 'invoices'],
  ['expenses', 'expenses'],
  ['laundry_orders', 'laundry'],
  ['equipment', 'equipment'],
  ['inventory_items', 'inventory'],
];

/** Tables wiped before a workspace replace or reset (order is irrelevant to TRUNCATE). */
export const TRUNCATE_TABLES = ['jobs', 'invoices', 'expenses', 'laundry_orders', 'equipment', 'inventory_items', 'customers', 'services', 'branches'];

/** Convert a camelCase API field name into its snake_case column name. */
export const snake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** Convert a camelCase API payload into (column, value) pairs for a table. */
export function toColumns(table: string, body: Record<string, unknown>) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) throw new Error(`Unknown table ${table}`);
  const entries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key === 'id') continue;
    const column = snake(key);
    if (!allowed.includes(column)) continue;
    entries.push([column, JSONB_COLUMNS.has(column) ? JSON.stringify(value ?? []) : value]);
  }
  if (!entries.length) throw new Error('No valid fields in request body');
  return entries;
}

/** Build an INSERT for one row of a known table. */
export function insertSql(table: string, entries: [string, unknown][], id: string) {
  const columns = entries.map(([column]) => column);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  return {
    text: `INSERT INTO ${table} (id, ${columns.map((c) => `"${c}"`).join(', ')}) VALUES ($${columns.length + 1}, ${placeholders}) RETURNING id`,
    values: [...entries.map(([, value]) => value), id],
  };
}

/** Fallback primary key for an imported row that arrives without one. */
export const placeholderId = (table: string) => `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
