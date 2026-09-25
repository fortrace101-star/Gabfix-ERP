import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, getData } from './db';
import { ensureDatabase } from './bootstrap-db';
import { seedData } from './seed-data';

const app = express();
app.use(cors());
app.use(express.json());

const snake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const required = (body: Record<string, unknown>, fields: string[]) => {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);
};

const TABLE_COLUMNS: Record<string, string[]> = {
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

// Columns stored as JSONB must be stringified before reaching the pg driver
const JSONB_COLUMNS = new Set(['equipment_usage']);

/** Convert a camelCase API payload into snake_case (column, value) pairs for a table. */
function toColumns(table: string, body: Record<string, unknown>) {
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

function insertSql(table: string, entries: [string, unknown][], id: string) {
  const columns = entries.map(([column]) => column);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  return {
    text: `INSERT INTO ${table} (id, ${columns.map((c) => `"${c}"`).join(', ')}) VALUES ($${columns.length + 1}, ${placeholders}) RETURNING id`,
    values: [...entries.map(([, value]) => value), id],
  };
}

const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === '23505';
const fail = (res: express.Response, error: unknown, fallback: string) => {
  if (isUniqueViolation(error)) return res.status(400).json({ error: 'A record with that number already exists' });
  return res.status(400).json({ error: error instanceof Error ? error.message : fallback });
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: process.env.PGDATABASE || 'gabfix' });
});

app.get('/api/data', async (_req, res) => {
  try {
    res.json(await getData());
  } catch (error) {
    console.error('GET /api/data failed:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const body = req.body ?? {};
    required(body, ['name', 'phone']);
    const entries = toColumns('customers', body);
    const id = `c${Date.now()}`;
    const { rows } = await pool.query(insertSql('customers', entries, id));
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    fail(res, error, 'Invalid customer');
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const body = req.body ?? {};
    required(body, ['number', 'customerId', 'branchId', 'serviceId', 'date', 'revenue']);
    const entries = toColumns('jobs', body);
    const id = `j${Date.now()}`;
    const { rows } = await pool.query(insertSql('jobs', entries, id));
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    fail(res, error, 'Invalid job');
  }
});

app.patch('/api/jobs/:id', async (req, res) => {
  try {
    const entries = toColumns('jobs', req.body ?? {});
    const sets = entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ');
    const { rowCount } = await pool.query(`UPDATE jobs SET ${sets} WHERE id = $${entries.length + 1}`, [...entries.map(([, value]) => value), req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Job not found' });
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, 'Invalid job update');
  }
});

app.patch('/api/equipment/:id', async (req, res) => {
  try {
    const entries = toColumns('equipment', req.body ?? {});
    const sets = entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ');
    const { rowCount } = await pool.query(`UPDATE equipment SET ${sets} WHERE id = $${entries.length + 1}`, [...entries.map(([, value]) => value), req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, 'Invalid equipment update');
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const body = req.body ?? {};
    required(body, ['category', 'description', 'amount', 'branchId']);
    const entries = toColumns('expenses', { ...body, date: body.date ?? new Date().toISOString().slice(0, 10) });
    const id = `e${Date.now()}`;
    const { rows } = await pool.query(insertSql('expenses', entries, id));
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    fail(res, error, 'Invalid expense');
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const body = req.body ?? {};
    required(body, ['name']);
    const entries = toColumns('services', body);
    const id = `s${Date.now()}`;
    const { rows } = await pool.query(insertSql('services', entries, id));
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    fail(res, error, 'Invalid service');
  }
});

app.post('/api/equipment', async (req, res) => {
  try {
    const body = req.body ?? {};
    required(body, ['name', 'serialNumber', 'value', 'branchId']);
    const entries = toColumns('equipment', {
      ...body,
      bookValue: body.bookValue ?? body.value,
      condition: body.condition ?? 'Good',
      nextMaintenance: body.nextMaintenance ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      usage: body.usage ?? 0,
    });
    const id = `a${Date.now()}`;
    const { rows } = await pool.query(insertSql('equipment', entries, id));
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    fail(res, error, 'Invalid equipment');
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const body = req.body ?? {};
    required(body, ['name', 'category', 'branchId']);
    const entries = toColumns('inventory_items', {
      ...body,
      unit: body.unit ?? 'unit',
      quantity: body.quantity ?? 0,
      minimum: body.minimum ?? 0,
      cost: body.cost ?? 0,
    });
    const id = `i${Date.now()}`;
    const { rows } = await pool.query(insertSql('inventory_items', entries, id));
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    fail(res, error, 'Invalid inventory item');
  }
});

app.patch('/api/inventory/:id', async (req, res) => {
  try {
    const entries = toColumns('inventory_items', req.body ?? {});
    const sets = entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ');
    const { rowCount } = await pool.query(`UPDATE inventory_items SET ${sets} WHERE id = $${entries.length + 1}`, [...entries.map(([, value]) => value), req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Inventory item not found' });
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, 'Invalid inventory update');
  }
});

const TABLE_ORDER: [string, string][] = [
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

app.post('/api/import', async (req, res) => {
  const payload = (req.body ?? {}) as Record<string, unknown>;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE jobs, invoices, expenses, laundry_orders, equipment, inventory_items, customers, services, branches CASCADE');
    for (const [table, dataKey] of TABLE_ORDER) {
      const rows = payload[dataKey];
      if (!Array.isArray(rows)) continue;
      const allowed = TABLE_COLUMNS[table];
      for (const row of rows as Record<string, unknown>[]) {
        const entries: [string, unknown][] = [];
        for (const [key, value] of Object.entries(row)) {
          const column = snake(key);
          if (!allowed.includes(column)) continue;
          entries.push([column, JSONB_COLUMNS.has(column) ? JSON.stringify(value ?? []) : value]);
        }
        const id = typeof row.id === 'string' && row.id ? row.id : `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { text, values } = insertSql(table, entries, id);
        await client.query(text, values);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('POST /api/import failed:', error);
    fail(res, error, 'Import failed');
  } finally {
    client.release();
  }
});

app.post('/api/reset', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE jobs, invoices, expenses, laundry_orders, equipment, inventory_items, customers, services, branches CASCADE');
    await seedData(client);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('POST /api/reset failed:', error);
    res.status(500).json({ error: 'Reset failed' });
  } finally {
    client.release();
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const port = Number(process.env.PORT) || 4000;

async function main() {
  // Make sure the database, its schema and demo data exist before serving.
  try {
    await ensureDatabase();
  } catch (error) {
    console.error('Database bootstrap failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Gabfix API listening on http://localhost:${port}`);
  });
}

void main();
