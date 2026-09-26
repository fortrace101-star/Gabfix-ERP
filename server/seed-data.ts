import type { ClientBase } from 'pg';
import bcrypt from 'bcryptjs';

/**
 * Ensures an owner employee exists, mapping to the hardcoded sidebar chip
 * (Gabriel N. / Owner account). Runs on every bootstrap so databases seeded
 * before identity landed still get their owner (Phase 0.4).
 *
 * The initial password comes from OWNER_PASSWORD (see .env.example) and is
 * hashed here rather than in SQL. Change it after first login.
 */
export async function ensureOwner(client: ClientBase): Promise<void> {
  const existing = await client.query(
    `SELECT 1 FROM employees WHERE role = 'owner' AND deleted_at IS NULL LIMIT 1`,
  );
  if (existing.rows.length) return;

  const password = process.env.OWNER_PASSWORD || 'gabfix-owner';
  const pinHash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO employees (id, name, role, phone, email, pin_hash, active)
     VALUES ('00000000-0000-4000-8000-000000000001', 'Gabriel N.', 'owner', '', '', $1, TRUE)
     ON CONFLICT (id) DO NOTHING`,
    [pinHash],
  );
  console.log('[db] Owner employee ensured (password from OWNER_PASSWORD)');
}

/**
 * Seeds the initial Gabfix demo data — the same records the app previously shipped
 * with in the frontend (seedData in App.tsx).
 */
export async function seedData(client: ClientBase) {
  await client.query(
    `INSERT INTO customers (id, name, company, type, phone, email, balance, status) VALUES
      ('c1', 'Sarah Namuli', '', 'Residential', '+256 772 441 208', 'sarah@example.com', 0, 'Active'),
      ('c2', 'ABC Offices Ltd', 'ABC Offices Ltd', 'Corporate Client', '+256 701 820 445', 'admin@abcoffices.ug', 1250000, 'Active'),
      ('c3', 'Mirembe Properties', 'Mirembe Properties', 'Property Manager', '+256 759 114 801', 'hello@mirembe.ug', 760000, 'Active'),
      ('c4', 'David Kato', '', 'Residential', '+256 788 210 117', 'david@example.com', 0, 'Active'),
      ('c5', 'Greenfield Academy', 'Greenfield Academy', 'Institution', '+256 704 556 233', 'finance@greenfield.ug', 2180000, 'Active'),
      ('c6', 'Nakasero Apartments', 'Nakasero Apartments', 'Corporate Client', '+256 778 100 440', 'manager@nakasero.ug', 0, 'Active'),
      ('c7', 'James Okello', '', 'Walk-in Customer', '+256 753 993 200', 'james@example.com', 85000, 'Active'),
      ('c8', 'Lakeside Restaurant', 'Lakeside Restaurant', 'Business', '+256 700 002 341', 'accounts@lakeside.ug', 430000, 'Active')
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO services (id, name, division, method, price, active) VALUES
      ('s1', 'House Cleaning', 'Cleaning Services', 'Fixed price', 180000, TRUE),
      ('s2', 'Deep Cleaning', 'Cleaning Services', 'Fixed price', 420000, TRUE),
      ('s3', 'Office Cleaning Contract', 'Contract Cleaning', 'Per visit', 650000, TRUE),
      ('s4', 'Car Detailing', 'Vehicle Services', 'Per vehicle', 220000, TRUE),
      ('s5', 'Electrical Repair', 'Home Solutions', 'Per hour', 120000, TRUE),
      ('s6', 'Plumbing', 'Home Solutions', 'Custom quotation', 250000, TRUE),
      ('s7', 'AC Cleaning', 'Home Solutions', 'Per machine', 150000, TRUE),
      ('s8', 'Laundry per KG', 'Laundry', 'Per kilogram', 5000, TRUE),
      ('s9', 'Laundry per Item', 'Laundry', 'Per item', 3000, TRUE),
      ('s10', 'Ironing', 'Laundry', 'Per item', 1000, TRUE),
      ('s11', 'Carpet Cleaning', 'Cleaning Services', 'Per square meter', 12000, TRUE),
      ('s12', 'Post Construction Cleaning', 'Cleaning Services', 'Custom quotation', 800000, TRUE)
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO jobs (id, number, customer_id, service_id, date, status, revenue, cost, assignees, equipment_usage) VALUES
      ('j1', 'JOB-00142', 'c2', 's3', '2026-09-03', 'In Progress', 650000, 280000, '{"Moses K.","Agnes N."}', '[]'),
      ('j2', 'JOB-00141', 'c1', 's2', '2026-09-03', 'Completed', 420000, 135000, '{"Sarah A."}', '[]'),
      ('j3', 'JOB-00140', 'c5', 's7', '2026-09-02', 'Scheduled', 450000, 95000, '{"John O."}', '[]'),
      ('j4', 'JOB-00139', 'c4', 's4', '2026-09-02', 'Completed', 220000, 70000, '{"Peter L."}', '[]'),
      ('j5', 'JOB-00138', 'c3', 's5', '2026-09-01', 'Completed', 540000, 260000, '{"David T."}', '[]'),
      ('j6', 'JOB-00137', 'c8', 's6', '2026-08-31', 'Quoted', 780000, 320000, '{}', '[]')
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO invoices (id, number, customer_id, date, due, total, paid, status) VALUES
      ('i1', 'INV-00098', 'c2', '2026-08-30', '2026-09-06', 3250000, 2000000, 'Partially Paid'),
      ('i2', 'INV-00097', 'c5', '2026-08-18', '2026-09-01', 2180000, 0, 'Overdue'),
      ('i3', 'INV-00096', 'c3', '2026-08-28', '2026-09-11', 1760000, 1000000, 'Partially Paid'),
      ('i4', 'INV-00095', 'c1', '2026-08-26', '2026-08-30', 420000, 420000, 'Paid'),
      ('i5', 'INV-00094', 'c4', '2026-08-25', '2026-08-25', 220000, 220000, 'Paid')
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO expenses (id, category, description, amount, date, division) VALUES
      ('e1', 'Payroll', 'August field team payroll', 4800000, '2026-08-30', 'Company overhead'),
      ('e2', 'Supplies', 'Cleaning chemicals & PPE', 1120000, '2026-09-01', 'Cleaning Services'),
      ('e3', 'Fuel', 'Field vehicles fuel', 680000, '2026-09-02', 'Company overhead'),
      ('e4', 'Repairs', 'Washer drain pump replacement', 350000, '2026-08-29', 'Laundry'),
      ('e5', 'Rent', 'September workspace rent', 1800000, '2026-09-01', 'Company overhead'),
      ('e6', 'Utilities', 'Water and electricity', 940000, '2026-08-28', 'Laundry')
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO laundry_orders (id, number, customer_id, status, total, paid, items, received) VALUES
      ('l1', 'LDY-00216', 'c7', 'Ready', 85000, 50000, '10kg wash + iron', '2026-09-03'),
      ('l2', 'LDY-00215', 'c1', 'Washing', 125000, 125000, 'Blankets, shirts, duvet', '2026-09-02'),
      ('l3', 'LDY-00214', 'c4', 'Collected', 64000, 64000, '16kg wash', '2026-09-01'),
      ('l4', 'LDY-00213', 'c6', 'Drying', 210000, 0, 'Hotel linen bundle', '2026-09-03')
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO equipment (id, name, serial_number, type, value, book_value, condition, next_maintenance, usage) VALUES
      ('a1', 'Industrial Washer WM-003', 'WM-2021-001', 'Washing machine', 10000000, 8500000, 'Good', '2026-09-10', 384),
      ('a2', 'Commercial Dryer DR-002', 'DR-2022-014', 'Dryer', 7600000, 6200000, 'Good', '2026-09-18', 292),
      ('a3', 'Toyota Hiace UBD 442K', 'UBD-442K', 'Vehicle', 48000000, 35600000, 'Good', '2026-09-06', 12840),
      ('a4', 'Karcher Pressure Washer', 'KPW-339-X', 'Pressure washer', 4200000, 3400000, 'Maintenance due', '2026-09-03', 118),
      ('a5', 'Industrial Ironing Press', 'IIP-880', 'Ironing machine', 5300000, 4900000, 'Good', '2026-10-01', 164)
     ON CONFLICT (id) DO NOTHING`
  );

  await client.query(
    `INSERT INTO inventory_items (id, name, category, unit, quantity, minimum, cost) VALUES
      ('inv1', 'Laundry detergent', 'Laundry supplies', 'kg', 18, 25, 14500),
      ('inv2', 'Fabric softener', 'Laundry supplies', 'litre', 42, 20, 12000),
      ('inv3', 'Disinfectant', 'Cleaning supplies', 'litre', 64, 30, 8500),
      ('inv4', 'Microfiber cloths', 'Cleaning supplies', 'pack', 11, 15, 22000),
      ('inv5', 'Car shampoo', 'Detailing materials', 'litre', 36, 12, 18000),
      ('inv6', 'Plumbing fittings', 'Repair materials', 'box', 8, 5, 95000)
     ON CONFLICT (id) DO NOTHING`
  );
}
