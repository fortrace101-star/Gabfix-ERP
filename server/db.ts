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
  costCategories: unknown[];
  suppliers: unknown[];
  depreciationEntries: unknown[];
  laundryItems: unknown[];
  inventoryMovements: unknown[];
  purchaseRequests: unknown[];
  toolCheckouts: unknown[];
  utilityCaptures: unknown[];
};

const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));

/** Load the whole workspace from PostgreSQL, shaped exactly like the frontend AppData type. */
export async function getData(): Promise<AppData> {
  const [customers, services, jobs, invoices, expenses, laundry, equipment, inventory, payments, costCategories, suppliers, depreciationEntries, laundryItems, inventoryMovements, purchaseRequests, toolCheckouts, utilityCaptures] = await Promise.all([
    pool.query(`SELECT id, name, company, type, phone, email, balance::float8 AS balance, status FROM customers ORDER BY id`),
    pool.query(`SELECT id, name, division, method, price::float8 AS price, active FROM services ORDER BY id`),
    pool.query(`SELECT id, number, customer_id AS "customerId", service_id AS "serviceId",
                       date::text AS date, scheduled_date::text AS "scheduledDate",
                       quote_date::text AS "quoteDate", promised_at::text AS "promisedAt",
                       status, priority, revenue::float8 AS revenue, cost::float8 AS cost,
                       assignees, equipment_usage AS "equipmentUsage",
                       salesperson_id AS "salespersonId", manager_id AS "managerId",
                       site_address AS "siteAddress", lat::float8 AS lat, lng::float8 AS lng
                FROM jobs ORDER BY date DESC, id DESC`),
    pool.query(`SELECT id, number, customer_id AS "customerId", date::text AS date, due::text AS due,
                       total::float8 AS total, paid::float8 AS paid, status
                FROM invoices ORDER BY date DESC, id DESC`),
    pool.query(`SELECT id, category, description, amount::float8 AS amount,
                       date::text AS date, division
                FROM expenses ORDER BY date DESC, id DESC`),
    pool.query(`SELECT id, number, customer_id AS "customerId", status, total::float8 AS total, paid::float8 AS paid,
                       items, received::text AS received,
                       promised_at::text AS "promisedAt", ready_at::text AS "readyAt",
                       collected_at::text AS "collectedAt", job_id AS "jobId",
                       weight_kg::float8 AS "weightKg", pieces
                FROM laundry_orders ORDER BY received DESC, id DESC`),
    pool.query(`SELECT id, name, serial_number AS "serialNumber", type, value::float8 AS value,
                       book_value::float8 AS "bookValue", condition, next_maintenance::text AS "nextMaintenance",
                       usage::float8 AS usage, purchase_date::text AS "purchaseDate",
                       cost::float8 AS cost, salvage_value::float8 AS "salvageValue",
                       useful_life_months AS "usefulLifeMonths", depreciation_method AS "depreciationMethod",
                       accumulated_depreciation::float8 AS "accumulatedDepreciation",
                       disposed_at::text AS "disposedAt",
                       custodian_employee_id AS "custodianEmployeeId"
                FROM equipment ORDER BY id`),
    pool.query(`SELECT id, name, category, unit, quantity::float8 AS quantity, minimum::float8 AS minimum,
                       cost::float8 AS cost, code, location, kind,
                       supplier_id AS "supplierId"
                FROM inventory_items ORDER BY id`),
    pool.query(`SELECT id, number, direction, customer_id AS "customerId", method_id AS "methodId",
                       amount::float8 AS amount, currency, reference, invoice_id AS "invoiceId",
                       laundry_order_id AS "laundryOrderId", job_id AS "jobId", status,
                       received_at::text AS "receivedAt"
                FROM payments WHERE deleted_at IS NULL ORDER BY received_at DESC, id DESC`),
    pool.query(`SELECT id, name, gl_account_code AS "glAccountCode", kind FROM cost_categories
                WHERE deleted_at IS NULL ORDER BY name`),
    pool.query(`SELECT id, name, phone, email, notes,
                       contact, categories, spend_ytd::float8 AS "spendYtd", rating
                FROM suppliers WHERE deleted_at IS NULL ORDER BY name`),
    pool.query(`SELECT id, equipment_id AS "equipmentId", period, amount::float8 AS amount,
                       accumulated::float8 AS accumulated, book_value::float8 AS "bookValue",
                       created_at::text AS "createdAt"
                FROM asset_depreciation_entries ORDER BY equipment_id, period`),
    pool.query(`SELECT id, order_id AS "orderId", service_id AS "serviceId", description,
                       qty::float8 AS qty, unit, unit_price::float8 AS "unitPrice",
                       amount::float8 AS amount
                FROM laundry_order_items ORDER BY order_id, id`),
    pool.query(`SELECT id, item_id AS "itemId", type, qty::float8 AS qty, reference,
                       moved_on::text AS "movedOn", by_name AS "byName"
                FROM inventory_movements ORDER BY moved_on DESC, id DESC`),
    pool.query(`SELECT id, item_id AS "itemId", description, qty::float8 AS qty,
                       supplier_id AS "supplierId", value::float8 AS value,
                       requested_by AS "requestedBy", requested_on::text AS "requestedOn",
                       status, decided_by AS "decidedBy", decided_on::text AS "decidedOn"
                FROM purchase_requests ORDER BY requested_on DESC, id DESC`),
    pool.query(`SELECT id, code, name, condition, status,
                       holder_employee_id AS "holderEmployeeId", holder_name AS "holderName",
                       job_id AS "jobId", job_label AS "jobLabel", due_back::text AS "dueBack", notes,
                       equipment_id AS "equipmentId"
                FROM tool_checkouts ORDER BY id`),
    pool.query(`SELECT id, captured_on::text AS "capturedOn", type, reference, reading,
                       amount::float8 AS amount, category_kind AS "categoryKind",
                       captured_by AS "capturedBy", status, expense_id AS "expenseId"
                FROM utility_captures ORDER BY captured_on DESC, id DESC`),
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
    costCategories: costCategories.rows,
    suppliers: suppliers.rows,
    depreciationEntries: depreciationEntries.rows,
    laundryItems: laundryItems.rows,
    inventoryMovements: inventoryMovements.rows,
    purchaseRequests: purchaseRequests.rows,
    toolCheckouts: toolCheckouts.rows,
    utilityCaptures: utilityCaptures.rows,
  };
}
