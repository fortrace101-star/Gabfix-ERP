import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'gabfix',
  // Ensure unqualified table names always resolve to the public schema.
  options: '-c search_path=public',
});

export type AppData = {
  customers: unknown[];
  services: unknown[];
  jobs: unknown[];
  invoices: unknown[];
  expenses: unknown[];
  laundry: unknown[];
  equipment: unknown[];
  inventory: unknown[];
  payments: unknown[];
};

const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));

/** Load the whole workspace from PostgreSQL, shaped exactly like the frontend AppData type. */
export async function getData(): Promise<AppData> {
  const [customers, services, jobs, invoices, expenses, laundry, equipment, inventory, payments] = await Promise.all([
    pool.query(`SELECT id, name, company, type, phone, email, balance::float8 AS balance, status FROM customers ORDER BY id`),
    pool.query(`SELECT id, name, division, method, price::float8 AS price, active FROM services ORDER BY id`),
    pool.query(`SELECT id, number, customer_id AS "customerId", service_id AS "serviceId",
                       date::text AS date, status, revenue::float8 AS revenue, cost::float8 AS cost,
                       assignees, equipment_usage AS "equipmentUsage"
                FROM jobs ORDER BY date DESC, id DESC`),
    pool.query(`SELECT id, number, customer_id AS "customerId", date::text AS date, due::text AS due,
                       total::float8 AS total, paid::float8 AS paid, status
                FROM invoices ORDER BY date DESC, id DESC`),
    pool.query(`SELECT id, category, description, amount::float8 AS amount,
                       date::text AS date, division
                FROM expenses ORDER BY date DESC, id DESC`),
    pool.query(`SELECT id, number, customer_id AS "customerId", status, total::float8 AS total, paid::float8 AS paid,
                       items, received::text AS received
                FROM laundry_orders ORDER BY received DESC, id DESC`),
    pool.query(`SELECT id, name, serial_number AS "serialNumber", type, value::float8 AS value,
                       book_value::float8 AS "bookValue", condition, next_maintenance::text AS "nextMaintenance",
                       usage::float8 AS usage
                FROM equipment ORDER BY id`),
    pool.query(`SELECT id, name, category, unit, quantity::float8 AS quantity, minimum::float8 AS minimum,
                       cost::float8 AS cost
                FROM inventory_items ORDER BY id`),
    pool.query(`SELECT id, number, direction, customer_id AS "customerId", method_id AS "methodId",
                       amount::float8 AS amount, currency, reference, invoice_id AS "invoiceId",
                       laundry_order_id AS "laundryOrderId", job_id AS "jobId", status,
                       received_at::text AS "receivedAt"
                FROM payments WHERE deleted_at IS NULL ORDER BY received_at DESC, id DESC`),
  ]);

  return {
    customers: customers.rows,
    services: services.rows,
    jobs: jobs.rows.map((row) => ({ ...row, equipmentUsage: row.equipmentUsage ?? [] })),
    invoices: invoices.rows,
    expenses: expenses.rows,
    laundry: laundry.rows,
    equipment: equipment.rows.map((row) => ({ ...row, value: num(row.value), bookValue: num(row.bookValue), usage: num(row.usage) })),
    inventory: inventory.rows,
    payments: payments.rows,
  };
}
