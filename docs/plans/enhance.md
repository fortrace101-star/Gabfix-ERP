# Gabfix ERP - Comprehensive Enhancement Plan

| Field | Value |
| --- | --- |
| Document | enhance.md |
| Status | Plan complete; implementation not started |
| Integration posture | HYBRID (locked) |
| Date | 2026-09-24 |
| Requirements source | Gabfix adds.txt |
| Repository | Gabfix-ERP: client/ (React + Vite) and server/ (Express + PostgreSQL) |
| Baseline | commit 368586d (Client-Server Split) plus ~460 uncommitted working-tree changes |

---

## 1. Executive summary

- Gabfix ERP today is a working operations shell: 9 PostgreSQL tables exposed by a 13-endpoint Express API and rendered by a single 102 KB React file (client/src/App.tsx). It covers dashboard, jobs, customers, finance, laundry, equipment, inventory, reports and settings, and exports CSV only.
- Every item on the Gabfix adds list is absent in a materially important way, and three of them (payment methods, technician assignment, GPS tracking of company numbers) cannot exist at all without new entities, because the system has no users, no employees, no payment transactions and no devices.
- The locked posture is HYBRID: WhatsApp Cloud API (Meta) for customer notifications, appreciation and feedback; manual payment capture against a real payments ledger and double-entry journal; driver-PWA GPS on a Leaflet map; server-side pdfkit documents for financial, logistics and order paperwork.
- Delivery is sequenced in 8 phases. Phase 0 is the foundation that unlocks everything else (migrations, identity and roles, server route split, client split, validation, document numbering, Africa/Kampala time handling, SSE real-time, CI). No later phase can be built safely before it.
- Total estimated effort: 51-79 dev-days. The longest external lead time is Meta Business verification plus WhatsApp template approval (days to weeks); start it immediately because it gates Phase 3.
- Two plan corrections were made after inspecting the repository: server/.env is NOT committed (it is covered by .gitignore), and both the requirements text file and a stale scratch file scripts/reports-block.txt are untracked.

## 2. Locked decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Customer messaging | WhatsApp Cloud API (Meta) as primary channel; SMS via Africa AT as fallback; SMTP email for documents | Requires Meta Business verification, a WABA, an approved template set and a public HTTPS base URL for webhooks and document links |
| Payments | Manual capture now (cash, MTN MoMo, Airtel Money, bank, cheque) with reference and receipt, recorded in a payments table and posted to a double-entry journal; gateway (Pesapal or Flutterwave) added later behind the same provider interface | Payment methods become real immediately, without waiting for a gateway or provider onboarding |
| GPS | Driver PWA beacon on the company-issued phone numbers, posting to POST /api/telemetry/pings; Leaflet plus OpenStreetMap rendering; hardware telematics swappable later behind the same ingest endpoint | No hardware procurement blocks the feature; the same data model accepts MTN/Airtel tracker devices later |
| PDF | Server-side pdfkit so one generated document can be downloaded, emailed and attached to a WhatsApp message | One generator, many consumers, no duplicated report logic in the browser |
| Real-time | Server-Sent Events first (GET /api/events); Socket.IO added when chat, presence and live map streaming land | Zero new client dependencies for step one; upgrade path preserved |
| Identity | Self-hosted JWT plus pure-JS password hashing plus employees.role | Unblocks the managers dashboard, technician scoping and GPS privacy |
| Time zone | All business dates resolved in Africa/Kampala, on both client and server | Fixes a live correctness bug (see section 20) |

## 3. Verified environment and repository facts

- Dev machine: Node v22.22.1, npm 11.1.0.
- pdfkit latest is 0.20.2 and its engines.node is >= 20, so the installed Node is compatible. Its dependencies are pure JavaScript (fflate, png-js, fontkit, linebreak, @noble/hashes, @noble/ciphers): no native compilation and no headless Chromium. It ships no TypeScript types, so @types/pdfkit (latest 0.17.6) is required.
- react-leaflet v5 targets React 19, so the React 18 line is v4: react-leaflet ^4.2.1 with leaflet ^1.9.4 and @types/leaflet in devDependencies. Leaflet CSS must be imported explicitly.
- Already in use: Express 5, pg 8.23, TypeScript 5.5, Vite 5.4, React 18.3, lucide-react, tailwind (fonts only; the UI is hand-written CSS).
- The client already has a @/* path alias configured in both client/tsconfig.app.json and client/vite.config.ts; new feature code should use it. The server has no path alias and uses relative imports.
- developers.facebook.com was unreachable from the planning environment, so the Graph API version, message endpoint shape and current template approval rules must be verified against live documentation at implementation time rather than assumed.
- Repository hygiene: .gitignore covers .env, dist and logs; server/.env is therefore NOT tracked; there are 32 tracked files; client/dist exists on disk from a previous build but is ignored. Currently uncommitted: README.md, client/src/App.tsx (+366 lines), client/src/api.ts, client/src/index.css (+82), client/src/types.ts, client/tailwind.config.js, server/index.ts (+33). Untracked: Gabfix adds.txt and scripts/reports-block.txt.
- Both client/package.json and server/package.json declare gabfix-erp as a file:.. dependency, which installs the repository root inside both node_modules folders. This circular self-install must be removed.

## 4. Current system audit

### 4.1 Data model (server/schema.sql)

| Table | Key columns | Material gaps |
| --- | --- | --- |
| branches | id, name, location | no contact details, no geo coordinates |
| customers | id, name, company, type, phone, email, balance, status | balance is displayed but never maintained by any code path |
| services | id, name, division, method, price, active | no cost basis, no tax, no unit |
| jobs | id, number, customer_id, branch_id, service_id, date, status, revenue, cost, assignees (text[]), equipment_usage (jsonb) | one date only; assignees are free-text names; cost is a single number |
| invoices | id, number, customer_id, date, due, total, paid, status | no line items, no payment method, no payment records |
| expenses | id, category, description, amount, branch_id, date, division | no supplier, no tax, no attachment, no approval |
| laundry_orders | id, number, customer_id, status, total, paid, items (text), received | items are free text; no branch; one date only |
| equipment | id, name, serial_number, type, branch_id, value, book_value, condition, next_maintenance, usage | no purchase date, no depreciation method or schedule, no custodian, no disposal |
| inventory_items | id, name, category, unit, quantity, minimum, cost, branch_id | no movement history (the stock movement modal writes only the new quantity) |

All nine tables lack created_at, updated_at, created_by and deleted_at; there is no audit trail anywhere. Ids are TEXT values generated as timestamp strings in the API, and new columns can never reach an existing database because the schema is applied with CREATE TABLE IF NOT EXISTS only.

### 4.2 API surface (server/index.ts, 282 physical lines)

GET /api/health, GET /api/data (whole workspace), POST /api/customers, POST /api/jobs, PATCH /api/jobs/:id, PATCH /api/equipment/:id, POST /api/expenses, POST /api/services, POST /api/equipment, POST /api/inventory, PATCH /api/inventory/:id, POST /api/import, POST /api/reset. There is no DELETE anywhere, no pagination or filtering, no authentication, and cors() is unrestricted.

### 4.3 Client application

One file, client/src/App.tsx: 665 physical lines and 102 KB, with several 3000-character lines. Nine views switched by a view string in state (no router), every modal in one file, CSV helpers duplicated (exportCsv, toCsv, downloadCsv), the settings profile persisted in localStorage rather than the database, and two duplicate keydown listeners both handling Escape and Ctrl/Cmd+K.

### 4.4 Exports, notifications and real-time

- Exports: CSV only, through downloadCsv and CsvTable (reports, customers, finance, settings). There is no PDF, no printable invoice and no document of any kind.
- Notifications: the bell panel and dashboard alerts are derived in the browser from live records and are never persisted. There is no channel, no template, no delivery status and no read state.
- Real-time: none. Two staff on the same database see stale data until a manual refresh, because every screen depends on one whole-workspace fetch.

### 4.5 Confirmed absent capabilities

No pdf/jspdf/puppeteer, no whatsapp/twilio/sms integration, no websocket or SSE, no gps/geolocation/map dependency, no auth or session, no employees or roles, no payment records, no chart of accounts or journal, no job cost lines, no migrations, no tests and no CI.
---

## 5. Requirements traceability

| # | Requirement (Gabfix adds.txt) | Current state | Plan response | Phase |
| --- | --- | --- | --- | --- |
| 1 | Job dates (Laundry and Jobs) | jobs.date and laundry_orders.received only | job_events timeline plus explicit date columns: quote, scheduled, started, completed, invoiced, paid, promised; laundry received, promised, ready, collected; stage stepper and calendar view | 1 |
| 2 | Customer feedback and appreciation via WhatsApp | absent | feedback_requests tokens, public /feedback/:token form, post-job appreciation template 24 hours later, WhatsApp reply ingestion, CSAT reporting | 3 |
| 3 | GPS tracking of company numbers assigned to employees | absent | employees + devices (msisdn) + location_pings + geofences, /field PWA beacon, live Leaflet map, trail replay, trip PDF | 4 |
| 4 | Payment methods | invoices carry total/paid/status only; the Settings Payment methods section is a summary table | payment_methods lookup, payments transactions with method, reference and receipt, journal posting, recomputed balances | 1 |
| 5 | Jobs assigned to individual employees / technicians | free-text text[] assignees | employees registry, job_assignments join table, technician-scoped view, workload and utilisation | 4 |
| 6 | P/L, Expenses, Assets | an expenses list and equipment with hand-typed book value | chart_of_accounts, journal_entries and journal_lines, real P&L and balance sheet, expense capture, asset register with depreciation schedules | 1 |
| 7 | Costs | a single jobs.cost, hardcoded at 36 percent of revenue in the job form | cost_categories, job_costs, timesheets at employees.hourly_rate, material costs from inventory, quoted versus actual | 1 |
| 8 | Sales persons jobs (managers dashboard entries) | absent | salesperson_id and manager_id on jobs, quotes-to-won pipeline, commissions, role-scoped manager dashboard | 5 |
| 9 | Notifications to clients when jobs are done, with a feedback form | absent | job.completed domain event, approved WhatsApp template, persisted notification log with delivery status, feedback link | 3 |
| 10 | Completion message contains order information and cost | absent | one templated payload builder reused for WhatsApp, SMS, email and PDF: order/job number, service, branch, technician, dates, items, subtotal, total, paid, balance, feedback link | 3 |
| 11 | PDF downloads for financial, logistics and order information | CSV only | server-side pdfkit service with 12 document types and a PDF action wherever data is listed | 2 |
| 12 | Notifications and real-time communication are part of the workflow | browser-derived alerts only | SSE event bus plus persisted notifications now, Socket.IO chat and Inbox later | 3 and 6 |

## 6. Integrations required

### 6.1 Messaging

| Option | Notes | Verdict |
| --- | --- | --- |
| Meta WhatsApp Cloud API | Official, lowest cost per message, utility templates for order updates, inbound webhook for replies and delivery statuses, free-form replies only inside the 24 hour customer service window, requires Meta Business verification | Primary |
| Twilio WhatsApp | Faster onboarding and a useful sandbox, higher per-message cost | Alternative or fallback |
| Africa AT | Ugandan SMS, voice and USSD; best local SMS rates and local sender-ID approval | SMS fallback |
| Email (Resend, SendGrid or SMTP via nodemailer) | Needed to deliver PDF invoices, statements and scheduled reports | Document channel |

Placement: server/services/messaging/ exposes one interface (sendTemplate(templateKey, to, vars) and sendDocument(...)) with adapters whatsapp-cloud.ts, twilio.ts, africastalking.ts and email.ts. Inbound messages and delivery receipts arrive at server/routes/webhooks.ts. Template wording lives in the message_templates table so it can change without a deploy. WhatsApp template messages must be approved by Meta and are sent by name plus language; free-form text is only allowed inside the 24 hour window after the customer last wrote, and business-initiated messaging also requires opt-in and opt-out handling.

### 6.2 Real-time communication

| Option | Trade-off | Verdict |
| --- | --- | --- |
| Server-Sent Events (text/event-stream) | No new client dependency, one EventSource in client/src/lib/realtime.ts, ideal for notify-and-refresh; one-directional only | First step |
| Socket.IO | Rooms per branch or role, authenticated handshake, presence, acknowledgements and automatic reconnection; needed for two-way chat and live position streaming | Phase 6 |
| Polling | Simplest, but stale and wasteful; keep only as a degraded fallback | Fallback only |

Placement: route handlers emit domain events (job.assigned, job.started, job.completed, payment.recorded, laundry.ready, laundry.collected, ping.recorded, message.inbound, feedback.received) through server/services/realtime.ts; the client subscribes in a RealtimeProvider that invalidates only the affected React Query caches, replacing the current refresh-everything pattern.

### 6.3 GPS and fleet tracking

| Option | Notes | Verdict |
| --- | --- | --- |
| Driver PWA beacon | The company-issued phone posts navigator.geolocation.watchPosition() to the API every 45 seconds from an installable /field route; no hardware needed | First step |
| Hardware telematics | MTN or Airtel fleet SIMs with Teltonika-type trackers and a vendor API; true always-on tracking | Later, behind the same tables |
| Leaflet plus OpenStreetMap | Free tiles, no API key, react-leaflet v4 for React 18 | Rendering |
| Google Maps Platform | Better geocoding and directions for Uganda, but needs a key and billing | Optional add-on |
| Nominatim | Free reverse geocoding, rate limited | Optional |

Placement: employees, then devices (the company number), then location_pings, then location_daily_rollups; ingest in server/routes/telemetry.ts with geofence evaluation; UI in client/src/features/field-ops/ (LiveMap, DevicesView) plus the /field beacon page.

### 6.4 Payments

| Option | Notes | Verdict |
| --- | --- | --- |
| Manual capture | Cash, MoMo, bank or cheque with reference, receipt and journal posting | Now |
| Aggregator (Pesapal, Flutterwave, DusuPay, Yo! Payments) | One integration for MTN MoMo, Airtel Money, cards and bank collection, hosted checkout plus reconciliation webhooks; strong East African coverage | Phase 7 |
| Direct MTN MoMo and Airtel Money APIs | Lower fees, two integrations and more compliance work | Only if fees justify it |
| Stripe | International cards only | Optional |

Placement: POST /api/payments (manual) and later POST /api/payments/initiate plus POST /api/webhooks/payments, all behind a PaymentProvider interface in server/services/payments/.

### 6.5 Documents

| Option | Trade-off | Verdict |
| --- | --- | --- |
| pdfkit on the server | Pure JS, no Chromium, consistent numbering and authorisation, one generator reused for download, email and WhatsApp attachment | Chosen |
| Puppeteer HTML to PDF | Best template fidelity, but roughly 300 MB Chromium and a heavier deploy | Rejected for now |
| jsPDF in the browser | Instant download with no round trip, but duplicates report logic and cannot be attached server-side to email or WhatsApp | Rejected |

Placement: server/services/pdf/ with a shared layout kit, embedded Inter fonts, GET /api/documents/:type/:id.pdf, plus DOCUMENT_STORAGE_DIR mirroring so messaging can attach a URL.

### 6.6 Identity and access

JWT access and refresh tokens, pure-JS password hashing (bcryptjs avoids native build friction on this Windows setup), employees.role constrained to owner, manager, sales, technician, laundry and accountant, and requireRole() middleware. Without this, GPS privacy, the managers dashboard and technician scoping cannot be implemented correctly.

### 6.7 Background work, scheduling and observability

node-cron first, BullMQ plus Redis when retries and volume demand it: night-before job reminders, overdue invoice follow-ups, laundry-ready dispatch, appreciation messages 24 hours after completion, nightly depreciation, telemetry rollup and retention, and a nightly pg_dump backup. Add pino logging, helmet, express-rate-limit, zod validation, a health endpoint that checks the database and providers, and error reporting.

### 6.8 Provider lead times (start immediately)

| Item | Lead time | Notes |
| --- | --- | --- |
| Meta Business Manager plus business verification | days to weeks | Blocks all WhatsApp sending |
| WhatsApp Business phone number | same day once verified | Must NOT already be registered to WhatsApp or WhatsApp Business; removing it from that app is required first. This is precisely the company number described in the requirements |
| WhatsApp message templates | hours to days after submission | Order update templates belong to the utility category; incorrect categorisation causes rejection |
| Public HTTPS endpoint | same day with a tunnel | Required for webhooks and for WhatsApp document-by-URL; production needs a real certificate |
| Africa AT sender ID | days | Ugandan sender IDs require approval |
| Domain and mail sender (SPF, DKIM) | hours to days | Required for reliable delivery of PDF emails |

## 7. Configuration contract

server/.env.example (committed) mirrors the current .env plus:

| Variable | Purpose | Phase needed |
| --- | --- | --- |
| JWT_SECRET, JWT_TTL | Token signing and lifetime | 0 |
| TZ=Africa/Kampala | Business date resolution | 0 |
| APP_BASE_URL | Absolute links for feedback and document URLs | 0 (3 for messaging) |
| WHATSAPP_GRAPH_VERSION, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID | Meta identifiers | 3 |
| WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN | Sending and webhook verification | 3 |
| WHATSAPP_TEMPLATE_JOB_DONE, WHATSAPP_TEMPLATE_APPRECIATION | Approved template names | 3 |
| AT_USERNAME, AT_API_KEY, AT_SENDER_ID | SMS fallback | 3 |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM | Document delivery by email | 3 |
| DOCUMENT_STORAGE_DIR | Generated PDF storage and URL base | 2 |
| GPS_PING_INTERVAL_SECONDS, GPS_RETENTION_DAYS | Beacon cadence and telemetry retention | 4 |

Rules: provider keys are validated lazily at the feature that uses them, so the application must boot with them absent and log the channel as disabled; that keeps development unblocked while Meta verification is pending. Operational toggles (whatsapp_enabled, sms_enabled, gps_enabled) live in the database settings table, not in localStorage, so they are shared across staff and included in backups.

---

## 8. Data model changes

### 8.1 Why the migration mechanism comes first

The current schema is applied with CREATE TABLE IF NOT EXISTS by server/bootstrap-db.ts on every start. The consequence is that adding a column to an existing database silently does nothing: the application would run against an old schema with no error, which makes every later phase impossible. The replacement is:

- server/migrations/NNN_name.sql files, each applied exactly once and recorded in a schema_migrations table.
- server/migrate.ts contract: ensure schema_migrations(id text primary key, applied_at timestamptz); list migration files in lexicographic order; for each unapplied file run BEGIN, execute the file, INSERT the record, COMMIT; abort and name the failing file on error.
- New startup order in bootstrap-db.ts: create the database if missing, run migrate(), seed only when branches is empty, then listen. server/init-db.ts remains the manual entry point for npm run db:init.
- Additional rule: replace the generic TABLE_COLUMNS plus toColumns() insert helper with per-route zod schemas and explicit column maps, because the current helper silently drops any field it does not recognise. That defect is already live: the stock movement note entered in the UI is never stored.

### 8.2 Spine DDL

```sql
-- 003_identity.sql  (uuid keys; gen_random_uuid() is core in PostgreSQL 13+)
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','sales','technician','laundry','accountant')),
  phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', pin_hash text,
  branch_id text REFERENCES branches(id), hourly_rate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true, hired_on date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);

-- the company numbers assigned to employees in the field
CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  msisdn text NOT NULL UNIQUE, label text NOT NULL DEFAULT '', type text NOT NULL DEFAULT 'phone',
  employee_id uuid REFERENCES employees(id), active boolean NOT NULL DEFAULT true,
  installed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);

-- 010_telemetry.sql
CREATE TABLE location_pings (
  id bigserial PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id), employee_id uuid REFERENCES employees(id), job_id text REFERENCES jobs(id),
  lat double precision NOT NULL, lng double precision NOT NULL,
  accuracy_m real, speed_kmh real, heading real, battery smallint, source text NOT NULL DEFAULT 'pwa',
  recorded_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON location_pings (device_id, recorded_at DESC);
CREATE TABLE location_daily_rollups (
  device_id uuid, day date, first_at timestamptz, last_at timestamptz, distance_km numeric,
  max_speed_kmh real, points int, trail jsonb, PRIMARY KEY (device_id, day)
);
CREATE TABLE geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, kind text NOT NULL DEFAULT 'site',
  branch_id text REFERENCES branches(id), lat double precision NOT NULL, lng double precision NOT NULL,
  radius_m int NOT NULL DEFAULT 150, active boolean NOT NULL DEFAULT true
);

-- 005_money.sql
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cash','momo','bank','card','cheque','other')),
  provider text, gl_account_code text, active boolean NOT NULL DEFAULT true
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL UNIQUE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  customer_id text REFERENCES customers(id), branch_id text REFERENCES branches(id),
  method_id uuid REFERENCES payment_methods(id), amount numeric NOT NULL CHECK (amount <> 0),
  currency text NOT NULL DEFAULT 'UGX', reference text,
  invoice_id text REFERENCES invoices(id), laundry_order_id text REFERENCES laundry_orders(id), job_id text REFERENCES jobs(id),
  received_at timestamptz NOT NULL DEFAULT now(), gateway_ref text,
  status text NOT NULL DEFAULT 'confirmed', recorded_by uuid REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE chart_of_accounts (
  code text PRIMARY KEY, name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  parent_code text REFERENCES chart_of_accounts(code), active boolean NOT NULL DEFAULT true
);
CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL UNIQUE, date date NOT NULL,
  memo text NOT NULL DEFAULT '', source text NOT NULL, source_id text,
  branch_id text REFERENCES branches(id), posted_by uuid REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT now(), reversed_by uuid
);
CREATE TABLE journal_lines (
  id bigserial PRIMARY KEY, entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL REFERENCES chart_of_accounts(code),
  debit numeric NOT NULL DEFAULT 0, credit numeric NOT NULL DEFAULT 0,
  customer_id text, job_id text, employee_id uuid,
  CHECK (debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0))
);
-- invariant enforced in the ledger service: sum(debit) = sum(credit) per entry

-- 004_jobs_dates_assignments.sql  and  006_costing.sql
CREATE TABLE job_events (
  id bigserial PRIMARY KEY, job_id text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind text NOT NULL, at timestamptz NOT NULL DEFAULT now(),
  actor_employee_id uuid REFERENCES employees(id), payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE job_assignments (
  job_id text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, employee_id uuid NOT NULL REFERENCES employees(id),
  role text NOT NULL DEFAULT 'technician', assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz, completed_at timestamptz, PRIMARY KEY (job_id, employee_id)
);
CREATE TABLE cost_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  gl_account_code text REFERENCES chart_of_accounts(code), kind text NOT NULL DEFAULT 'direct'
);
CREATE TABLE job_costs (
  id bigserial PRIMARY KEY, job_id text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  category_id uuid REFERENCES cost_categories(id), description text NOT NULL DEFAULT '',
  qty numeric NOT NULL DEFAULT 1, unit_cost numeric NOT NULL DEFAULT 0, amount numeric NOT NULL DEFAULT 0,
  supplier_id uuid, source text NOT NULL DEFAULT 'manual', timesheet_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES employees(id)
);
CREATE TABLE timesheets (
  id bigserial PRIMARY KEY, employee_id uuid NOT NULL REFERENCES employees(id), job_id text REFERENCES jobs(id),
  started_at timestamptz NOT NULL, ended_at timestamptz, minutes int, rate numeric,
  approved_by uuid REFERENCES employees(id), created_at timestamptz NOT NULL DEFAULT now()
);

-- 008_logistics.sql
CREATE TABLE laundry_order_items (
  id bigserial PRIMARY KEY, order_id text NOT NULL REFERENCES laundry_orders(id) ON DELETE CASCADE,
  service_id text REFERENCES services(id), description text NOT NULL DEFAULT '',
  qty numeric NOT NULL DEFAULT 1, unit text NOT NULL DEFAULT 'item',
  unit_price numeric NOT NULL DEFAULT 0, amount numeric NOT NULL DEFAULT 0
);

-- 009_engagement.sql
CREATE TABLE message_templates (
  key text PRIMARY KEY, channel text NOT NULL, locale text NOT NULL DEFAULT 'en',
  provider_template_name text, category text, subject text, body text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}'::text[], approved boolean NOT NULL DEFAULT false
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_key text REFERENCES message_templates(key),
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','email','inapp')),
  customer_id text, employee_id uuid, job_id text, entity_type text, entity_id text,
  to_address text NOT NULL DEFAULT '', payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed','skipped')),
  provider_ref text, error text, attempts int NOT NULL DEFAULT 0,
  scheduled_for timestamptz, sent_at timestamptz, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notifications_dedupe ON notifications (template_key, channel, entity_type, entity_id) WHERE status <> 'failed';  -- partial so a failed send can be retried
CREATE TABLE feedback_requests (
  token text PRIMARY KEY, job_id text, laundry_order_id text, customer_id text REFERENCES customers(id),
  channel text NOT NULL, sent_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, used_at timestamptz
);
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token text REFERENCES feedback_requests(token),
  job_id text, laundry_order_id text, customer_id text REFERENCES customers(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5), comment text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'web', employee_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  submitted_at timestamptz NOT NULL DEFAULT now()
);
```

### 8.3 Remaining new tables

| Table | Purpose |
| --- | --- |
| document_sequences | key and next_value for gap-tolerant numbering of jobs, invoices, laundry orders, payments, journal entries |
| suppliers, purchase_orders | accurate material and subcontract cost capture for job costing |
| commissions | job_id, salesperson_id, rate, base, amount, period, status |
| conversations, messages | customer WhatsApp threads plus internal manager-to-technician chat for the Inbox |
| settings | one shared workspace settings row (company profile, currency, basis, provider toggles, GPS retention) replacing localStorage |
| asset_depreciation_entries | generated depreciation postings per asset per period |
| attachments | photos, signed delivery notes and job evidence linked to jobs, orders and assets |

### 8.4 Column additions to existing tables

| Table | Added columns |
| --- | --- |
| jobs | quote_date, scheduled_date, started_at, completed_at, invoiced_at, paid_at, promised_at, salesperson_id, manager_id, priority, site_address, lat, lng |
| laundry_orders | branch_id, promised_at, ready_at, collected_at, job_id, weight_kg, pieces |
| invoices | line items via a new invoice_items table, notes, terms, sent_at |
| equipment | purchase_date, cost, salvage_value, useful_life_months, depreciation_method, accumulated_depreciation, disposed_at, custodian_employee_id |
| customers | whatsapp number, opt_in flags, credit_limit, payment_terms_days, geo coordinates |
| expenses | supplier_id, tax_amount, attachment_id, approved_by, payment_id |
| inventory_items | reorder_quantity, preferred_supplier_id, location |
| services | cost_estimate, unit, tax_rate, sla_hours |
| all tables | created_at, updated_at, created_by, deleted_at |

### 8.5 Document numbering

A document_sequences table with one row per prefix (JOB, INV, LDY, PAY, JNL) and a nextNumber(key) helper using UPDATE ... RETURNING inside the same transaction as the insert. This retires the client-side JOB-${jobs.length + 143} scheme, which collides after any deletion or concurrent create, and gives invoices, payments and journal entries numbered documents for the first time.

### 8.6 Audit, soft delete and concurrency

Every table gains created_at, updated_at, created_by and deleted_at with a shared touch_updated_at() trigger. Reads filter deleted_at IS NULL by default; deletes become soft deletes so financial history is never destroyed. PATCH handlers compare updated_at to detect concurrent edits and return 409 rather than silently overwriting another user edit.

---

## 9. API surface

| Group | Endpoints |
| --- | --- |
| Identity | POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me |
| People and devices | GET/POST/PATCH /api/employees, GET/POST/PATCH /api/devices, POST /api/devices/:id/assign |
| Jobs, dates and assignment | GET /api/jobs (filters: branch, status, from, to, assignee, salesperson, page), POST /api/jobs, PATCH /api/jobs/:id, POST /api/jobs/:id/status, POST /api/jobs/:id/assign, GET /api/jobs/:id/timeline, GET /api/jobs/calendar, POST /api/jobs/:id/complete |
| Logistics | GET/POST/PATCH /api/laundry, POST /api/laundry/:id/status, POST /api/laundry/:id/items, POST /api/laundry/:id/collect |
| Money | POST /api/payments, GET /api/payments, GET/POST /api/payments/methods, GET/POST /api/expenses, GET/POST /api/assets, POST /api/assets/:id/depreciate, GET /api/accounts, POST /api/journal, POST /api/journal/:id/reverse |
| Reporting | GET /api/reports/pl, /api/reports/balance-sheet, /api/reports/cash-flow, /api/reports/aging, /api/reports/summary (all accept from, to, branch) |
| Field operations | POST /api/telemetry/pings (device authenticated), GET /api/telemetry/live, GET /api/telemetry/track/:employeeId, GET/POST/PATCH /api/geofences |
| Engagement | GET /api/notifications, POST /api/notifications/:id/read, GET /api/messages/threads, GET /api/messages/threads/:id, POST /api/messages, GET/POST/PATCH /api/templates, GET /api/feedback, GET /api/feedback/summary, POST /api/feedback/:token (public) |
| Webhooks | GET /api/webhooks/whatsapp (verification challenge), POST /api/webhooks/whatsapp (inbound messages, delivery statuses, opt-outs), POST /api/webhooks/payments |
| Documents | GET /api/documents/:type/:id.pdf |
| Real-time | GET /api/events (Server-Sent Events) |
| Compatibility | GET /api/data, POST /api/import, POST /api/reset, GET /api/health (extended to report provider status) |

### 9.1 Conventions

- List endpoints use a consistent envelope: rows, total, page, limit, and support sorting.
- Status codes: 401 unauthenticated, 403 wrong role, 404 missing, 409 concurrent edit detected via updated_at, 422 validation failure with per-field details.
- Error body shape: an error string plus optional details for field-level messages.
- Money-writing endpoints accept an idempotency key header so a double-submitted payment cannot post twice.
- Every write records created_by and is soft-deleted rather than removed.
- Public endpoints (feedback submission, WhatsApp and payment webhooks) are rate limited and verified by signature or token.

## 10. Client architecture

The 102 KB single file is replaced by the following structure. Existing styling conventions in client/src/index.css are preserved, with the extra feature CSS added in the same file or a small number of feature stylesheets to avoid the current duplication of blocks such as .notif-panel and .filter-select.

```
client/src/
  app/        router.tsx, providers.tsx (Auth, Query, Realtime, Toast), layout/{Sidebar,Topbar,PageShell}.tsx
  features/   dashboard/ manager/ jobs/ dispatch/ calendar/ customers/ field-ops/ employees/
              sales/ laundry/ finance/ payments/ expenses/ assets/ accounting/ inventory/
              equipment/ engagement/ reports/ settings/ feedback/ field/
  components/ DataTable (sortable, sticky header, paginated), StatusBadge, Modal (role=dialog + focus trap),
              PageHeader, Button, KpiCard, MiniStat, EmptyState, Toast, DateRangePicker, Timeline,
              MapView, AuthGuard, RequireRole, ConfirmDialog
  lib/        api.ts (typed fetch with auth), money.ts, dates.ts (Africa/Kampala), csv.ts (existing helpers),
              pdf.ts (authenticated download), realtime.ts (EventSource), validation.ts (shared zod schemas)
  types/      one file per domain area instead of a single types.ts
```

| Concern | Approach |
| --- | --- |
| Routing | react-router-dom v6 with lazy-loaded routes; deep links such as /jobs/JOB-00142, /feedback/:token and /field |
| Server state | @tanstack/react-query with query keys per domain (jobs, job, notifications, map, pl); mutations invalidate only affected keys |
| Real-time | one EventSource in providers.tsx; events map to cache invalidations, so no screen needs a manual refresh |
| Forms | keep the current controlled-input style, but validate with shared zod schemas so client and server agree |
| Money and dates | all formatting through lib/money.ts and lib/dates.ts; no ad-hoc Intl calls or UTC slicing inside components |
| Access control | AuthGuard blocks unauthenticated routes; RequireRole hides navigation and routes per role |
| PWA | a manifest and a /field route served by the same app so company phones can install the beacon |

## 11. Feature placement map

### 11.1 Navigation restructure

| Group (new) | Items |
| --- | --- |
| Workspace | Dashboard, Manager dashboard (new) |
| Operations | Jobs and contracts, Dispatch and assignments (new), Job calendar (new), Customers |
| Field ops (new) | Live map and GPS, Employees and technicians, Devices and numbers |
| Sales (new) | Salespersons and pipeline, Sales jobs (manager entries), Commissions |
| Logistics | Laundry operations, Laundry intake and collection, Delivery trips |
| Finance | Finance, Payments and methods (new), Expenses, Assets and depreciation (new) |
| Accounting (new) | Chart of accounts, Journal and ledger, P&L and balance sheet |
| Assets and stock | Equipment, Inventory |
| Engagement (new) | Inbox and conversations, Templates, Notification log, Feedback |
| Insight | Reports (extended with P&L, AR aging, job costing, technician productivity, trips) |
| Settings | Company profile (database backed), Payment methods, Roles and permissions, Provider keys, Data and backup |

### 11.2 Where each requirement lands

| Requirement | UI location | Server | Data |
| --- | --- | --- | --- |
| Job and laundry dates | Job detail stepper, laundry order detail, /calendar | jobs routes, timeline endpoint | job_events, new date columns |
| Completion message with cost | Triggered by job complete and laundry ready; visible in Inbox and notification log | jobs/laundry routes to messaging service | notifications, message_templates, feedback_requests |
| Customer feedback and appreciation | /feedback/:token public form, Feedback and CSAT screen, manager dashboard | feedback routes, webhook ingestion | feedback, feedback_requests |
| GPS tracking | /map, /employees, /devices, /field | telemetry routes, geofence service | devices, location_pings, geofences, rollups |
| Payment methods | Payments screen, payment modal on invoice and laundry order, Settings payment methods | payments routes | payments, payment_methods |
| Technician assignment | Job assign drawer, Dispatch board, technician home | jobs assign route | employees, job_assignments |
| P/L, expenses, assets | Accounting screens, Expenses, Assets and depreciation | journal and reports routes | chart_of_accounts, journal_entries, journal_lines, asset tables |
| Costs | Job cost tab, costing report | job cost routes, costing service | cost_categories, job_costs, timesheets |
| Sales persons and manager dashboard | /manager, /sales, commissions | salesperson fields on jobs, commission service | jobs.salesperson_id, commissions |
| PDF exports | PDF action on every list, report and detail screen | documents route and pdf service | document storage, sequences |
| Notifications and real-time | Bell panel backed by notifications, Inbox | realtime and notification services | notifications, conversations |

---

## 12. PDF document deliverables

| Document | Source data | Endpoint |
| --- | --- | --- |
| Invoice / tax invoice | invoice, line items, payments applied | GET /api/documents/invoice/:id.pdf |
| Payment receipt | payments row, method, reference | GET /api/documents/receipt/:id.pdf |
| Customer statement | customer, open invoices, payments in range | GET /api/documents/statement/:customerId.pdf |
| Job card / work order | job, assignments, dates, costs, equipment | GET /api/documents/job-card/:id.pdf |
| Laundry ticket | laundry order, items, dates | GET /api/documents/laundry/:id.pdf |
| Collection / delivery manifest | all orders ready or dispatched on a date | GET /api/documents/manifest/:date.pdf |
| Delivery note with signature | order, signature image, receiving person | GET /api/documents/delivery-note/:id.pdf |
| Profit and loss statement | journal lines in range | GET /api/documents/pl.pdf |
| Balance sheet and cash flow | journal lines in range | GET /api/documents/balance-sheet.pdf |
| Accounts receivable aging | invoices by age bucket | GET /api/documents/aging.pdf |
| Asset register and depreciation schedule | assets and depreciation entries | GET /api/documents/assets.pdf |
| Trip and GPS report | location_pings and rollups for a job or day | GET /api/documents/trip/:jobId.pdf |

Design notes:

- server/services/pdf/index.ts exposes renderDocument(type, data) returning a Buffer, plus a shared layout kit (header with logo and company profile, meta grid, items table, totals block, page footer with numbering).
- Embed the Inter TTF faces in server/assets/fonts rather than relying on standard PDF fonts, so the em dash, middle dot and tabular numerals used across the UI render identically and no glyph is lost.
- Document numbers come from document_sequences, never from the browser.
- Responses set Content-Disposition attachment with the numbered filename; client/src/lib/pdf.ts downloads with the auth header and converts the response to a blob.
- Each generated file is mirrored into DOCUMENT_STORAGE_DIR so the messaging service can attach it to email and WhatsApp using a URL.
- The same renderer is used by the PDF button, the emailed copy and the WhatsApp document message, so all three are byte-identical for a given document.

## 13. Notifications, appreciation and feedback design

### 13.1 Event to message pipeline

1. A domain event is emitted by a route handler (job.assigned, job.started, job.completed, payment.recorded, laundry.ready, laundry.collected, ping.recorded, message.inbound, feedback.received).
2. The dispatcher resolves the event into a template plus an audience (customer, technician, manager, salesperson) using rules stored in the settings table.
3. A notifications row is created with status queued, a dedupe key of (template_key, channel, entity_type, entity_id) and an optional scheduled_for time.
4. The channel adapter sends: whatsapp-cloud (template and document), sms (africastalking), email (SMTP with the PDF attached) or inapp (pushed over SSE).
5. Delivery status webhooks update the row to sent, delivered, read or failed, with attempts and last error recorded; failed rows are eligible for scheduled retry.

### 13.2 Channel rules that must be respected

| Rule | Consequence |
| --- | --- |
| Business-initiated WhatsApp messages require an approved template | The completion and appreciation messages must exist as approved templates before Phase 3 can send them |
| Free-form text is allowed only inside the 24 hour window after the customer last wrote | Replies and follow-up questions are free-form; everything else uses templates |
| Opt-in is required and opt-out must be honoured immediately | customers table gains opt_in flags; an opt-out reply suppresses further messaging and records the reason |
| SMS is the fallback for customers without WhatsApp, or after a failed delivery | Same payload, shortened body, link to the PDF and the feedback form |
| Dedupe prevents double sends | Partial unique index on the dedupe key, ignoring failed rows so retries remain possible |
| Every send is auditable | notifications retains payload, provider reference, status history and who or what triggered it |

### 13.3 The completion message (requirements 9 and 10)

One payload builder produces all channels. The message contains: order or job number, service performed, branch, technician or team names, the dates (scheduled, started, completed), item or work description, subtotal, total cost, amount paid, outstanding balance, a PDF attachment, and a feedback link. The same builder feeds the WhatsApp template variables, the SMS short form, the email body with attachment and the PDF itself, so wording and figures can never drift between channels.

### 13.4 Appreciation and feedback

- A scheduled appreciation message is sent 24 hours after completion (configurable), thanking the customer, including the job or order reference, and inviting a rating.
- The feedback link is a single-use, expiring token (feedback_requests) that opens the public page /feedback/:token with a 1 to 5 star rating and an optional comment; no login is required and the page is rate limited.
- WhatsApp replies containing a bare number (1 to 5) are ingested by the webhook and recorded as feedback, so customers who never tap the link still count.
- Feedback rows are linked to the job, the laundry order and the assigned employee ids, which makes rating-by-technician reporting possible.
- Manager dashboard widgets: average rating, rating trend over time, ratings by technician, ratings by service, comments needing follow-up, and percentage of completed jobs reviewed.
- Feedback and CSAT are exportable as CSV and PDF.

## 14. GPS and field operations design

### 14.1 Devices are the company numbers

The requirement is to track the company numbers assigned to employees. That is modelled as devices, one row per issued number or handset:

- devices.msisdn is the number, label is a human name (for example Field Phone 3), employee_id is the current holder and active controls whether it is tracked.
- Reassignment updates employee_id, while historical pings keep the employee_id resolved at ping time, so a trail always shows who actually carried the device.
- devices can later represent hardware trackers instead of phones without any change to the rest of the system.

### 14.2 The beacon (company phone already in the field)

- A /field route in the same React app, installable, with a shift toggle (start shift, end shift) and a visible tracking indicator.
- Uses navigator.geolocation.watchPosition with high accuracy, samples every GPS_PING_INTERVAL_SECONDS (default 45) and batches to POST /api/telemetry/pings.
- Offline behaviour matters in Uganda: pings are queued in IndexedDB and flushed when connectivity returns, with recorded_at preserved so the trail stays accurate.
- Battery care: sampling pauses when the device is stationary and resumes on movement; the queue is capped; the user sees what is being sent.
- Consent: first run shows a clear permission and privacy notice; tracking runs only during a shift; the employee can see their own trail.

### 14.3 Ingest and processing

- Validation and device authentication on ingest; per-device rate limiting; discard pings with accuracy worse than a configured threshold unless nothing better arrives.
- Geofence evaluation on arrival (site arrival, site departure, extended downtime alerts) and linkage of pings to an active job where one is assigned.
- Nightly rollup into location_daily_rollups (first, last, distance, max speed, point count, simplified trail) and deletion of raw pings older than GPS_RETENTION_DAYS (default 90).
- Access is restricted to owner and manager roles, and viewing a trail is itself audited, because location data is sensitive to staff.

### 14.4 The map and its reports

- /map shows current positions per active device on Leaflet with OpenStreetMap tiles, each marker labelled with the holder, the number, the last ping time and the current job.
- Clicking a device opens a day trail, distance travelled, first and last fix, and jobs visited; the same view answers where a number is right now, which is the literal requirement.
- Geofences can be drawn around branch sites and customer sites; entering or leaving raises an alert through the notification pipeline.
- Trip and GPS reports export as PDF (route, distance, times, stops against job sites) and CSV for payroll or client billing questions.

---

## 15. Money: payments, ledger, expenses, assets and costing

### 15.1 Payments and payment methods

Seeded methods: Cash, MTN MoMo, Airtel Money, Bank transfer, Cheque, Card. Each method maps to a cash or bank account in the chart of accounts, which is what makes payment-method reporting meaningful.

Recording a payment happens in one transaction:

1. Insert the payments row (direction, method, amount, reference, links to invoice, job or laundry order, received_at, recorded_by), numbered PAY-##### from document_sequences.
2. Post a balanced journal entry (for a receipt: debit the cash or mobile money account, credit accounts receivable or income).
3. Recompute the invoice paid amount and status, and the laundry order balance.
4. Recompute the customer balance from payments rather than storing an unmaintained number.
5. Accrue commission when the job carries a salesperson.
6. Emit payment.recorded, generate the receipt PDF and send it if the customer wants a copy.

Partial payments, overpayments and credit balances are all representable. An idempotency key header prevents a double-submitted receipt from posting twice. When the gateway arrives in Phase 7 it uses the same table with gateway_ref, plus a reconciliation matcher keyed on reference and amount.

### 15.2 Chart of accounts and journal

| Range | Accounts |
| --- | --- |
| 1000-1399 | Cash on hand, Bank, MTN MoMo, Airtel Money, Accounts receivable, Inventory, Work in progress |
| 1400-1999 | Equipment at cost, Accumulated depreciation, other fixed assets |
| 2000-2999 | Accounts payable, VAT payable, accrued expenses |
| 3000-3999 | Owner equity, Retained earnings, drawings |
| 4000-4999 | Service revenue, split per business division |
| 5000-5999 | Direct costs: materials, direct labour, transport, subcontract |
| 6000-6999 | Operating expenses: payroll, rent, utilities, fuel, repairs, marketing, depreciation |

Rules: every entry balances (enforced in the ledger service before commit); source identifies the origin of the posting; entries are never edited, only reversed through reversed_by plus a reversing entry, so financial history is immutable and auditable. The cash-versus-accrual setting determines whether revenue is recognised on invoice or on receipt.

Derived reports: profit and loss over a range, balance sheet at a date, cash flow across cash and mobile money accounts, and AR aging in 0-30, 31-60, 61-90 and 90+ buckets.

### 15.3 Expenses

Expenses gain supplier, tax amount, attachment, division, branch, approver and a link to the payment that settled them. Category selection maps to an expense account, so the P&L is produced from postings rather than from a category string. Recurring expenses (rent, utilities, subscriptions) are generated by the scheduler. Recording an expense payment creates a payments row with direction out, so expenses and cash movements reconcile in one place.

### 15.4 Assets and depreciation

The equipment table becomes a real asset register: purchase date, cost, salvage value, useful life in months, depreciation method (straight line by default), accumulated depreciation, custodian employee, condition, service schedule and disposal details. A schedule generator produces monthly postings (debit depreciation expense, credit accumulated depreciation) and updates book value, so the hand-typed book value and the hand-entered accumulated depreciation figure in the current equipment screen both disappear. Disposal posts the gain or loss. Outputs: asset register PDF, depreciation schedule PDF and CSV, plus an insurance schedule.

### 15.5 Costing

| Source | Mechanism |
| --- | --- |
| Direct labour | timesheets (minutes) multiplied by employees.hourly_rate |
| Materials | inventory issues valued at weighted cost, linked to the job |
| Subcontract and supplier work | supplier bill or purchase order line allocated to the job |
| Fuel and transport | driver or vehicle log entry allocated to the job or trip |
| Equipment | machine usage multiplied by a per-machine rate |

jobs.cost stops being a stored guess and becomes a derived figure recomputed from job_costs on every write, replacing the hardcoded 36 percent of revenue used by the job form today. Reporting then includes quoted versus actual variance per job, cost by division, margin by service, and an alert for work completed but never invoiced. Work in progress is visible before invoicing, which is what makes the profit and loss statement trustworthy in a mostly cash business.

## 16. Sales persons and the managers dashboard

- Sales staff are employees with role sales; jobs gain salesperson_id and manager_id so every job has an owner on the commercial side as well as a technician on the delivery side.
- Pipeline: quoted work (status Quoted) with value, expected close date and probability; converting a quote to a job records the win, and lost quotes record a reason, which gives a real conversion rate.
- Commissions: rate per employee or per service, base either revenue or gross profit, accrued when the payment is received, with a per-period statement and a PDF.
- Manager dashboard entries: jobs entered per salesperson, value, conversion rate, average deal size, new versus repeat customers, target versus achieved, technician utilisation, jobs at risk of breaching promised dates, today dispatch, receivables aging and customer satisfaction.
- Role scoping: sales sees their own pipeline and customers; technician sees their assignments and the field beacon; laundry sees the laundry queue; accountant sees money and the journal; manager and owner see everything. This is only possible because Phase 0 introduces identity and roles.

## 17. Compatibility strategy

| Change | Risk | Mitigation |
| --- | --- | --- |
| Splitting App.tsx | Behaviour drift while refactoring | Migrate screen by screen with the existing CSS untouched, and compare each screen before and after |
| New scoped endpoints | Breaking existing screens | Keep GET /api/data until the last screen has migrated |
| Replacing text[] assignees | Historical assignment data lost | Dual-write to jobs.assignees and job_assignments until the UI reads only the join table, then drop the column in a later migration |
| jobs.cost becomes derived | Reports changing suddenly | Recompute from job_costs but keep the column populated, and show a backfill report before switching the UI |
| customers.balance becomes derived | Numbers changing for existing rows | Recompute from payments in a migration and report the difference for review |
| Profile moved out of localStorage | Users losing branding and currency | One-time migration into the settings table, with localStorage read as a fallback during the transition |
| Schema evolution | Old databases failing silently | Additive migrations only; no destructive change ships without a tested backfill script |
| New document numbering | Collisions with existing numbers | Sequences initialise above the highest existing number in each table |
| External providers | A provider outage blocking work | Provider failures never block the business action: the notification is queued and retried, and toggles in settings can disable a channel entirely |
| Time zone change | Dates shifting for existing records | Existing date columns are DATE already; only timestamp columns are affected and they are interpreted in Africa/Kampala going forward |

---

## 18. Delivery plan

### 18.1 Phase overview

| Phase | Goal | Key deliverables | Exit criteria |
| --- | --- | --- | --- |
| 0. Foundations | Make change safe | Migration runner, identity and roles, server route split, zod validation, document numbering, Africa/Kampala dates, client split, scoped endpoints, SSE, CI | Existing behaviour unchanged, schema evolvable, two browsers stay in sync, CI green |
| 1. Data spine | Make money and dates truthful | payments, payment_methods, chart_of_accounts, journal entries and lines, cost_categories, job_costs, timesheets, job_events and date columns, laundry items and branch, asset register with depreciation, backfill | A recorded payment moves invoice status, customer balance, journal and cash flow together, and job cost comes from real cost lines |
| 2. PDF and documents | Make everything exportable | pdfkit service with layout kit and embedded fonts, 12 document types, authenticated download, storage mirroring for attachments | Every listed document downloads as a branded PDF and is identical when emailed or WhatsApp-attached |
| 3. Notifications, feedback, real-time | Close the loop with customers | WhatsApp and SMS adapters, templates, scheduler, persisted notifications, bell panel rewrite, completion payload, public feedback form, webhook ingestion, SSE wiring | Completing a job sends a message containing the order details and cost with the PDF and feedback link, and the rating appears on the manager dashboard |
| 4. Field operations | Know where the company numbers are | Employees, devices, job assignments, technician view, /field beacon, live map, geofences, trip reports | The owner sees each assigned company number on the map now, and can replay any day trail |
| 5. Sales and manager dashboard | Commercial visibility | Salesperson attribution, pipeline, commissions, role-scoped dashboards, targets | A salesperson job appears on the manager dashboard with commission accrual and conversion rate |
| 6. Real-time upgrade | Conversation and live dispatch | Socket.IO chat, Inbox with WhatsApp threads, presence, live map streaming | Manager and technician converse in-app and the customer thread sits in the same Inbox |
| 7. Depth | Automate collection and reporting | Payment gateway with reconciliation webhooks, scheduled email reports, dunning, external accounting export if required | A gateway payment reconciles to its invoice with no manual entry |

### 18.2 Phase 0 in file-level detail

| Step | Work | Files | Acceptance |
| --- | --- | --- | --- |
| 0.1 | Freeze the baseline: commit current work in progress, delete the stale scratch file, remove the circular self-dependency, add an environment example | client/package.json, server/package.json, server/.env.example, delete scripts/reports-block.txt, move Gabfix adds.txt to docs/requirements.md | npm run setup and npm run typecheck are clean and the app still boots |
| 0.2 | Migration runner with baseline and reconciliation of the existing schema | server/migrations/001_baseline.sql, server/migrate.ts, bootstrap-db.ts, init-db.ts | A fresh database creates, migrates and seeds; an existing database is marked as migrated and skipped; re-running changes nothing |
| 0.3 | Audit columns and updated_at trigger on all existing tables | server/migrations/002_audit_columns.sql | GET /api/data returns the same shape and inserts populate created_at |
| 0.4 | Identity tables and seed the owner | 003_identity.sql, seed-data.ts | Owner employee exists and maps to the current hardcoded user chip |
| 0.5 | Auth plumbing: login, refresh, me, requireAuth, requireRole | routes/auth.ts, middleware/auth.ts | Protected routes return 401 without a token and the correct role with one |
| 0.6 | Split the 13 handlers out of the monolith into routes and repositories | server/index.ts shrinks, server/routes/*, server/repositories/* | Every existing UI action still works and index.ts is under 80 lines |
| 0.7 | Replace the generic column map with per-route zod schemas and explicit columns | server/validation/*, routes/* | Unknown fields return 422 instead of being silently dropped; the stock movement note is either stored or rejected |
| 0.8 | Server-side document numbering | migrations, services/numbering.ts, JobForm | Ten concurrent job creates produce ten unique numbers |
| 0.9 | Africa/Kampala date handling on client and server | client/src/lib/dates.ts, server/lib/dates.ts | A record created at 01:00 local time gets today local date, and maintenance-due flags match the local calendar day |
| 0.10 | Client split into app, features, components and lib, with router and query cache | client/src/App.tsx reduced, plus about 20 new files | The rendered UI is identical, deep links work, App.tsx is under 150 lines, build lint and typecheck pass |
| 0.11 | Scoped and paginated endpoints plus the SSE event bus | routes/events.ts, services/realtime.ts, lib/realtime.ts | A job created in one browser appears in another without a manual refresh, and GET /api/data still works |
| 0.12 | Tests and continuous integration | server/test/*, client/src/lib/*.test.ts, .github/workflows/ci.yml | CI installs, typechecks, lints and runs unit tests green, covering numbering, ledger posting, depreciation and date helpers |

Definition of done for Phase 0: existing behaviour is provably unchanged; the schema can evolve; identity and roles exist; APIs are scoped, validated and numbered; two clients stay in sync; document numbering is server-side; local-time dates are correct; CI is enforced.

### 18.3 Sequencing and parallel work

- Phase 0 is strictly first, because every later phase writes new columns and new endpoints.
- Provider onboarding (Meta verification, WhatsApp number and template approval, SMS sender ID, mail domain) starts on day one and runs in parallel with Phases 0 to 2, so Phase 3 is not blocked when the code is ready.
- Hardware telematics, gateway onboarding and external accounting export are deliberately deferred to Phases 4 and 7, and each one is behind an interface that already exists in earlier phases.
- Each phase ships behind a feature flag in settings, so a half-finished capability can be enabled per branch or disabled instantly without a deploy.

## 19. Acceptance criteria and UAT checklist

Phase 0: log in and see the correct role; a protected route rejects an unauthenticated request; /jobs deep-links; the same edit appears in a second browser without refresh; every existing screen behaves as before; npm run typecheck, npm run lint and npm test pass.

Phase 1: record a part payment of UGX 500,000 by MoMo against INV-00098 and see the invoice status, customer balance, journal entry, cash flow and commission all move together; build a job cost from a timesheet plus a material issue and see jobs.cost update without manual entry; generate a depreciation schedule and see accumulated depreciation and book value change consistently; every existing seeded record survives migration with a reported diff of recomputed balances.

Phase 2: download an invoice, a receipt, a job card, a laundry ticket, a customer statement, a P and L, an asset register and an AR aging report as branded PDFs; confirm the emailed copy and the WhatsApp-attached copy are byte-identical to the download; confirm document numbers are sequential and never reused.

Phase 3: complete a job and confirm the customer receives a WhatsApp message naming the job number, service, branch, technician, dates, items, total, amount paid and balance, with the PDF and a feedback link; submit a rating through the public form and through a numeric WhatsApp reply and see both on the manager dashboard; simulate a provider failure and confirm the notification is queued, retried, and finally marked with attempts and a last error; confirm an opt-out stops further messages.

Phase 4: assign a job to a technician who then sees only their own work; open the map and see the current position of each assigned company number with the holder name and last fix time; replay a day trail and see distance and job stops; confirm pings older than the retention window are gone and that viewing a trail is audited; confirm the beacon queues pings offline and flushes them on reconnect.

Phase 5: create a job as a salesperson and see it on the manager dashboard with value, stage and commission accrual; confirm a salesperson cannot see another pipeline; confirm the technician and laundry roles see only their own areas.

Phase 6: hold a manager-to-technician conversation in the Inbox and see the customer WhatsApp thread in the same list; confirm map positions stream without a refresh.

Phase 7: initiate a gateway payment, complete it, and confirm the invoice reconciles automatically with the gateway reference recorded and no manual entry.

---

## 20. Overdue improvements already required

These are improvements that are already due, independent of the new features. Each one was confirmed against the current code. Items 1 to 12 are correctness or blocking issues and are addressed by Phase 0 and Phase 1; the rest are sequenced as noted.

### 20.1 Blocking or correctness defects

| # | Defect | Evidence and consequence | Fixed in |
| --- | --- | --- | --- |
| 1 | No migration mechanism | schema.sql is applied with CREATE TABLE IF NOT EXISTS, so a new column silently never reaches an existing database; every later phase is impossible until this is fixed | Phase 0.2 |
| 2 | No identity, users or roles | The sidebar user chip and the dashboard greeting are hardcoded to Gabriel N. / Owner account, so the managers dashboard, technician scoping and GPS privacy cannot be built | Phase 0.4 to 0.5 |
| 3 | Request fields are silently discarded | The generic TABLE_COLUMNS map ignores unknown keys; the note typed into the stock movement modal is never stored, and there is no error to reveal it | Phase 0.7 |
| 4 | No payment transactions at all | Invoices store only total, paid and status; there is no way to record a payment, a method or a reference, which is why the Settings Payment methods section is only a summary table | Phase 1 |
| 5 | Job cost is a hardcoded estimate | The job form sets cost to 36 percent of revenue, so every margin and profit figure in the app is currently invented | Phase 1 |
| 6 | Document numbering collides and is client-side | The job number is generated as JOB- followed by jobs.length + 143, which repeats after any deletion or concurrent create; invoices, payments and journal entries have no numbering at all | Phase 0.8 |
| 7 | UTC instead of local dates | today is derived from toISOString, so in Kampala (UTC+3) anything created before 03:00 local time is dated yesterday, and maintenance-due comparisons are anchored to UTC | Phase 0.9 |
| 8 | Customer balance is never maintained | customers.balance is displayed as authoritative but no code path updates it, and payment status is re-derived per job row in the browser, which is quadratic as the data grows | Phase 1 |
| 9 | Laundry orders have no branch | The branch is guessed from the customer first job, so orders for multi-branch customers are attributed to the wrong branch and the laundry branch filter is unreliable | Phase 1 |
| 10 | No stock movement history | Adjusting stock overwrites the quantity and drops the note; there is no ledger of who changed what | Phase 1 |
| 11 | Wrong modal opens for laundry | The New laundry order button opens the job creation modal, so a laundry order cannot be created correctly from that path | Phase 1 |
| 12 | No correction path | There is no PATCH or DELETE for customers, invoices, expenses, services or laundry orders, so mistakes can only be fixed by re-importing the whole workspace | Phases 0 and 1 |

### 20.2 Architecture and scale

| # | Issue | Evidence and consequence |
| --- | --- | --- |
| 13 | One whole-workspace endpoint | GET /api/data returns every record and the client holds it all in memory; adding telemetry, messages and journal lines on top of that will not scale, and there is no pagination or filtering anywhere |
| 14 | Front-end monolith | App.tsx is 665 lines and 102 KB with individual lines around 3000 characters, nine views in one file and no router, which blocks parallel feature work and deep linking |
| 15 | No audit trail | No table has created_at, updated_at, created_by or deleted_at, so there is no history of who changed what or when |
| 16 | No real-time synchronisation | Two staff on the same database see stale data until someone manually refreshes; this is the specific gap behind the requirement that notifications and communication be part of the workflow |
| 17 | Duplicated export helpers | exportCsv, toCsv and downloadCsv all exist and overlap, so export behaviour can drift between screens |
| 18 | Reporting is arithmetic, not accounting | Reports compute revenue and cost on the fly from jobs and expenses; there is no ledger, so a real P and L, balance sheet or cash flow cannot be produced |

### 20.3 Hygiene, security and delivery

| # | Issue | Evidence and consequence |
| --- | --- | --- |
| 19 | Circular self-dependency | Both client and server declare gabfix-erp as file:.., which installs the repository root inside both node_modules folders; the dependency should be removed from both manifests |
| 20 | No clean baseline | 460 lines across 7 files are uncommitted, including the 366 lines added to App.tsx, so a large refactor has nothing to be compared against |
| 21 | Environment file undocumented | server/.env is correctly gitignored (it is not committed), but there is no .env.example, so a new environment cannot be configured from the repository |
| 22 | No request hardening | cors() is unrestricted and there is no helmet, rate limiting or schema validation, which matters once public webhooks and feedback endpoints exist |
| 23 | Duplicated client logic and CSS | Two keydown listeners both handle Escape and Ctrl/Cmd+K, and .notif-panel, .notif-row and .filter-select are each defined more than once in index.css |
| 24 | Stale scratch file | scripts/reports-block.txt duplicates a version of ReportsView and can mislead future work |
| 25 | No tests and no CI | There is no test framework anywhere and no pipeline, so a refactor of this size has no safety net |
| 26 | Settings stored in the browser | The company profile, currency and accounting basis live in localStorage, which contradicts the README statement that nothing is stored in the browser, and means branding is not shared between staff nor included in backups |
| 27 | Design system not implemented | erp-design-system.md calls for a shared sortable, sticky-header DataTable and consistent status badges; tables are not sortable or paginated and there is no shared table component |
| 28 | Accessibility and interaction gaps | Modals lack role=dialog and focus trapping, tables are not keyboard navigable, and aria coverage is partial |

### 20.4 What is already good and worth preserving

The nine-table model is clean and normalised; the seed data is realistic and useful for demos; money formatting is centralised through a single money helper; CSV export works and is consistently placed; the API is parameterised against SQL injection; the README accurately documents the database-per-environment workflow with automatic bootstrap; and the existing green-and-neutral visual language plus the design guide give the new screens a consistent starting point.

## 21. Risks and open decisions

### 21.1 Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Meta Business verification takes weeks | Phase 3 cannot send WhatsApp messages | Start onboarding on day one, build the SMS path independently, and gate the channel behind a setting |
| Template rejected for the wrong category | Completion messages blocked | Submit order-update wording in the utility category, keep SMS as the fallback, and keep template text editable in the database |
| The chosen WhatsApp number is already registered to WhatsApp | Onboarding stalls | Use a fresh SIM for the business number; removing an existing number from the app is required first and is irreversible for personal use |
| GPS accuracy, battery drain or staff objection | Adoption failure | Shift-only tracking with a visible indicator, offline queueing, accuracy thresholds and a documented retention window, plus audit of who views trails |
| Legacy data quality (36 percent costs, unmaintained balances) | Wrong figures after Phase 1 | Backfill with a reported difference for review, and keep the old values visible until the ledger is accepted |
| Refactor regression in a 102 KB file | Lost functionality | Screen-by-screen migration, no CSS changes during the split, and CI enforced from Phase 0.12 |
| Eight phases of scope creep | Delivery stalls | Phase gates with the exit criteria in section 18.1, and feature flags so partial work can ship dark |
| Intermittent field connectivity | Missing location history | IndexedDB ping queue with recorded_at preserved and batch flush on reconnect |
| Public endpoints abused | Spam or forged webhooks | Rate limiting, signature verification for webhooks, short-lived single-use feedback tokens |

### 21.2 Open decisions with recommended defaults

| Decision | Options | Recommendation |
| --- | --- | --- |
| Which number set is the company numbers | Fresh SIMs, existing business lines, or the office landline | Fresh SIMs for field phones; keep the office line for customer-facing chat |
| Hosting and HTTPS | Local-only PostgreSQL or hosted with a certificate | Stay local for Phases 0 to 2 with a tunnel for webhooks, then host before Phase 3 goes live |
| GPS consent model | Always-on tracking or shift-only | Shift-only with a visible indicator, 90 day retention and audited trail views |
| Ledger depth | Full double-entry or a payments-only ledger | Double-entry, because a balance sheet, cash flow and reliable P and L depend on it |
| Is the current database live or demo | Live records or disposable seed | Confirm before Phase 1: live means a backfill with a reported diff, demo means reseed |
| SMS budget | WhatsApp-only or WhatsApp plus SMS | SMS for completion messages only, so fallback coverage does not become a recurring cost surprise |
| Language and wording | English only or English plus Luganda | Start English, keep template text in the database so Luganda can be added without a deploy |

---

## 22. Effort estimates

| Phase | Scope | Estimate (dev-days) |
| --- | --- | --- |
| 0. Foundations | Baseline, migrations, identity and roles, route split, validation, numbering, local dates, client split, scoped endpoints and SSE, tests and CI | 6 to 9 |
| 1. Data spine | Payments, methods, chart of accounts, journal, job costs, timesheets, job events and dates, laundry items and branch, assets and depreciation, backfill | 8 to 12 |
| 2. PDF and documents | pdfkit service, layout kit, 12 document types, download and attachment plumbing | 5 to 7 |
| 3. Notifications, feedback, real-time | Adapters, templates, scheduler, notification persistence, bell rewrite, completion payload, public feedback, webhook ingestion, SSE wiring | 8 to 12 |
| 4. Field operations | Employees, devices, assignments, technician view, beacon PWA, live map, geofences, trip reports | 8 to 12 |
| 5. Sales and manager dashboard | Attribution, pipeline, commissions, role-scoped dashboards | 6 to 9 |
| 6. Real-time upgrade | Socket.IO chat, Inbox, presence, live streaming | 5 to 8 |
| 7. Depth | Gateway and reconciliation, scheduled reports, dunning | 5 to 10 |
| Total | | 51 to 79 |

Assumptions: one experienced developer who is familiar with this codebase; estimates exclude provider waiting time (Meta verification and template approval), hardware procurement, branding or design work, staff training and bulk data entry; the range reflects the difference between clean demo data and backfilling a live database with legacy cost figures. The single biggest schedule risk is not code volume but Meta verification, which is why it is an immediate parallel task.

---

## Appendix A. Dependency additions

| Package | Where | Version | Purpose |
| --- | --- | --- | --- |
| pdfkit | server (prod) | ^0.20.2 | PDF generation. Requires Node >= 20; the installed Node v22.22.1 satisfies this. Pure-JS dependency tree, so no native build step |
| @types/pdfkit | server (dev) | ^0.17.6 | pdfkit ships no bundled types |
| jsonwebtoken and @types/jsonwebtoken | server | current | Access and refresh tokens |
| bcryptjs | server | current | Pure-JS password hashing, avoiding native build friction on Windows |
| zod | server and client | current | Shared request and form validation schemas |
| node-cron | server | current | Scheduled reminders, appreciation messages, depreciation, rollups |
| pino and pino-http | server | current | Structured logging with request correlation |
| helmet and express-rate-limit | server | current | Request hardening ahead of the public endpoints |
| multer | server | current | Media upload (WhatsApp documents by id, job photos, signed notes) |
| socket.io | server | current | Phase 6 two-way chat and live streaming |
| react-router-dom | client | ^6 | Routing and deep links, replacing the view string in state |
| @tanstack/react-query | client | ^5 | Server state cache, mutations and surgical invalidation over SSE |
| react-leaflet | client | ^4.2.1 | React 18 line; v5 requires React 19, so v4 is required here |
| leaflet and @types/leaflet | client | ^1.9.4 and latest | Map engine and types; the Leaflet stylesheet must be imported |
| socket.io-client | client | current | Phase 6 only; SSE needs no new dependency |
| vitest, supertest, @types/supertest | dev / CI | current | Unit tests for pure logic and API tests against a throwaway database |
| bullmq and ioredis | server | later | Durable queues with retries when notification volume justifies it |

Removals: the gabfix-erp file:.. dependency must be deleted from both client/package.json and server/package.json, because it installs the repository root inside both node_modules folders.

## Appendix B. Environment template

server/.env.example should contain, grouped: database (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE), server (PORT, APP_BASE_URL, TZ set to Africa/Kampala), auth (JWT_SECRET, JWT_TTL), documents (DOCUMENT_STORAGE_DIR), WhatsApp (WHATSAPP_GRAPH_VERSION, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, WHATSAPP_TEMPLATE_JOB_DONE, WHATSAPP_TEMPLATE_APPRECIATION), SMS (AT_USERNAME, AT_API_KEY, AT_SENDER_ID), email (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM), and GPS (GPS_PING_INTERVAL_SECONDS, GPS_RETENTION_DAYS). Only the database, server, auth and time zone groups are required for Phase 0; every provider group is validated lazily so the application boots with them absent and reports the channel as disabled.

## Appendix C. Migration inventory

| File | Contents |
| --- | --- |
| 001_baseline.sql | The current schema, frozen as the starting point for every environment |
| 002_audit_columns.sql | created_at, updated_at, created_by, deleted_at and the touch trigger on all existing tables |
| 003_identity.sql | employees, devices, roles, and the seeded owner |
| 004_jobs_dates_assignments.sql | New job date columns, salesperson and manager, site address and coordinates, job_events, job_assignments |
| 005_money.sql | payment_methods, payments, chart_of_accounts and seed accounts, journal_entries, journal_lines, invoice_items |
| 006_costing.sql | cost_categories, job_costs, timesheets, suppliers |
| 007_assets.sql | Asset columns on equipment and asset_depreciation_entries |
| 008_logistics.sql | Laundry branch, promised, ready, collected and job link columns, plus laundry_order_items |
| 009_engagement.sql | message_templates, notifications with the partial dedupe index, feedback_requests, feedback, conversations, messages, settings |
| 010_telemetry.sql | location_pings, location_daily_rollups, geofences |
| 011_numbering.sql | document_sequences initialised above the highest existing number per prefix |

Rule: NNN_snake_case.sql, one concern per file, additive only, and safe to re-run where practical.

## Appendix D. Enumeration values

| Domain | Values |
| --- | --- |
| Employee roles | owner, manager, sales, technician, laundry, accountant |
| Job status | Quoted, Scheduled, In Progress, Completed (Cancelled added with the pipeline work) |
| Job date fields | quote_date, scheduled_date, started_at, completed_at, invoiced_at, paid_at, promised_at |
| Laundry status | Received, Washing, Drying, Ready, Collected (Cancelled added with intake) |
| Laundry date fields | received, promised_at, ready_at, collected_at |
| Invoice status | Draft, Unpaid, Partially Paid, Paid, Overdue, Void |
| Payment direction | in, out |
| Payment method kinds | cash, momo, bank, card, cheque, other |
| Payment status | pending, confirmed, reconciled, voided |
| Account types | asset, liability, equity, income, expense |
| Cost category kinds | direct, indirect |
| Notification channels | whatsapp, sms, email, inapp |
| Notification status | queued, sent, delivered, read, failed, skipped |
| Feedback sources | web, whatsapp, sms |
| Device types | phone, tracker |
| Geofence kinds | site, branch |
| Customer types | Residential, Business, Corporate Client, Property Manager, Institution, Walk-in Customer (existing values retained) |

## Appendix E. Document change log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-09-24 | Initial comprehensive plan produced from a full read of the repository at commit 368586d plus the uncommitted working tree, and from the requirements in Gabfix adds.txt. Hybrid integration posture locked (WhatsApp Cloud API, manual payments with a double-entry ledger, driver-PWA GPS on Leaflet, server-side pdfkit documents). Two findings corrected an earlier draft assumption: server/.env is not committed (it is gitignored), and both child packages carry a circular gabfix-erp file:.. dependency. Effort estimated at 51 to 79 dev-days across eight phases with Phase 0 as the mandatory foundation. |
